import type { NotifyResult } from '@birchill/bugsnag-zero';
import * as s from 'superstruct';
import browser from 'webextension-polyfill';

import { PreparedReportSchema } from '../common/prepared-report';
import type { PreparedReport } from '../common/prepared-report';
import type { ReportingPolicy } from '../common/reporting-policy';

const REPORT_QUEUE_KEY = 'diagnosticReports';
export const MAX_REPORTS = 10;
export const MAX_RECORD_BYTES = 128 * 1024;
export const MAX_QUEUE_BYTES = 512 * 1024;

const timestamp = s.refine(
  s.string(),
  'timestamp',
  (v) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v) &&
    Number.isFinite(Date.parse(v))
);
const integer = s.refine(
  s.integer(),
  'nonnegative',
  (v) => v >= 0 && Number.isSafeInteger(v)
);
const EnvelopeSchema = s.type({
  schemaVersion: s.number(),
  revision: integer,
  records: s.array(s.unknown()),
});
const DeliverySchema = s.type({
  state: s.enums(['ready', 'sending', 'failed', 'interrupted', 'unsupported']),
  attempts: integer,
  lastAttemptAt: s.optional(timestamp),
  outcome: s.optional(s.string()),
  statusCode: s.optional(integer),
});
const RecordSchema = s.intersection([
  PreparedReportSchema,
  s.type({
    id: s.pattern(s.string(), /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i),
    context: s.type({ capturedAt: timestamp }),
    occurrences: s.type({
      count: s.refine(integer, 'positive', (v) => v > 0),
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
    }),
    dedupKey: s.pattern(s.string(), /^[\da-f]{64}$/),
    delivery: DeliverySchema,
  }),
]);
export type SavedReport = s.Infer<typeof RecordSchema>;
type Envelope = {
  schemaVersion: 1;
  revision: number;
  records: Array<SavedReport>;
};

// Only background constructs this coordinator. Disk replacements and dispatch
// decisions share a lock; requests themselves never hold it.
export class ReportQueue {
  #envelope: Envelope = { schemaVersion: 1, revision: 0, records: [] };
  #status: 'ready' | 'error' | 'unsupported' = 'ready';
  #tail: Promise<unknown> = Promise.resolve();
  #inFlight = new Map<string, symbol>();
  #frozen = new Set<string>();
  readonly ready: Promise<void>;

  constructor(private policy: ReportingPolicy) {
    this.ready = this.#load();
    policy.addChangeListener((state) => {
      if (state.status === 'ready' && state.disableLocalErrorStorage) {
        void this.deleteAll();
      }
    });
  }

  async #load() {
    try {
      const value = (await browser.storage.local.get(REPORT_QUEUE_KEY))[
        REPORT_QUEUE_KEY
      ];
      if (value !== undefined) {
        if (!s.is(value, EnvelopeSchema) || value.schemaVersion !== 1) {
          this.#status = 'unsupported';
          return;
        }

        this.#envelope.revision = value.revision;
        const seen = new Set<string>();
        for (const record of value.records) {
          if (
            !s.is(record, RecordSchema) ||
            reportBytes(record) > MAX_RECORD_BYTES ||
            seen.has(record.id)
          ) {
            continue;
          }

          const detached = detach(record);
          let canonical: string;
          try {
            canonical = identity(detached);
          } catch {
            continue;
          }

          // This is a derived lookup key, not an integrity check. Recompute it
          // with the current identity rules so changes do not discard saved
          // payloads or reset their IDs, context, and occurrence counts.
          detached.dedupKey = await hash(canonical);
          seen.add(record.id);
          if (detached.delivery.state === 'sending') {
            detached.delivery.state = 'interrupted';
          }

          this.#envelope.records.push(detached);
        }

        enforceQueueLimits(this.#envelope);

        await this.policy.ready;
        // Persist startup repairs: interrupted attempts, refreshed dedup keys,
        // and removal of corrupt or evicted records, once policy allows it.
        if (
          !this.policy.state.disableLocalErrorStorage &&
          JSON.stringify(value) !== JSON.stringify(this.#envelope)
        ) {
          await this.#write(detach(this.#envelope));
        }
      }
    } catch {
      this.#status = 'error';
    }
  }

  #serial<T>(operation: () => Promise<T> | T): Promise<T> {
    const result = this.#tail.then(() => this.ready).then(operation);
    this.#tail = result.catch(() => {});
    return result;
  }

  async #write(envelope: Envelope) {
    if (envelope.records.length && this.policy.state.disableLocalErrorStorage) {
      throw new Error('Diagnostic storage blocked by policy');
    }

    envelope.revision = this.#envelope.revision + 1;
    enforceQueueLimits(envelope);
    await browser.storage.local.set({ [REPORT_QUEUE_KEY]: envelope });
    this.#envelope = envelope;
    this.#status = 'ready';
  }

  readState() {
    return this.#serial(() => ({
      status: this.#status,
      revision: this.#envelope.revision,
      count: this.#envelope.records.length,
      records: this.#envelope.records.map(
        ({ payload: _payload, dedupKey: _key, ...summary }) => detach(summary)
      ),
    }));
  }

  readReport(id: string) {
    return this.#serial(() => {
      const record = this.#envelope.records.find((r) => r.id === id);
      return record ? detach(record) : undefined;
    });
  }

  store(
    report: PreparedReport,
    delivery: SavedReport['delivery'] = { state: 'ready', attempts: 0 }
  ): Promise<NotifyResult> {
    // Detach before waiting for the coordinator.
    const detached = detach(report);
    return this.#serial(async () => {
      if (this.policy.state.disableLocalErrorStorage) {
        return { status: 'skipped', reason: 'local-storage-disabled' };
      }

      if (this.#status !== 'ready') {
        return {
          status: 'failed',
          error: new Error('Diagnostic storage unavailable'),
        };
      }

      try {
        const canonical = identity(detached);
        const dedupKey = await hash(canonical);
        const envelope = detach(this.#envelope);
        const existing = envelope.records.find(
          (r) =>
            !this.#frozen.has(r.id) &&
            !this.#inFlight.has(r.id) &&
            r.dedupKey === dedupKey &&
            // Confirm equal content so a hash collision cannot merge reports.
            identity(r) === canonical
        );
        const now = detached.context.capturedAt;
        const record: SavedReport = {
          ...detached,
          id: recordId(),
          dedupKey,
          occurrences: { count: 1, firstSeenAt: now, lastSeenAt: now },
          delivery,
        };
        if (reportBytes(record) > MAX_RECORD_BYTES) {
          return {
            status: 'failed',
            error: new Error('Diagnostic report too large to save'),
          };
        }

        if (existing) {
          existing.occurrences.count++;
          if (Date.parse(now) > Date.parse(existing.occurrences.lastSeenAt)) {
            existing.occurrences.lastSeenAt = now;
          }
        } else {
          envelope.records.push(record);
        }

        // Policy can change while hashing. Never persist under unknown policy.
        if (this.policy.state.disableLocalErrorStorage) {
          return { status: 'skipped', reason: 'local-storage-disabled' };
        }

        await this.#write(envelope);
        return envelope.records.some(
          (r) => r.id === (existing?.id ?? record.id)
        )
          ? { status: 'stored' }
          : {
              status: 'failed',
              error: new Error('Diagnostic report exceeded queue bounds'),
            };
      } catch {
        return {
          status: 'failed',
          error: new Error('Could not save diagnostic report'),
        };
      }
    });
  }

  deleteReport(id: string) {
    return this.#serial(async () => {
      if (this.#status !== 'ready') {
        return false;
      }

      try {
        const envelope = detach(this.#envelope);
        envelope.records = envelope.records.filter((r) => r.id !== id);
        await this.#write(envelope);
        return true;
      } catch {
        return false;
      }
    });
  }

  deleteAll() {
    return this.#serial(async () => {
      try {
        await this.#write({
          schemaVersion: 1,
          revision: this.#envelope.revision,
          records: [],
        });
        return true;
      } catch {
        return false;
      }
    });
  }

  // TODO: Bind manual batch authorization to this revision and release it
  // only when the batch (including explicit retries) ends.
  freeze(ids: Array<string>, revision: number) {
    return this.#serial(() => {
      if (this.#status !== 'ready' || revision !== this.#envelope.revision) {
        return false;
      }

      for (const id of ids) {
        this.#frozen.add(id);
      }

      return true;
    });
  }

  release() {
    return this.#serial(() => this.#frozen.clear());
  }

  async send(
    id: string,
    transmit: (report: PreparedReport) => Promise<NotifyResult>
  ): Promise<NotifyResult> {
    const token = Symbol();
    const pending = await this.#serial(async () => {
      const record = this.#envelope.records.find((r) => r.id === id);
      if (
        !record ||
        this.#status !== 'ready' ||
        this.#inFlight.has(id) ||
        !this.#frozen.has(id)
      ) {
        return undefined;
      }

      if (
        this.policy.state.disableErrorReporting ||
        this.policy.state.disableLocalErrorStorage
      ) {
        return undefined;
      }

      const envelope = detach(this.#envelope);
      const updated = envelope.records.find((r) => r.id === id)!;
      updated.delivery = {
        state: 'sending',
        attempts: record.delivery.attempts + 1,
        lastAttemptAt: new Date().toISOString(),
      };
      try {
        await this.#write(envelope);
      } catch {
        return undefined;
      }

      if (
        this.policy.state.disableErrorReporting ||
        this.policy.state.disableLocalErrorStorage ||
        !this.#envelope.records.some((r) => r.id === id)
      ) {
        return undefined;
      }

      this.#inFlight.set(id, token);
      // Start the request inside the coordinator, but await it outside.
      return { result: transmit(detach(record)) };
    });
    if (!pending) {
      return { status: 'skipped', reason: 'report-unavailable' };
    }

    let result: NotifyResult;
    try {
      result = await pending.result;
    } catch (cause) {
      result = {
        status: 'failed',
        error: new Error('Diagnostic request failed', { cause }),
      };
    }
    await this.#serial(async () => {
      if (this.#inFlight.get(id) !== token) {
        return;
      }

      this.#inFlight.delete(id);
      if (!this.#envelope.records.some((r) => r.id === id)) {
        return;
      }

      const envelope = detach(this.#envelope);
      if (result.status === 'sent') {
        envelope.records = envelope.records.filter((r) => r.id !== id);
      } else {
        const record = envelope.records.find((r) => r.id === id)!;
        record.delivery.state = 'failed';
        record.delivery.outcome =
          result.status === 'skipped' ? result.reason : result.status;
        if (result.status === 'failed') {
          record.delivery.statusCode = result.statusCode;
        }
      }

      try {
        if (!this.policy.state.disableLocalErrorStorage) {
          await this.#write(envelope);
        }
      } catch {
        /* Keep the durable attempt marker if cleanup fails. */
      }
    });
    return result;
  }
}

export function reportBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

// Build a canonical diagnostic identity for deduplication. Preserve diagnostic
// content and array order, but ignore SDK timing fields so repeated occurrences
// can share a saved record without replacing its original payload.
function identity(report: PreparedReport): string {
  const payload = detach(report.payload);
  if (report.destination === 'bugsnag' && 'events' in payload) {
    for (const event of payload.events) {
      if (event.app) {
        delete event.app.duration;
      }
      if (event.device) {
        delete event.device.time;
      }
      for (const breadcrumb of event.breadcrumbs || []) {
        delete (breadcrumb as Partial<typeof breadcrumb>).timestamp;
      }
    }
  }

  // Recursively sort object keys so equivalent objects serialize identically
  // regardless of insertion order. Preserve array order.
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(canonical);
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, entry]) => [key, canonical(entry)])
      );
    }

    return value;
  }

  return JSON.stringify(
    canonical({ destination: report.destination, payload })
  );
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (v) =>
    v.toString(16).padStart(2, '0')
  ).join('');
}

// Clone JSON snapshots without structuredClone, which is unavailable on
// Safari 15.0 and Thunderbird 91.
function detach<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// Discard oversized records and evict the oldest reports until both the count
// and total byte limits are met. Keep records ordered oldest first.
function enforceQueueLimits(envelope: Envelope) {
  envelope.records.sort(
    (a, b) =>
      Date.parse(a.occurrences.firstSeenAt) -
        Date.parse(b.occurrences.firstSeenAt) || a.id.localeCompare(b.id)
  );
  envelope.records = envelope.records.filter(
    (r) => reportBytes(r) <= MAX_RECORD_BYTES
  );
  while (
    envelope.records.length > MAX_REPORTS ||
    reportBytes(envelope) > MAX_QUEUE_BYTES
  ) {
    envelope.records.shift();
  }
}

// Generate a UUID v4 on Safari versions that do not support randomUUID.
function recordId() {
  const random = crypto.getRandomValues(new Uint8Array(16));
  random[6] = (random[6] & 0x0f) | 0x40;
  random[8] = (random[8] & 0x3f) | 0x80;
  const hex = Array.from(random, (v) => v.toString(16).padStart(2, '0')).join(
    ''
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
