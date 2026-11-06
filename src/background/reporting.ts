import type { NotifyResult } from '@birchill/bugsnag-zero';

import type { PreparedReport } from '../common/prepared-report';
import type { ReportBatch, ReportBatchReply } from '../common/report-batch';
import { ReportingConsent } from '../common/reporting-consent';
import { ReportingPolicy } from '../common/reporting-policy';
import { rejectWhenAborted } from '../utils/reject-when-aborted';

import {
  MAX_QUEUE_BYTES,
  MAX_RECORD_BYTES,
  MAX_REPORTS,
  ReportQueue,
  reportBytes,
} from './report-queue';

type PendingCapture = {
  report: PreparedReport;
  bytes: number;
  resolve: (result: NotifyResult) => void;
};

export class ReportingService {
  readonly consent = new ReportingConsent();
  readonly policy = new ReportingPolicy();
  readonly queue = new ReportQueue(this.policy);
  readonly ready: Promise<void>;
  #starting = true;
  #pending: Array<PendingCapture> = [];
  #batch?: ReportBatch;
  #batchIds: Array<string> = [];
  #batchRevision = -1;

  constructor() {
    this.ready = Promise.all([
      this.consent.ready,
      this.policy.ready,
      this.queue.ready,
    ]).then(async () => {
      if (
        this.policy.state.status === 'ready' &&
        this.policy.state.disableLocalErrorStorage
      ) {
        await this.queue.deleteAll();
      }

      this.#starting = false;
      const pending = this.#pending.splice(0);
      for (const entry of pending) {
        void this.#captureReady(entry.report).then(entry.resolve);
      }
    });
  }

  capture(report: PreparedReport): Promise<NotifyResult> {
    let serialized: string;
    try {
      serialized = JSON.stringify(report);
      report = JSON.parse(serialized) as PreparedReport;
    } catch {
      return Promise.resolve({
        status: 'failed',
        error: new Error('Invalid prepared diagnostic report'),
      });
    }

    if (!this.#starting) {
      return this.#captureReady(report);
    }

    const bytes = reportBytes(report);
    if (bytes > MAX_RECORD_BYTES) {
      return Promise.resolve({
        status: 'skipped',
        reason: 'startup-report-too-large',
      });
    }

    return new Promise((resolve) => {
      this.#pending.push({ report, bytes, resolve });
      while (
        this.#pending.length > MAX_REPORTS ||
        this.#pending.reduce((sum, entry) => sum + entry.bytes, 0) >
          MAX_QUEUE_BYTES
      ) {
        this.#pending
          .shift()!
          .resolve({ status: 'skipped', reason: 'startup-buffer-full' });
      }
    });
  }

  async #captureReady(report: PreparedReport): Promise<NotifyResult> {
    const result = await this.sendPrepared(report);
    if (result.status === 'sent') {
      return result;
    }

    const saved = await this.queue.store(
      report,
      result.status === 'failed'
        ? {
            state: 'failed',
            attempts: 1,
            lastAttemptAt: new Date().toISOString(),
            outcome: 'failed',
            statusCode: result.statusCode,
          }
        : { state: 'ready', attempts: 0 }
    );
    return saved.status === 'skipped' ? result : saved;
  }

  async readState() {
    await this.ready;
    const queue = await this.queue.readState();
    return {
      consent: this.consent.state,
      restrictions: this.policy.state,
      batch: this.#batch ? this.#batchSnapshot() : undefined,
      ...queue,
    };
  }

  async sendOnce(
    selectedIds: Array<string>,
    expectedRevision: number
  ): Promise<ReportBatchReply> {
    // Reserve the installation-wide batch before any asynchronous work. Repeat
    // commands return its progress instead of starting overlapping requests.
    if (
      this.#batch &&
      (this.#batch.status === 'sending' ||
        (this.#batchRevision === expectedRevision &&
          JSON.stringify(this.#batchIds) ===
            JSON.stringify([...new Set(selectedIds)])))
    ) {
      return { status: 'ok', batch: this.#batchSnapshot() };
    }

    this.#batchIds = [...new Set(selectedIds)];
    this.#batchRevision = expectedRevision;
    this.#newAttempt(this.#batchIds.length);
    await this.ready;
    // Failed or skipped reports stay saved and frozen for explicit retries.
    // This new selection replaces that batch, so release its surviving reports
    // for deduplication. freeze() then rejects the new selection if the queue's
    // revision has changed since the caller read expectedRevision.
    await this.queue.release();
    if (!(await this.queue.freeze(this.#batchIds, expectedRevision))) {
      this.#batch = undefined;
      return { status: 'stale-state' };
    }

    return this.#sendBatch(this.#batchIds);
  }

  async retryBatch(id: string): Promise<ReportBatchReply> {
    if (this.#batch?.id !== id) {
      return { status: 'batch-unavailable' };
    }

    if (this.#batch.status === 'sending') {
      return { status: 'ok', batch: this.#batchSnapshot() };
    }

    const remaining = this.#batch.results
      .filter((result) => result.status !== 'sent')
      .map((result) => result.id);
    // Keep the same batch ID and frozen selection across explicit retries.
    this.#newAttempt(remaining.length, id);
    const saved = new Set(
      (await this.queue.readState()).records.map((r) => r.id)
    );
    const eligible = remaining.filter((id) => saved.has(id));
    this.#batch!.totalSelected = eligible.length;
    return this.#sendBatch(eligible);
  }

  #newAttempt(
    totalSelected: number,
    // Do not reuse batch IDs after restart: an old options page must not gain
    // authorization to retry a different batch created by the new background.
    id = Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-')
  ) {
    this.#batch = {
      id,
      status: 'sending',
      totalSelected,
      sent: 0,
      failed: 0,
      skipped: 0,
      results: [],
    };
  }

  #batchSnapshot(): ReportBatch {
    return {
      ...this.#batch!,
      results: this.#batch!.results.map((r) => ({ ...r })),
    };
  }

  async #sendBatch(ids: Array<string>): Promise<ReportBatchReply> {
    const batch = this.#batch!;
    for (const id of ids) {
      const result = await this.queue.send(id, (report) =>
        this.sendPrepared(report, { manual: true })
      );
      const status = result.status === 'stored' ? 'failed' : result.status;
      batch[status]++;
      batch.results.push({
        id,
        status,
        ...(result.status === 'skipped' ? { reason: result.reason } : {}),
        ...(result.status === 'failed'
          ? { reason: result.error.message, statusCode: result.statusCode }
          : {}),
      });
    }

    batch.status = 'complete';
    return { status: 'ok', batch: this.#batchSnapshot() };
  }

  // Replay this exact snapshot, never notify() again. Only background's manual
  // batch coordinator may supply manual=true after explicit user authorization.
  async sendPrepared(
    report: PreparedReport,
    { manual = false } = {}
  ): Promise<NotifyResult> {
    const policy = this.policy.state;
    if (policy.disableErrorReporting) {
      return {
        status: 'skipped',
        reason: `policy-${policy.status === 'ready' ? 'disabled' : policy.status}`,
      };
    }

    if (!manual && !this.consent.state.enabled) {
      return { status: 'skipped', reason: 'consent-required' };
    }

    // There are no awaited operations between authorization and fetch(). Both
    // destinations use the same timeout and truthful HTTP/network outcomes.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (report.destination === 'bugsnag') {
        headers['Bugsnag-Api-Key'] = report.payload.apiKey;
        headers['Bugsnag-Payload-Version'] = report.payload.payloadVersion;
        headers['Bugsnag-Sent-At'] = new Date().toISOString();
      }
      const response = await rejectWhenAborted(
        fetch(
          report.destination === 'bugsnag'
            ? 'https://notify.bugsnag.com/'
            : 'https://data.10ten.life/report',
          {
            method: 'POST',
            headers,
            body: JSON.stringify(report.payload),
            signal: controller.signal,
          }
        ),
        controller.signal
      );
      return response.ok
        ? { status: 'sent' }
        : {
            status: 'failed',
            error: new Error('Diagnostic report rejected'),
            statusCode: response.status,
          };
    } catch (error) {
      return {
        status: 'failed',
        error: controller.signal.aborted
          ? new Error('Diagnostic request timed out')
          : error instanceof Error
            ? error
            : new Error('Diagnostic request failed'),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
