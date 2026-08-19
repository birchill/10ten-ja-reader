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

export async function fetchTtsClip(
  key: TtsFetchKey,
  request: TtsClipRequest
): Promise<TtsFetchResult> {
  const mapKey = keyFor(key);
  const controller = new AbortController();
  pendingFetches.set(mapKey, controller);
  const deadline = setTimeout(() => controller.abort(), CLIP_FETCH_BUDGET_MS);

  try {
    const url = `${TTS_BASE_URL}/${buildTtsFilename(request)}`;
    const response = await abortable(
      fetch(url, { signal: controller.signal }),
      controller.signal
    );

    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    const moraTiming = parseMoraTimingHeaders(response);

    const buffer = await abortable(response.arrayBuffer(), controller.signal);
    if (buffer.byteLength > MAX_CLIP_BYTES) {
      void Bugsnag.notify(`TTS clip exceeds the ${MAX_CLIP_BYTES}-byte cap`, {
        severity: 'warning',
        metadata: { byteLength: buffer.byteLength, url },
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
  pendingFetches.get(keyFor(key))?.abort();
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
    const charTimingsMs: unknown = JSON.parse(rawTimings);
    const totalDurationMs = parseInt(rawDuration, 10);
    if (
      Array.isArray(charTimingsMs) &&
      charTimingsMs.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
      Number.isFinite(totalDurationMs)
    ) {
      return { charTimingsMs, totalDurationMs };
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

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
