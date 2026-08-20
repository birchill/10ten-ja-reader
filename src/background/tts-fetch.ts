import Bugsnag from '@birchill/bugsnag-zero';

import type { MoraTimingData, TtsClipRequest } from '../common/tts/tts-request';
import { buildTtsFilename } from '../common/tts/tts-request';
import { isAbortError } from '../utils/is-abort-error';

const TTS_BASE_URL = 'https://data.10ten.life/audio';
const CLIP_FETCH_BUDGET_MS = 10_000;
const MAX_CLIP_BYTES = 2 * 1024 * 1024;

export type TtsFetchResult =
  | { ok: true; audio: string; moraTiming?: MoraTimingData }
  | { ok: false; status?: number };

export type TtsFetchKey = { tabId: number; frameId: number; requestId: string };

const pendingFetches = new Map<string, AbortController>();
const cancelledKeys = new Set<string>();
const MAX_CANCELLED_KEYS = 50;

export async function fetchTtsClip(
  key: TtsFetchKey,
  request: TtsClipRequest
): Promise<TtsFetchResult> {
  const mapKey = keyFor(key);
  if (cancelledKeys.delete(mapKey)) {
    return { ok: false };
  }

  const controller = new AbortController();
  pendingFetches.set(mapKey, controller);
  const deadline = setTimeout(() => controller.abort(), CLIP_FETCH_BUDGET_MS);

  try {
    const url = `${TTS_BASE_URL}/${buildTtsFilename(request)}`;
    let response: Response;
    try {
      response = await abortable(
        fetch(url, { signal: controller.signal }),
        controller.signal
      );
    } catch (e) {
      // The Fetch spec ties every TypeError from fetch() itself to a
      // network failure. Match the error's type here, not engine-specific
      // wording ("Failed to fetch", "Load failed", ...).
      if (!isAbortError(e) && e instanceof TypeError) {
        return { ok: false };
      }
      throw e;
    }

    if (!response.ok) {
      controller.abort();
      return { ok: false, status: response.status };
    }

    const moraTiming = parseMoraTimingHeaders(response);

    const buffer = await abortable(response.arrayBuffer(), controller.signal);
    if (buffer.byteLength > MAX_CLIP_BYTES) {
      void Bugsnag.notify(`TTS clip exceeds the ${MAX_CLIP_BYTES}-byte cap`, {
        severity: 'warning',
        metadata: {
          byteLength: buffer.byteLength,
          status: response.status,
          contentLength: response.headers.get('content-length'),
        },
      });
      return { ok: false };
    }

    return { ok: true, audio: encodeBase64(buffer), moraTiming };
  } catch (e) {
    if (isAbortError(e)) {
      return { ok: false };
    }
    void Bugsnag.notify(e);
    return { ok: false };
  } finally {
    clearTimeout(deadline);
    if (pendingFetches.get(mapKey) === controller) {
      pendingFetches.delete(mapKey);
    }
  }
}

export function cancelTtsFetch(key: TtsFetchKey): void {
  const mapKey = keyFor(key);
  const controller = pendingFetches.get(mapKey);
  if (controller) {
    controller.abort();
    return;
  }

  cancelledKeys.add(mapKey);
  if (cancelledKeys.size > MAX_CANCELLED_KEYS) {
    const oldestKey = cancelledKeys.values().next().value;
    if (oldestKey !== undefined) {
      cancelledKeys.delete(oldestKey);
    }
  }
}

function keyFor(key: TtsFetchKey): string {
  return `${key.tabId}:${key.frameId}:${key.requestId}`;
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    void promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort);
    });
  });
}

function parseMoraTimingHeaders(
  response: Response
): MoraTimingData | undefined {
  const rawTimings = response.headers.get('x-amz-meta-mora-timings');
  const rawDuration = response.headers.get('x-amz-meta-audio-duration');

  if (!rawTimings || !rawDuration) {
    void Bugsnag.notify('TTS mora-timing headers missing', {
      severity: 'warning',
      metadata: { rawTimings, rawDuration },
    });
    return undefined;
  }

  try {
    const totalDurationMs = parseWholeMs(rawDuration);
    if (totalDurationMs !== undefined) {
      const charTimingsMs = parseCharTimingsMs(
        JSON.parse(rawTimings),
        totalDurationMs
      );
      if (charTimingsMs !== undefined) {
        return { charTimingsMs, totalDurationMs };
      }
    }
    void Bugsnag.notify('TTS mora-timing headers invalid', {
      severity: 'warning',
      metadata: { rawTimings, rawDuration },
    });
  } catch (e) {
    void Bugsnag.notify(
      new Error('TTS mora-timing headers malformed', { cause: e }),
      { severity: 'warning', metadata: { rawTimings, rawDuration } }
    );
  }

  return undefined;
}

function parseWholeMs(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseCharTimingsMs(
  value: unknown,
  totalDurationMs: number
): Array<number> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const timings: Array<number> = [];
  let previous = 0;
  for (const entry of value) {
    if (
      typeof entry !== 'number' ||
      !Number.isFinite(entry) ||
      // Equal adjacent values are correct. A long vowel repeats its timestamp.
      entry < previous ||
      entry > totalDurationMs
    ) {
      return undefined;
    }
    timings.push(entry);
    previous = entry;
  }

  return timings;
}

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
