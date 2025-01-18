import { describe, expect, it } from 'vitest';

import { normalizeInput } from './normalize-input';

describe('normalizeInput', () => {
  it('trims input at the first out-of-range character', () => {
    expect(normalizeInput('ｶﾞｰﾃﾞﾝ。')).toEqual(['ガーデン', [0, 2, 3, 5, 6]]);
    expect(normalizeInput('。')).toEqual(['', []]);
    expect(normalizeInput('')).toEqual(['', []]);
    expect(normalizeInput(' ')).toEqual(['', []]);
    expect(normalizeInput(' 。')).toEqual(['', []]);
    expect(normalizeInput('あ')).toEqual(['あ', [0, 1]]);
  });

  it('strips zero-width non-joiners', () => {
    expect(normalizeInput('ｶﾞ\u200cｰ\u200cﾃﾞ\u200cﾝ\u200c。')).toEqual([
      'ガーデン',
      [0, 3, 5, 8, 10],
    ]);
    expect(
      normalizeInput('ｶﾞ\u200cｰ\u200cﾃﾞ\u200cﾝ\u200c\u200c\u200c。')
    ).toEqual(['ガーデン', [0, 3, 5, 8, 12]]);
    expect(normalizeInput('\u200cｶﾞ\u200cｰ\u200cﾃﾞ\u200cﾝ\u200c。')).toEqual([
      'ガーデン',
      [1, 4, 6, 9, 11],
    ]);
    expect(normalizeInput('\u200c\u200c。')).toEqual(['', []]);
    expect(normalizeInput('\u200c\u200c')).toEqual(['', []]);
    expect(normalizeInput('\u200c')).toEqual(['', []]);
  });

  it('preserves non-BMP characters', () => {
    // Because inputLengths deals with 16-bit code points we _should_ return a
    // value for each part of the initial surrogate pair.
    expect(normalizeInput('𠏹沢')).toEqual(['𠏹沢', [0, 0, 2, 3]]);
  });
});
