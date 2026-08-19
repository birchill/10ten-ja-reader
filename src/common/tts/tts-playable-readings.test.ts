import { describe, expect, it } from 'vitest';

import { getPlayableReadingIndices } from './tts-playable-readings';
import type { TtsClipRequest } from './tts-request';

describe('getPlayableReadingIndices', () => {
  it('returns the first occurrence of each distinct-sounding reading, in order', () => {
    const readings = [
      r('コーヒー'), // 0 — kept
      r('こーひー'), // 1 — katakana/hiragana dup of 0
      r('マリー・アントワネット'), // 2 — kept
      r('マリーアントワネット'), // 3 — middle-dot-only dup of 2
      r('ちがう'), // 4 — kept
    ];
    expect(getPlayableReadingIndices(readings)).toEqual([0, 2, 4]);
  });

  it('keeps a long-vowel mark distinct from an explicit vowel (out of scope)', () => {
    expect(getPlayableReadingIndices([r('コーヒー'), r('コオヒイ')])).toEqual([
      0, 1,
    ]);
  });

  it('keeps one same-kana reading per distinct accent, dropping repeat-accent and accent-less variants', () => {
    expect(
      getPlayableReadingIndices([
        r('はし', 0),
        r('はし', 2),
        r('はし', 0),
        r('はし'),
      ])
    ).toEqual([0, 1]);
  });

  it('drops an accent-less reading in favour of an accented same-kana variant, regardless of order', () => {
    expect(
      getPlayableReadingIndices([r('テストラン'), r('テスト・ラン', 4)])
    ).toEqual([1]);
    expect(
      getPlayableReadingIndices([r('テスト・ラン', 4), r('テストラン')])
    ).toEqual([0]);
  });

  it('keeps an accent-less reading when no accented same-kana variant exists', () => {
    expect(getPlayableReadingIndices([r('テストラン'), r('はし', 0)])).toEqual([
      0, 1,
    ]);
  });

  it('returns ascending indices when sound-alike readings interleave with others', () => {
    expect(
      getPlayableReadingIndices([r('はし', 0), r('べつ'), r('はし', 2)])
    ).toEqual([0, 1, 2]);
  });
});

const r = (reading: string, pitchAccentPos?: number): TtsClipRequest =>
  pitchAccentPos === undefined ? { reading } : { reading, pitchAccentPos };
