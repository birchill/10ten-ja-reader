import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BackgroundRequest } from '../../background/background-request';
import type { MoraTimingData } from '../../common/tts/tts-request';

import { computeMoraDurations } from './mora-durations';
import { getReadingTokens } from './reading-tokens';

const { sendMessage } = vi.hoisted(() => ({
  sendMessage: vi.fn<(message: BackgroundRequest) => Promise<unknown>>(),
}));

vi.mock('webextension-polyfill', () => ({
  default: { runtime: { sendMessage } },
}));

beforeEach(() => {
  sendMessage.mockReset();
  sendMessage.mockResolvedValue(undefined);
});

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

  // Which mismatches have already been reported is deliberately module-wide, so
  // give each test below its own reading: reuse one and the earlier test's
  // report suppresses this one's, for no visible reason.
  it('gives no durations when the timings do not cover the reading', () => {
    const timing = { charTimingsMs: [0, 200, 400], totalDurationMs: 600 };

    expect(durationsFor('かさ', timing)).toBeUndefined();
  });

  it('warns once for a mismatch, however often it is recomputed', () => {
    const timing = { charTimingsMs: [0, 200], totalDurationMs: 600 };

    durationsFor('たべる', timing);
    durationsFor('たべる', timing);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    // The reading the user looked up must not reach telemetry.
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'notifyTtsWarning',
      message: 'Mora timing mismatch: 2 timings for 3 codepoints',
    });
  });

  it('warns once across replays, which refetch the clip', () => {
    // Playing a reading again refetches its clip, so the timings arrive in a
    // new object each time. The anomaly is still the same one.
    durationsFor('ねこ', { charTimingsMs: [0], totalDurationMs: 600 });
    durationsFor('ねこ', { charTimingsMs: [0], totalDurationMs: 600 });

    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('warns for each separate mismatch', () => {
    durationsFor('いぬ', { charTimingsMs: [0], totalDurationMs: 600 });
    durationsFor('いぬ', { charTimingsMs: [0, 1, 2], totalDurationMs: 600 });
    durationsFor('とり', { charTimingsMs: [0], totalDurationMs: 600 });

    expect(sendMessage).toHaveBeenCalledTimes(3);
  });

  it('does not warn when the timings line up', () => {
    durationsFor('たべる', {
      charTimingsMs: [0, 200, 400],
      totalDurationMs: 600,
    });

    expect(sendMessage).not.toHaveBeenCalled();
  });
});

function durationsFor(reading: string, timing: MoraTimingData) {
  return computeMoraDurations(
    getReadingTokens(reading, undefined, 'none'),
    reading,
    timing
  );
}
