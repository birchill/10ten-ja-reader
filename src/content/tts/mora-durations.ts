import browser from 'webextension-polyfill';

import type { BackgroundRequest } from '../../background/background-request';
import type { MoraTimingData } from '../../common/tts/tts-request';

import type { ReadingToken } from './reading-tokens';

export type MoraDuration = { startMs: number; durationMs: number };

const MIN_DURATION_MS = 50;

/**
 * Turn a clip's per-codepoint timings into one `{ startMs, durationMs }` per
 * mora token, or nothing when the timings were measured against a different
 * string — in which case the caller must not animate.
 */
export function computeMoraDurations(
  tokens: ReadonlyArray<ReadingToken>,
  reading: string,
  timing: MoraTimingData
): Array<MoraDuration> | undefined {
  const codepointCount = [...reading].length;
  if (timing.charTimingsMs.length !== codepointCount) {
    reportMismatch(reading, timing, codepointCount);
    return undefined;
  }

  const startOf = (token: ReadingToken) =>
    timing.charTimingsMs[token.charIndex] ?? 0;

  return tokens.map((token, index) => {
    const startMs = startOf(token);

    // A long vowel (コーヒー, おおきい…) is one sustained sound the service
    // emits as several moras sharing a timestamp. Run every mora of such a run
    // to the next *distinct* timestamp so the run grows — and finishes —
    // together, instead of the lead mora flashing for the floor.
    let nextStart = timing.totalDurationMs;
    for (let next = index + 1; next < tokens.length; next++) {
      const candidate = startOf(tokens[next]);
      if (candidate > startMs) {
        nextStart = candidate;
        break;
      }
    }

    return {
      startMs,
      durationMs: Math.max(nextStart - startMs, MIN_DURATION_MS),
    };
  });
}

// One report per set of timings: the overlay recomputes durations on every
// render, and a mismatch does not resolve itself.
const reported = new WeakSet<MoraTimingData>();

function reportMismatch(
  reading: string,
  timing: MoraTimingData,
  codepointCount: number
) {
  if (reported.has(timing)) {
    return;
  }
  reported.add(timing);

  void browser.runtime
    .sendMessage<BackgroundRequest, void>({
      type: 'notifyTtsWarning',
      message: `Mora timing mismatch: ${timing.charTimingsMs.length} timings for ${codepointCount} codepoints in "${reading}"`,
    })
    .catch(() => {});
}
