import type { MoraTimingData } from '../../common/tts/tts-request';

import type { ReadingToken } from './reading-tokens';

export type MoraDuration = { startMs: number; durationMs: number };

const MIN_DURATION_MS = 50;

export function computeMoraDurations(
  tokens: ReadonlyArray<ReadingToken>,
  timing: MoraTimingData
): Array<MoraDuration> {
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
