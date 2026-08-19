import Bugsnag from '@birchill/bugsnag-zero';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TtsClipRequest } from '../common/tts/tts-request';
import { buildTtsFilename } from '../common/tts/tts-request';

import type { TtsFetchKey } from './tts-fetch';
import { cancelTtsFetch, fetchTtsClip } from './tts-fetch';

const request: TtsClipRequest = { kanji: '猫', reading: 'ねこ' };
const key: TtsFetchKey = { tabId: 1, frameId: 0, requestId: 'clip-1' };

let notifySpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn());
  notifySpy = vi.spyOn(Bugsnag, 'notify').mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('fetchTtsClip', () => {
  it('returns the audio and mora timing from a successful fetch', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    mockFetch(
      makeResponse({
        headers: {
          'x-amz-meta-mora-timings': '[0,100,200]',
          'x-amz-meta-audio-duration': '300',
        },
        buffer: bytes.buffer,
      })
    );

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({
      ok: true,
      audio: Buffer.from(bytes).toString('base64'),
      moraTiming: { charTimingsMs: [0, 100, 200], totalDurationMs: 300 },
    });
    expect(fetch).toHaveBeenCalledWith(
      `https://data.10ten.life/audio/${buildTtsFilename(request)}`,
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('returns the clip without mora timing, and warns directly, when timing headers are missing', async () => {
    const bytes = new Uint8Array([9, 9]);
    mockFetch(makeResponse({ buffer: bytes.buffer }));

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({
      ok: true,
      audio: Buffer.from(bytes).toString('base64'),
    });
    expect(notifySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ severity: 'warning' })
    );
  });

  it('returns the status without a clip when the response is not ok', async () => {
    mockFetch(makeResponse({ ok: false, status: 404 }));

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false, status: 404 });
  });

  it('aborts the controller on a non-OK response, even if its body never finishes downloading', async () => {
    const call = mockFetch(
      makeResponse({
        ok: false,
        status: 500,
        arrayBuffer: () => neverSettles<ArrayBuffer>(),
      })
    );

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false, status: 500 });
    expect(call.signal?.aborted).toBe(true);
  });

  it('honors a cancel that arrives before its fetchTtsClip registers, without waiting on the network', async () => {
    mockFetch();
    cancelTtsFetch(key);

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips a plain network failure silently (no notify)', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false });
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('notifies for an unexpected throw that is not a recognized network failure', async () => {
    const error = new Error('boom');
    vi.mocked(fetch).mockRejectedValue(error);

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false });
    expect(notifySpy).toHaveBeenCalledWith(error);
  });

  it('aborts the underlying fetch when canceled while in flight', async () => {
    const call = mockFetch();

    const pending = fetchTtsClip(key, request);
    cancelTtsFetch(key);

    expect(call.signal?.aborted).toBe(true);
    await expect(pending).resolves.toEqual({ ok: false });
  });

  it('records a harmless, bounded tombstone, but touches no live signal, when canceled after the fetch settles', async () => {
    const settledKey: TtsFetchKey = {
      tabId: 1,
      frameId: 0,
      requestId: 'settled-key',
    };
    const call = mockFetch(makeResponse({ buffer: new ArrayBuffer(0) }));

    await fetchTtsClip(settledKey, request);
    cancelTtsFetch(settledKey);

    expect(call.signal?.aborted).toBe(false);
  });

  it('rejects a body over the 2MB cap before encoding it, and warns directly', async () => {
    mockFetch(makeResponse({ buffer: new ArrayBuffer(2 * 1024 * 1024 + 1) }));

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false });
    expect(notifySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ severity: 'warning' })
    );
  });

  it('returns the clip without mora timing, and warns directly, when the duration header has trailing non-digit characters', async () => {
    const bytes = new Uint8Array([9, 9]);
    mockFetch(
      makeResponse({
        headers: {
          'x-amz-meta-mora-timings': '[0,100]',
          'x-amz-meta-audio-duration': '300ms',
        },
        buffer: bytes.buffer,
      })
    );

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({
      ok: true,
      audio: Buffer.from(bytes).toString('base64'),
    });
    expect(notifySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ severity: 'warning' })
    );
  });

  it('returns the clip without mora timing, and warns directly, when the duration header is fractional', async () => {
    const bytes = new Uint8Array([9, 9]);
    mockFetch(
      makeResponse({
        headers: {
          'x-amz-meta-mora-timings': '[0,100]',
          'x-amz-meta-audio-duration': '1.5',
        },
        buffer: bytes.buffer,
      })
    );

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({
      ok: true,
      audio: Buffer.from(bytes).toString('base64'),
    });
    expect(notifySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ severity: 'warning' })
    );
  });

  it('aborts the fetch, and returns ok: false, when reading the body exceeds the 10s budget', async () => {
    mockFetch(makeResponse({ arrayBuffer: () => neverSettles<ArrayBuffer>() }));

    const pending = fetchTtsClip(key, request);
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(pending).resolves.toEqual({ ok: false });
  });
});

function makeResponse(
  init: {
    ok?: boolean;
    status?: number;
    headers?: Record<string, string>;
    buffer?: ArrayBuffer;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  } = {}
): Response {
  const headers = new Map(Object.entries(init.headers ?? {}));
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: (name: string) => headers.get(name) ?? null },
    arrayBuffer:
      init.arrayBuffer ??
      (() => Promise.resolve(init.buffer ?? new ArrayBuffer(0))),
  } as unknown as Response;
}

function mockFetch(response?: Response) {
  const call: { signal: AbortSignal | undefined } = { signal: undefined };
  vi.mocked(fetch).mockImplementation((_url, init) => {
    call.signal = (init as RequestInit | undefined)?.signal ?? undefined;
    return response ? Promise.resolve(response) : neverSettles();
  });
  return call;
}

function neverSettles<T>(): Promise<T> {
  return new Promise<T>(() => {});
}
