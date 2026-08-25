import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TtsClipRequest } from '../common/tts/tts-request';
import { buildTtsFilename } from '../common/tts/tts-request';

import type * as TtsFetch from './tts-fetch';

const request: TtsClipRequest = { kanji: '猫', reading: 'ねこ' };
const key: TtsFetch.TtsFetchKey = { tabId: 1, frameId: 0, requestId: 'clip-1' };

let notifySpy: ReturnType<typeof vi.spyOn>;
let fetchTtsClip: typeof TtsFetch.fetchTtsClip;
let cancelTtsFetch: typeof TtsFetch.cancelTtsFetch;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.stubGlobal('fetch', vi.fn());

  const Bugsnag = (await import('@birchill/bugsnag-zero')).default;
  notifySpy = vi.spyOn(Bugsnag, 'notify').mockResolvedValue(undefined);

  const mod = await import('./tts-fetch');
  fetchTtsClip = mod.fetchTtsClip;
  cancelTtsFetch = mod.cancelTtsFetch;
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
          'x-amz-meta-mora-timings': '[0,100]',
          'x-amz-meta-audio-duration': '300',
        },
        buffer: bytes.buffer,
      })
    );

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({
      ok: true,
      audioBase64: Buffer.from(bytes).toString('base64'),
      moraTiming: { charTimingsMs: [0, 100], totalDurationMs: 300 },
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
      audioBase64: Buffer.from(bytes).toString('base64'),
    });
    expect(notifySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ severity: 'warning' })
    );
  });

  it('drops timings that do not count one entry per codepoint of the reading', async () => {
    const bytes = new Uint8Array([9, 9]);
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
      audioBase64: Buffer.from(bytes).toString('base64'),
    });
    expect(notifySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        severity: 'warning',
        metadata: expect.objectContaining({ expectedCount: 2 }),
      })
    );
  });

  it('warns once for a repeated timing anomaly, however many clips hit it', async () => {
    mockFetch(
      makeResponse({
        headers: {
          'x-amz-meta-mora-timings': '[0,100,200,300,400]',
          'x-amz-meta-audio-duration': '500',
        },
        buffer: new Uint8Array([7]).buffer,
      })
    );

    await fetchTtsClip(key, request);
    await fetchTtsClip({ ...key, requestId: 'clip-2' }, request);

    expect(notifySpy).toHaveBeenCalledTimes(1);
  });

  it('stops warning once it has reported its cap of distinct anomalies', async () => {
    for (let i = 0; i < 40; i++) {
      mockFetch(
        makeResponse({
          headers: {
            'x-amz-meta-mora-timings': '[0,100]',
            'x-amz-meta-audio-duration': `${i}x`,
          },
          buffer: new Uint8Array([1]).buffer,
        })
      );
      await fetchTtsClip({ ...key, requestId: `clip-${i}` }, request);
    }

    expect(notifySpy).toHaveBeenCalledTimes(32);
  });

  it('returns no clip, and stays silent, when the reading simply has no audio', async () => {
    mockFetch(makeResponse({ ok: false, status: 404 }));

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false });
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('warns, with the status, when our own audio service fails', async () => {
    const call = mockFetch(
      makeResponse({
        ok: false,
        status: 500,
        arrayBuffer: () => neverSettles<ArrayBuffer>(),
      })
    );

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false });
    expect(call.signal?.aborted).toBe(true);
    expect(notifySpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        severity: 'warning',
        metadata: expect.objectContaining({ status: 500 }),
      })
    );
  });

  it('honors a cancel that arrives before its fetchTtsClip registers, without waiting on the network', async () => {
    mockFetch();
    cancelTtsFetch(key);

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { engine: 'Chrome', message: 'Failed to fetch' },
    { engine: 'Safari', message: 'Load failed' },
  ])(
    'skips a TypeError from fetch() silently, regardless of its message ($engine wording)',
    async ({ message }) => {
      vi.mocked(fetch).mockRejectedValue(new TypeError(message));

      const result = await fetchTtsClip(key, request);

      expect(result).toEqual({ ok: false });
      expect(notifySpy).not.toHaveBeenCalled();
    }
  );

  it('skips a TypeError from the body read silently, just like one from fetch() itself', async () => {
    mockFetch(
      makeResponse({
        headers: {
          'x-amz-meta-mora-timings': '[0,100]',
          'x-amz-meta-audio-duration': '300',
        },
        arrayBuffer: () => Promise.reject(new TypeError('Load failed')),
      })
    );

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false });
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('notifies when encoding the clip throws, even though the fetch itself succeeded', async () => {
    mockFetch(makeResponse({ buffer: new Uint8Array([1, 2, 3]).buffer }));
    const encodeError = new TypeError('Load failed');
    vi.stubGlobal('btoa', () => {
      throw encodeError;
    });

    const result = await fetchTtsClip(key, request);

    expect(result).toEqual({ ok: false });
    expect(notifySpy).toHaveBeenCalledWith(encodeError);
  });

  it('cancels only the clip it was asked to, leaving a concurrent fetch running', async () => {
    const other: TtsFetch.TtsFetchKey = { ...key, requestId: 'clip-other' };
    const call = mockFetch();

    const pending = fetchTtsClip(key, request);
    const otherPending = fetchTtsClip(other, request);
    cancelTtsFetch(other);

    await expect(otherPending).resolves.toEqual({ ok: false });
    expect(call.signals[0]?.aborted).toBe(false);
    expect(call.signals[1]?.aborted).toBe(true);

    cancelTtsFetch(key);
    await expect(pending).resolves.toEqual({ ok: false });
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

  it.each([
    { shape: 'a fractional value', rawDuration: '1.5' },
    { shape: 'a value past a safe integer', rawDuration: '9'.repeat(400) },
  ])(
    'returns the clip without mora timing, and warns directly, when the duration header has $shape',
    async ({ rawDuration }) => {
      const bytes = new Uint8Array([9, 9]);
      mockFetch(
        makeResponse({
          headers: {
            'x-amz-meta-mora-timings': '[0,100]',
            'x-amz-meta-audio-duration': rawDuration,
          },
          buffer: bytes.buffer,
        })
      );

      const result = await fetchTtsClip(key, request);

      expect(result).toEqual({
        ok: true,
        audioBase64: Buffer.from(bytes).toString('base64'),
      });
      expect(notifySpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ severity: 'warning' })
      );
    }
  );

  it.each([
    { shape: 'a negative entry', rawTimings: '[0,-1]' },
    { shape: 'a decreasing pair', rawTimings: '[200,100]' },
    { shape: 'an entry past the total duration', rawTimings: '[0,400]' },
    { shape: 'a non-numeric entry', rawTimings: '[0,"100"]' },
    { shape: 'no array at all', rawTimings: '{"0":100}' },
  ])(
    'returns the clip without mora timing, and warns once, when the timings header has $shape',
    async ({ rawTimings }) => {
      const bytes = new Uint8Array([9, 9]);
      mockFetch(
        makeResponse({
          headers: {
            'x-amz-meta-mora-timings': rawTimings,
            'x-amz-meta-audio-duration': '300',
          },
          buffer: bytes.buffer,
        })
      );

      const result = await fetchTtsClip(key, request);

      expect(result).toEqual({
        ok: true,
        audioBase64: Buffer.from(bytes).toString('base64'),
      });
      expect(notifySpy).toHaveBeenCalledTimes(1);
      expect(notifySpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ severity: 'warning' })
      );
    }
  );

  it('keeps a timing sequence whose adjacent entries repeat, up to the total duration', async () => {
    const longVowel: TtsClipRequest = { kanji: '学校', reading: 'がっこう' };
    const bytes = new Uint8Array([9, 9]);
    mockFetch(
      makeResponse({
        headers: {
          'x-amz-meta-mora-timings': '[12,151,262,262]',
          'x-amz-meta-audio-duration': '553',
        },
        buffer: bytes.buffer,
      })
    );

    const result = await fetchTtsClip(key, longVowel);

    expect(result).toEqual({
      ok: true,
      audioBase64: Buffer.from(bytes).toString('base64'),
      moraTiming: { charTimingsMs: [12, 151, 262, 262], totalDurationMs: 553 },
    });
    expect(notifySpy).not.toHaveBeenCalled();
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
  const call: {
    signal: AbortSignal | undefined;
    signals: Array<AbortSignal | undefined>;
  } = { signal: undefined, signals: [] };
  vi.mocked(fetch).mockImplementation((_url, init) => {
    call.signal = (init as RequestInit | undefined)?.signal ?? undefined;
    call.signals.push(call.signal);
    return response ? Promise.resolve(response) : neverSettles();
  });
  return call;
}

function neverSettles<T>(): Promise<T> {
  return new Promise<T>(() => {});
}
