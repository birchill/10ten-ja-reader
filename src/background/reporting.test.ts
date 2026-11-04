// @vitest-environment jsdom
import { DownloadError } from '@birchill/jpdict-idb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { Permissions } from 'webextension-polyfill';

import type { PreparedReport } from '../common/prepared-report';

import type { ReportingService } from './reporting';

const mocks = vi.hoisted(() => ({
  getAll: vi.fn<() => Promise<Permissions.AnyPermissions>>(),
  managed: vi.fn<() => Promise<Record<string, unknown>>>(),
  local: vi.fn<() => Promise<Record<string, unknown>>>(),
  onRemoved:
    vi.fn<(listener: (permissions: Permissions.Permissions) => void) => void>(),
  sendMessage: vi.fn<(message: unknown) => Promise<unknown>>(),
}));
vi.mock('webextension-polyfill', () => ({
  default: {
    permissions: {
      getAll: mocks.getAll,
      onAdded: { addListener() {}, removeListener() {} },
      onRemoved: { addListener: mocks.onRemoved, removeListener() {} },
    },
    storage: {
      local: { get: mocks.local },
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

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  mocks.getAll.mockResolvedValue({
    data_collection: ['technicalAndInteraction'],
  });
  mocks.managed.mockResolvedValue({});
  mocks.local.mockResolvedValue({ installid: '012345abcd' });
  fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);
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
    resolvePermissions({ data_collection: [] });
    expect(await Promise.all(results)).toEqual([
      { status: 'skipped', reason: 'consent-required' },
      { status: 'skipped', reason: 'consent-required' },
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
  expect(await result).toEqual({
    status: 'skipped',
    reason: 'consent-required',
  });
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
