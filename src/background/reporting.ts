import type { NotifyResult } from '@birchill/bugsnag-zero';

import type { PreparedReport } from '../common/prepared-report';
import { ReportingConsent } from '../common/reporting-consent';
import { ReportingPolicy } from '../common/reporting-policy';
import { rejectWhenAborted } from '../utils/reject-when-aborted';

type PendingCapture = {
  report: PreparedReport;
  bytes: number;
  resolve: (result: NotifyResult) => void;
};

// Background owns capture and transmission. The saved-report queue will attach
// here; until it does, a blocked capture is skipped rather than claimed stored.
export class ReportingService {
  readonly consent = new ReportingConsent();
  readonly policy = new ReportingPolicy();
  readonly ready: Promise<void>;
  #starting = true;
  #pending: Array<PendingCapture> = [];

  constructor() {
    this.ready = Promise.all([this.consent.ready, this.policy.ready]).then(
      () => {
        this.#starting = false;
        const pending = this.#pending.splice(0);
        for (const entry of pending) {
          void this.sendPrepared(entry.report).then(entry.resolve);
        }
      }
    );
  }

  capture(report: PreparedReport): Promise<NotifyResult> {
    if (!this.#starting) {
      return this.sendPrepared(report);
    }

    const bytes = new TextEncoder().encode(JSON.stringify(report)).byteLength;
    if (bytes > 128 * 1024) {
      return Promise.resolve({
        status: 'skipped',
        reason: 'startup-report-too-large',
      });
    }

    return new Promise((resolve) => {
      this.#pending.push({ report, bytes, resolve });
      while (
        this.#pending.length > 10 ||
        this.#pending.reduce((sum, entry) => sum + entry.bytes, 0) > 512 * 1024
      ) {
        this.#pending
          .shift()!
          .resolve({ status: 'skipped', reason: 'startup-buffer-full' });
      }
    });
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
