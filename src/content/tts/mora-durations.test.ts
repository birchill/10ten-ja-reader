import { describe, expect, it } from 'vitest';

import type { MoraTimingData } from '../../common/tts/tts-request';

import { computeMoraDurations } from './mora-durations';
import { getReadingTokens } from './reading-tokens';

describe('computeMoraDurations', () => {
  it.each([
    {
      name: 'runs each mora from its own timing to the next',
      reading: 'たべる',
      timing: { charTimingsMs: [0, 200, 400], totalDurationMs: 600 },
      expected: [
        { startMs: 0, durationMs: 200 },
        { startMs: 200, durationMs: 200 },
        { startMs: 400, durationMs: 200 },
      ],
    },
    {
      name: 'spans a combined mora to the next mora',
      reading: 'きゃく',
      timing: { charTimingsMs: [0, 100, 300], totalDurationMs: 500 },
      expected: [
        { startMs: 0, durationMs: 300 },
        { startMs: 300, durationMs: 200 },
      ],
    },
    {
      name: 'grows a long-vowel run together',
      reading: 'コーヒー',
      timing: { charTimingsMs: [12, 12, 220, 220], totalDurationMs: 553 },
      expected: [
        { startMs: 12, durationMs: 208 },
        { startMs: 12, durationMs: 208 },
        { startMs: 220, durationMs: 333 },
        { startMs: 220, durationMs: 333 },
      ],
    },
    {
      name: 'floors a degenerate span at 50ms',
      reading: 'たべる',
      timing: { charTimingsMs: [100, 100, 100], totalDurationMs: 100 },
      expected: [
        { startMs: 100, durationMs: 50 },
        { startMs: 100, durationMs: 50 },
        { startMs: 100, durationMs: 50 },
      ],
    },
  ])('$name', ({ reading, timing, expected }) => {
    expect(durationsFor(reading, timing)).toEqual(expected);
  });
});

function durationsFor(reading: string, timing: MoraTimingData) {
  return computeMoraDurations(
    getReadingTokens(reading, undefined, 'none'),
    timing
  );
}
