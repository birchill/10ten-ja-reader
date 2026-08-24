import Bugsnag from '@birchill/bugsnag-zero';

import type { MoraTimingData, TtsClipRequest } from '../common/tts/tts-request';
import { buildTtsFilename } from '../common/tts/tts-request';
import { isAbortError } from '../utils/is-abort-error';
import { rejectWhenAborted } from '../utils/reject-when-aborted';

const TTS_BASE_URL = 'https://data.10ten.life/audio';
const CLIP_FETCH_BUDGET_MS = 10_000;
const MAX_CLIP_BYTES = 2 * 1024 * 1024;

export type TtsFetchResult =
  | { ok: true; audioBase64: string; moraTiming?: MoraTimingData }
  | { ok: false };

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
      response = await rejectWhenAborted(
        fetch(url, { signal: controller.signal }),
        controller.signal
      );
    } catch (e) {
      if (isNetworkFailure(e)) {
        return { ok: false };
      }
      throw e;
    }

    if (!response.ok) {
      controller.abort();
      if (response.status >= 500) {
        void Bugsnag.notify('TTS clip fetch failed', {
          severity: 'warning',
          metadata: { status: response.status },
        });
      }
      return { ok: false };
    }

    const moraTiming = parseMoraTimingHeaders(response, request.reading);
    const contentLength = response.headers.get('content-length');

    let buffer: ArrayBuffer;
    try {
      buffer = await rejectWhenAborted(
        response.arrayBuffer(),
        controller.signal
      );
    } catch (e) {
      if (isNetworkFailure(e)) {
        return { ok: false };
      }
      throw e;
    }

    if (buffer.byteLength > MAX_CLIP_BYTES) {
      void Bugsnag.notify(`TTS clip exceeds the ${MAX_CLIP_BYTES}-byte cap`, {
        severity: 'warning',
        metadata: { byteLength: buffer.byteLength, contentLength },
      });
      return { ok: false };
    }

    return { ok: true, audioBase64: encodeBase64(buffer), moraTiming };
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

function isNetworkFailure(e: unknown): boolean {
  // The Fetch spec ties every TypeError from a fetch, or from reading its
  // body, to a network failure. Match the error's type, not engine-specific
  // wording ("Failed to fetch", "Load failed", ...).
  return !isAbortError(e) && e instanceof TypeError;
}

function parseMoraTimingHeaders(
  response: Response,
  reading: string
): MoraTimingData | undefined {
  const rawTimings = response.headers.get('x-amz-meta-mora-timings');
  const rawDuration = response.headers.get('x-amz-meta-audio-duration');

  if (!rawTimings || !rawDuration) {
    notifyTimingAnomalyOnce('TTS mora-timing headers missing', {
      rawTimings,
      rawDuration,
    });
    return undefined;
  }

  const expectedCount = [...reading].length;

  try {
    const totalDurationMs = parseWholeMs(rawDuration);
    if (totalDurationMs !== undefined) {
      const charTimingsMs = parseCharTimingsMs(
        JSON.parse(rawTimings),
        totalDurationMs,
        expectedCount
      );
      if (charTimingsMs !== undefined) {
        return { charTimingsMs, totalDurationMs };
      }
    }
    notifyTimingAnomalyOnce('TTS mora-timing headers invalid', {
      rawTimings,
      rawDuration,
      expectedCount,
    });
  } catch (e) {
    notifyTimingAnomalyOnce(
      new Error('TTS mora-timing headers malformed', { cause: e }),
      { rawTimings, rawDuration, expectedCount }
    );
  }

  return undefined;
}

const reportedTimingAnomalies = new Set<string>();
const MAX_TIMING_ANOMALY_REPORTS = 32;

function notifyTimingAnomalyOnce(
  error: string | Error,
  metadata: Record<string, unknown>
): void {
  const anomaly = `${typeof error === 'string' ? error : error.message}|${JSON.stringify(metadata)}`;
  if (
    reportedTimingAnomalies.has(anomaly) ||
    reportedTimingAnomalies.size >= MAX_TIMING_ANOMALY_REPORTS
  ) {
    return;
  }
  reportedTimingAnomalies.add(anomaly);

  void Bugsnag.notify(error, { severity: 'warning', metadata });
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
  totalDurationMs: number,
  expectedCount: number
): Array<number> | undefined {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length !== expectedCount
  ) {
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
