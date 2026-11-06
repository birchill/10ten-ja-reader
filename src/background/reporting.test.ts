// @vitest-environment jsdom
import { DownloadError } from '@birchill/jpdict-idb';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { Permissions } from 'webextension-polyfill';

import type { PreparedReport } from '../common/prepared-report';

import type { BackgroundRequest } from './background-request';
import type { ReportingService } from './reporting';

const mocks = vi.hoisted(() => ({
  getAll: vi.fn<() => Promise<Permissions.AnyPermissions>>(),
  request: vi.fn<() => Promise<boolean>>(),
  remove: vi.fn<() => Promise<boolean>>(),
  managed: vi.fn<() => Promise<Record<string, unknown>>>(),
  local: vi.fn<() => Promise<Record<string, unknown>>>(),
  set: vi.fn<(value: Record<string, unknown>) => Promise<void>>(),
  onRemoved:
    vi.fn<(listener: (permissions: Permissions.Permissions) => void) => void>(),
  sendMessage: vi.fn<(message: unknown) => Promise<unknown>>(),
}));
vi.mock('webextension-polyfill', () => ({
  default: {
    permissions: {
      getAll: mocks.getAll,
      request: mocks.request,
      remove: mocks.remove,
      onAdded: { addListener() {}, removeListener() {} },
      onRemoved: { addListener: mocks.onRemoved, removeListener() {} },
    },
    storage: {
      local: { get: mocks.local, set: mocks.set },
      managed: { get: mocks.managed },
      onChanged: { addListener() {}, removeListener() {} },
    },
    runtime: {
      id: 'test-extension',
      getURL: () => 'moz-extension://test/',
      getManifest: () => ({ version: '1.29.0' }),
      sendMessage: mocks.sendMessage,
    },
  },
}));
vi.mock('../utils/release-stage', () => ({
  getReleaseStage: () => 'development',
}));

const fetchMock = vi.fn<typeof fetch>();
let service: ReportingService;
let sdkEvents: MockInstance<Window['addEventListener']>;
let storage: Record<string, unknown>;

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.getAll.mockResolvedValue({
    data_collection: ['technicalAndInteraction'],
  });
  mocks.managed.mockResolvedValue({});
  storage = { installid: '012345abcd' };
  mocks.local.mockImplementation(async () => structuredClone(storage));
  mocks.set.mockImplementation(async (value) => {
    Object.assign(storage, structuredClone(value));
  });
  fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    subtle: webcrypto.subtle,
  });
  sdkEvents = vi.spyOn(window, 'addEventListener');
});

afterEach(() => {
  service.consent.dispose();
  service.policy.dispose();
  for (const [name, listener, options] of sdkEvents.mock.calls) {
    window.removeEventListener(name, listener, options);
  }
  sdkEvents.mockRestore();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function start(context: 'background' | 'options' = 'background') {
  const { ReportingService } = await import('./reporting');
  const { startBugsnag } = await import('../utils/bugsnag');
  const { captureReply, forwardPreparedReport } =
    await import('../common/prepared-report');
  const { default: bugsnag } = await import('@birchill/bugsnag-zero');
  service = new ReportingService();
  mocks.sendMessage.mockImplementation(async (message) => {
    const request = message as { type: string; report: PreparedReport };
    return request.type === 'getReportingInstallationId'
      ? '012345abcd'
      : JSON.parse(
          JSON.stringify(captureReply(await service.capture(request.report)))
        );
  });
  startBugsnag(
    context,
    context === 'background'
      ? (report) => service.capture(report)
      : forwardPreparedReport
  );
  return bugsnag;
}

for (const context of ['background', 'options'] as const) {
  it(`blocks both routes during unknown and denied startup in ${context}`, async () => {
    let resolvePermissions!: (permissions: Permissions.AnyPermissions) => void;
    mocks.getAll.mockReturnValue(
      new Promise((resolve) => {
        resolvePermissions = resolve;
      })
    );
    const bugsnag = await start(context);
    const captured = vi.spyOn(service, 'capture');
    const results = [
      bugsnag.notify(new Error('Unexpected error')),
      bugsnag.notify(
        new DownloadError({
          code: 'Timeout',
          url: 'https://data.10ten.life/dict',
        })
      ),
    ];
    await vi.waitFor(() => expect(captured).toHaveBeenCalledTimes(2));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
    resolvePermissions({ data_collection: [] });
    expect(await Promise.all(results)).toEqual([
      { status: 'stored' },
      { status: 'stored' },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
}

it('routes downloads exclusively and replays the exact prepared Bugsnag snapshot', async () => {
  const bugsnag = await start();
  await service.ready;
  const captured = vi.spyOn(service, 'capture');
  expect(
    (
      await bugsnag.notify(
        new DownloadError(
          { code: 'Timeout', url: 'https://data.10ten.life/dict' },
          'download timeout'
        )
      )
    ).status
  ).toBe('sent');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('https://data.10ten.life/report');
  expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toMatchObject({
    t: 'dl_failed',
    etype: 'timeout',
    uid: expect.stringMatching(/^[0-9a-f]{14}$/),
  });

  // The same API receives worker-forwarded errors represented as plain objects.
  expect(
    (await bugsnag.notify({ name: 'Error', message: 'Forwarded worker error' }))
      .status
  ).toBe('sent');
  const report = captured.mock.calls[1][0];
  const originalBody = fetchMock.mock.calls[1][1]!.body;
  bugsnag.leaveBreadcrumb('Later activity');
  expect((await service.sendPrepared(report, { manual: true })).status).toBe(
    'sent'
  );
  expect(fetchMock.mock.calls[2][0]).toBe('https://notify.bugsnag.com/');
  expect(fetchMock.mock.calls[2][1]!.body).toBe(originalBody);
  expect(originalBody).not.toContain('__10tenDownloadReport');

  // SDK size protection can discard metadata, including the routing payload.
  // It must not change a download's destination as a side effect.
  expect(
    await bugsnag.notify(
      new DownloadError({
        code: 'Timeout',
        url: 'https://data.10ten.life/dict',
      }),
      { metadata: { oversized: 'x'.repeat(1_000_000) } }
    )
  ).toEqual({ status: 'skipped', reason: 'download-payload-unavailable' });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('rechecks consent after asynchronous error preparation', async () => {
  const bugsnag = await start();
  await service.ready;
  let resolveIdentity!: (value: Record<string, unknown>) => void;
  mocks.local.mockReturnValue(
    new Promise((resolve) => {
      resolveIdentity = resolve;
    })
  );
  const result = bugsnag.notify(new Error('Prepared after revocation'));
  mocks.onRemoved.mock.calls[0][0]({
    data_collection: ['technicalAndInteraction'],
  });
  resolveIdentity({ installid: '012345abcd' });
  expect(await result).toEqual({ status: 'stored' });
  expect(fetchMock).not.toHaveBeenCalled();
});

const downloadReport: PreparedReport = {
  destination: 'download-failure',
  payload: {
    t: 'dl_failed',
    etype: 'timeout',
    url: 'https://data.10ten.life/dict',
    v: '1.29.0',
  },
  context: {
    source: 'background',
    capturedAt: '2026-11-04T00:00:00Z',
    appVersion: '1.29.0',
  },
};

it('blocks manual sends under policy even with consent, and distinguishes HTTP/network/timeout failures', async () => {
  const { ReportingService } = await import('./reporting');
  mocks.managed.mockResolvedValue({ DisableErrorReporting: true });
  service = new ReportingService();
  await service.ready;
  expect(
    (await service.sendPrepared(downloadReport, { manual: true })).status
  ).toBe('skipped');
  expect(fetchMock).not.toHaveBeenCalled();

  mocks.managed.mockResolvedValue({ DisableLocalErrorStorage: true });
  await service.policy.refresh();
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
  expect(await service.sendPrepared(downloadReport)).toMatchObject({
    status: 'failed',
    statusCode: 503,
  });
  fetchMock.mockRejectedValueOnce(new TypeError('Network unavailable'));
  expect(await service.sendPrepared(downloadReport)).toMatchObject({
    status: 'failed',
  });

  vi.useFakeTimers();
  fetchMock.mockReturnValueOnce(new Promise(() => {}));
  const timedOut = service.sendPrepared(downloadReport);
  await vi.advanceTimersByTimeAsync(10_000);
  expect(await timedOut).toMatchObject({
    status: 'failed',
    error: expect.objectContaining({ message: 'Diagnostic request timed out' }),
  });
});

async function startWithQueue() {
  mocks.getAll.mockResolvedValue({ data_collection: [] });
  const { ReportingService } = await import('./reporting');
  service = new ReportingService();
  await service.ready;
  return service.queue;
}

function reportWithMessage(
  msg: string,
  capturedAt = downloadReport.context.capturedAt
): PreparedReport {
  return {
    ...downloadReport,
    payload: { ...downloadReport.payload, msg },
    context: { ...downloadReport.context, capturedAt },
  } as PreparedReport;
}

it('serializes captures, detaches data, and retains representative context across restarts and builds', async () => {
  const queue = await startWithQueue();
  const original = reportWithMessage('synthetic');
  const pending = queue.store(original);
  if ('msg' in original.payload) {
    original.payload.msg = 'mutated';
  }
  await pending;
  await Promise.all(
    Array.from({ length: 9 }, (_, i) =>
      queue.store(
        reportWithMessage(
          'synthetic',
          `2026-11-04T00:00:${String(i + 1).padStart(2, '0')}Z`
        )
      )
    )
  );
  const state = await queue.readState();
  expect(state.count).toBe(1);
  expect(state.records[0].occurrences.count).toBe(10);
  const id = state.records[0].id;
  const saved = await queue.readReport(id);
  expect(saved?.context).toEqual(downloadReport.context);
  expect(saved?.payload).toMatchObject({ msg: 'synthetic' });

  service.consent.dispose();
  service.policy.dispose();
  const restarted = await startWithQueue();
  expect(await restarted.readReport(id)).toEqual(saved);
  await restarted.store({
    ...downloadReport,
    context: { ...downloadReport.context, appVersion: 'future' },
    payload: { ...downloadReport.payload, v: 'future' },
  } as PreparedReport);
  expect((await restarted.readState()).count).toBe(2);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('enforces count, UTF-8 queue bytes, and per-record bounds without evicting for impossible reports', async () => {
  const queue = await startWithQueue();
  for (let i = 0; i < 11; i++) {
    await queue.store(
      reportWithMessage(
        String(i),
        `2026-11-04T00:00:${String(i).padStart(2, '0')}Z`
      )
    );
  }
  expect((await queue.readState()).count).toBe(10);
  expect((await queue.readState()).records[0].context.capturedAt).toBe(
    '2026-11-04T00:00:01Z'
  );
  const before = await queue.readState();
  expect(
    (await queue.store(reportWithMessage('あ'.repeat(44_000)))).status
  ).toBe('failed');
  expect(await queue.readState()).toEqual(before);

  await queue.deleteAll();
  for (let i = 0; i < 6; i++) {
    await queue.store(
      reportWithMessage(`${i}${'あ'.repeat(40_000)}`, `2026-11-04T00:01:0${i}Z`)
    );
  }
  const state = await queue.readState();
  expect(state.count).toBe(4);
  expect(state.records[0].context.capturedAt).toBe('2026-11-04T00:01:02Z');
  expect(
    new TextEncoder().encode(JSON.stringify(storage.diagnosticReports))
      .byteLength
  ).toBeLessThanOrEqual(512 * 1024);
});

it('deduplicates canonical Bugsnag content ignoring only SDK timing fields', async () => {
  const queue = await startWithQueue();
  const report: PreparedReport = {
    destination: 'bugsnag',
    context: downloadReport.context,
    payload: {
      apiKey: 'synthetic',
      payloadVersion: '4',
      notifier: { name: 'test', version: '1', url: 'https://example.com' },
      events: [
        {
          exceptions: [
            { errorClass: 'Error', message: 'synthetic', stacktrace: [] },
          ],
          app: { duration: 1, version: '1' },
          device: { time: '2026-11-04T00:00:00Z' },
          breadcrumbs: [
            {
              name: 'test',
              timestamp: '2026-11-04T00:00:00Z',
              type: 'manual',
              metaData: { a: 1, b: 2 },
            },
          ],
        },
      ],
    },
  };
  await queue.store(report);
  const later = structuredClone(report);
  later.payload.events[0].app!.duration = 200;
  later.payload.events[0].device!.time = '2026-11-05T00:00:00Z';
  later.payload.events[0].breadcrumbs![0].timestamp = '2026-11-05T00:00:00Z';
  later.payload.events[0].breadcrumbs![0].metaData = { b: 2, a: 1 };
  await queue.store(later);
  expect((await queue.readState()).records[0].occurrences.count).toBe(2);
  later.payload.events[0].breadcrumbs![0].metaData = { a: 2 };
  await queue.store(later);
  expect((await queue.readState()).count).toBe(2);
});

it('retains failures, freezes occurrences, and never resurrects deleted reports on send completion', async () => {
  const queue = await startWithQueue();
  await queue.store(downloadReport);
  const state = await queue.readState();
  const id = state.records[0].id;
  expect(await queue.freeze([id], state.revision - 1)).toBe(false);
  expect(await queue.freeze([id], state.revision)).toBe(true);
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
  expect(
    (await queue.send(id, (r) => service.sendPrepared(r, { manual: true })))
      .status
  ).toBe('failed');
  expect((await queue.readReport(id))?.delivery).toMatchObject({
    state: 'failed',
    attempts: 1,
    statusCode: 503,
  });

  let complete!: (response: Response) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      complete = resolve;
    })
  );
  const sending = queue.send(id, (r) =>
    service.sendPrepared(r, { manual: true })
  );
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(
    (await queue.send(id, (r) => service.sendPrepared(r, { manual: true })))
      .status
  ).toBe('skipped');
  await queue.store(downloadReport);
  expect((await queue.readState()).count).toBe(2);
  await queue.deleteReport(id);
  complete(new Response(null, { status: 202 }));
  expect((await sending).status).toBe('sent');
  expect(await queue.readReport(id)).toBeUndefined();
  const remaining = (await queue.readState()).records[0];
  await queue.release();
  await queue.freeze([remaining.id], (await queue.readState()).revision);
  expect(
    (
      await queue.send(remaining.id, (r) =>
        service.sendPrepared(r, { manual: true })
      )
    ).status
  ).toBe('sent');
  expect((await queue.readState()).count).toBe(0);
});

it('preserves unknown schemas, rejects corrupt records, and recovers unfinished attempts without resending', async () => {
  let queue = await startWithQueue();
  await queue.store(downloadReport);
  const envelope = storage.diagnosticReports as {
    records: Array<{ dedupKey: string; delivery: { state: string } }>;
  };
  envelope.records[0].delivery.state = 'sending';
  // A key produced by older identity rules must not invalidate the report.
  envelope.records[0].dedupKey = '0'.repeat(64);
  envelope.records.push({ broken: true } as never);
  service.consent.dispose();
  service.policy.dispose();
  queue = await startWithQueue();
  expect((await queue.readState()).records[0].delivery.state).toBe(
    'interrupted'
  );
  expect((storage.diagnosticReports as typeof envelope).records).toHaveLength(
    1
  );
  expect(
    (storage.diagnosticReports as typeof envelope).records[0].dedupKey
  ).not.toBe('0'.repeat(64));
  await queue.store(downloadReport);
  expect((await queue.readState()).records[0].occurrences.count).toBe(2);
  expect(fetchMock).not.toHaveBeenCalled();

  service.consent.dispose();
  service.policy.dispose();
  storage.diagnosticReports = { schemaVersion: 99, records: ['future'] };
  queue = await startWithQueue();
  expect((await queue.readState()).status).toBe('unsupported');
  expect((await queue.store(downloadReport)).status).toBe('failed');
  expect(storage.diagnosticReports).toEqual({
    schemaVersion: 99,
    records: ['future'],
  });
  expect(await queue.deleteAll()).toBe(true);
  expect((await queue.store(downloadReport)).status).toBe('stored');
});

it('reports durable save failures and keeps the last successful snapshot', async () => {
  const queue = await startWithQueue();
  await queue.store(downloadReport);
  const state = await queue.readState();
  mocks.set.mockRejectedValue(new Error('Quota exceeded'));
  expect((await service.capture(reportWithMessage('failed save'))).status).toBe(
    'failed'
  );
  expect(await queue.readState()).toEqual(state);
  expect(await queue.deleteAll()).toBe(false);
  mocks.local.mockRejectedValue(new Error('Storage denied'));
  service.consent.dispose();
  service.policy.dispose();
  expect((await (await startWithQueue()).store(downloadReport)).status).toBe(
    'failed'
  );
});

it('applies sending and local-storage policies independently and together without resetting preferences or identity', async () => {
  const queue = await startWithQueue();
  storage.automaticErrorReporting = true;
  storage.reportNoticeDismissed = true;
  mocks.managed.mockResolvedValue({ DisableErrorReporting: true });
  await service.policy.refresh();
  expect((await service.capture(downloadReport)).status).toBe('stored');
  expect(fetchMock).not.toHaveBeenCalled();

  mocks.managed.mockResolvedValue({ DisableLocalErrorStorage: true });
  await service.policy.refresh();
  expect((await queue.readState()).count).toBe(0);
  expect((await queue.store(downloadReport)).status).toBe('skipped');
  expect(
    (await service.sendPrepared(downloadReport, { manual: true })).status
  ).toBe('sent');
  mocks.getAll.mockResolvedValue({
    data_collection: ['technicalAndInteraction'],
  });
  await service.consent.refresh();
  fetchMock.mockRejectedValueOnce(new Error('synthetic failure'));
  expect((await service.capture(downloadReport)).status).toBe('failed');
  expect((await queue.readState()).count).toBe(0);
  mocks.managed.mockResolvedValue({
    DisableLocalErrorStorage: true,
    DisableErrorReporting: true,
  });
  await service.policy.refresh();
  expect((await service.capture(downloadReport)).status).toBe('skipped');
  expect(storage).toMatchObject({
    installid: '012345abcd',
    automaticErrorReporting: true,
    reportNoticeDismissed: true,
  });
});

it('sends a fixed mixed batch once and retries only its surviving failures', async () => {
  // Arrange: save one report for each destination, with automatic reporting off.
  const queue = await startWithQueue();
  const { sendReportsOnce, retryReportBatch } =
    await import('../options/reporting-commands');
  mocks.sendMessage.mockImplementation((message) => {
    const request = message as BackgroundRequest;
    switch (request.type) {
      case 'sendReportsOnce':
        return service.sendOnce(request.selectedIds, request.expectedRevision);

      case 'retryReportBatch':
        return service.retryBatch(request.id);

      default:
        throw new Error('Unexpected reporting command');
    }
  });
  const bugsnagReport: PreparedReport = {
    destination: 'bugsnag',
    context: downloadReport.context,
    payload: {
      apiKey: 'synthetic',
      payloadVersion: '4',
      notifier: { name: 'test', version: '1', url: 'https://example.com' },
      events: [{ exceptions: [{ errorClass: 'Error', stacktrace: [] }] }],
    },
  };
  await queue.store(downloadReport);
  await queue.store(bugsnagReport);
  const state = await queue.readState();
  const ids = state.records.map((r) => r.id);

  // An outdated display must require a refresh before authorizing any sends.
  expect(await sendReportsOnce(ids, state.revision - 1)).toEqual({
    status: 'stale-state',
  });

  // Hold the first request open so we can change the queue during the batch.
  let complete!: (response: Response) => void;
  fetchMock.mockReturnValueOnce(
    new Promise((resolve) => {
      complete = resolve;
    })
  );
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));

  // Act: start the displayed batch. Repeating the command returns its progress.
  const sending = sendReportsOnce(ids, state.revision);
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(await sendReportsOnce(ids, state.revision)).toMatchObject({
    status: 'ok',
    batch: { status: 'sending' },
  });

  // Later occurrences and new reports stay outside the frozen selection.
  // Revoking automatic consent must leave this manual authorization intact.
  await queue.store(downloadReport);
  await queue.store(reportWithMessage('later arrival'));
  mocks.onRemoved.mock.calls[0][0]({
    data_collection: ['technicalAndInteraction'],
  });
  complete(new Response(null, { status: 202 }));
  const result = await sending;

  // Assert: the two original payloads went to their own destinations unchanged.
  // Only one succeeded; the failed report and both later arrivals remain saved.
  expect(result).toMatchObject({
    status: 'ok',
    batch: {
      status: 'complete',
      totalSelected: 2,
      sent: 1,
      failed: 1,
      skipped: 0,
    },
  });
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(
    state.records.map((r) =>
      r.destination === 'bugsnag'
        ? 'https://notify.bugsnag.com/'
        : 'https://data.10ten.life/report'
    )
  );
  for (const [index, [, init]] of fetchMock.mock.calls.entries()) {
    expect(JSON.parse(init!.body as string)).toEqual(
      state.records[index].destination === 'bugsnag'
        ? bugsnagReport.payload
        : downloadReport.payload
    );
  }

  expect((await queue.readState()).count).toBe(3);
  expect(mocks.request).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(storage.automaticErrorReporting).toBeUndefined();
  if (result.status !== 'ok') {
    throw new Error('Expected batch result');
  }

  // An explicit retry sends only the original failure.
  expect(await retryReportBatch(result.batch.id)).toMatchObject({
    status: 'ok',
    batch: { totalSelected: 1, sent: 1, failed: 0, skipped: 0 },
  });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect((await queue.readState()).count).toBe(2);
});

it.each(['DisableErrorReporting', 'DisableLocalErrorStorage'])(
  'stops subsequent batch requests when %s activates',
  async (policy) => {
    // Arrange: save two reports and hold the first request open.
    const queue = await startWithQueue();
    await queue.store(downloadReport);
    await queue.store(reportWithMessage('second'));
    const state = await queue.readState();
    let complete!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      })
    );

    // Act: activate the policy after dispatching the first request, then let
    // that in-flight request finish.
    const sending = service.sendOnce(
      state.records.map((r) => r.id),
      state.revision
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    mocks.managed.mockResolvedValue({ [policy]: true });
    await service.policy.refresh();
    complete(new Response(null, { status: 202 }));

    // Assert: the second request is skipped. Only the storage policy clears
    // its saved copy; the sending policy leaves it available for inspection.
    expect(await sending).toMatchObject({
      status: 'ok',
      batch: { totalSelected: 2, sent: 1, failed: 0, skipped: 1 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await queue.readState()).count).toBe(
      policy === 'DisableErrorReporting' ? 1 : 0
    );
  }
);

it.each(['declined', 'request-failed', 'write-failed', 'granted'] as const)(
  'sends the combined action once when enabling is %s',
  async (outcome) => {
    // Arrange: save one report and configure the consent adapter's outcome.
    // The local-preference case simulates a browser without native support.
    const queue = await startWithQueue();
    const { sendReportsAndEnable } =
      await import('../options/reporting-commands');
    await queue.store(downloadReport);
    const state = await queue.readState();
    mocks.getAll.mockResolvedValue(
      outcome === 'write-failed' ? {} : { data_collection: [] }
    );
    await service.consent.refresh();
    mocks.request.mockImplementation(async () => {
      if (outcome === 'request-failed') {
        throw new Error('Request failed');
      }

      if (outcome === 'granted') {
        mocks.getAll.mockResolvedValue({
          data_collection: ['technicalAndInteraction'],
        });
      }

      return outcome === 'granted';
    });
    if (outcome === 'write-failed') {
      mocks.set.mockRejectedValueOnce(new Error('Write failed'));
    }

    // Route the options command to the real background batch coordinator.
    mocks.sendMessage.mockImplementation((message) => {
      const request = message as {
        selectedIds: Array<string>;
        expectedRevision: number;
      };
      return service.sendOnce(request.selectedIds, request.expectedRevision);
    });

    // Act: invoke the combined action directly, as a user event handler would.
    const result = sendReportsAndEnable(
      state.records.map((r) => r.id),
      state.revision,
      service.consent
    );

    // Assert: the native request starts before yielding the user gesture.
    // Sending succeeds even if enabling fails, with its outcome shown separately.
    expect(mocks.request).toHaveBeenCalledTimes(
      outcome === 'write-failed' ? 0 : 1
    );
    expect(await result).toMatchObject({
      status: 'ok',
      batch: { sent: 1, failed: 0, skipped: 0 },
      automaticReporting:
        outcome === 'granted'
          ? 'enabled'
          : outcome === 'declined'
            ? 'off'
            : 'error',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await queue.readState()).count).toBe(0);
  }
);
