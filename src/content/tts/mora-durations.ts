import type { MoraTimingData } from '../../common/tts/tts-request';

import type { ReadingToken } from './reading-tokens';

export type MoraDuration = { startMs: number; durationMs: number };

const MIN_DURATION_MS = 50;

export function computeMoraDurations(
  tokens: ReadonlyArray<ReadingToken>,
  timing: MoraTimingData
): Array<MoraDuration> {
  const startOf = (token: ReadingToken) =>
    timing.charTimingsMs[token.charIndex];

  return tokens.map((token, index) => {
    const startMs = startOf(token);

    // A long vowel is one sustained sound, so the service gives its moras the
    // same timestamp. Run to the next distinct one to keep them together.
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
