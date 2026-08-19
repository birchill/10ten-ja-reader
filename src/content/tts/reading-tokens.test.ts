import { describe, expect, it } from 'vitest';

import {
  coalesceReadingTokens,
  getAccentPos,
  getReadingTokens,
} from './reading-tokens';

describe('getReadingTokens', () => {
  it('splits plain kana into one token per mora', () => {
    expect(getReadingTokens('たべる', undefined, 'binary')).toEqual([
      { text: 'た', charIndex: 0 },
      { text: 'べ', charIndex: 1 },
      { text: 'る', charIndex: 2 },
    ]);
  });

  it('keeps a combined mora in one token', () => {
    expect(getReadingTokens('きゃく', undefined, 'binary')).toEqual([
      { text: 'きゃ', charIndex: 0 },
      { text: 'く', charIndex: 2 },
    ]);
  });

  it('gives each half of a long vowel its own token', () => {
    expect(
      getReadingTokens('コーヒー', undefined, 'binary').map((t) => [
        t.text,
        t.charIndex,
      ])
    ).toEqual([
      ['コ', 0],
      ['ー', 1],
      ['ヒ', 2],
      ['ー', 3],
    ]);
  });

  it('leaves the accent off every token when accents are turned off', () => {
    const tokens = getReadingTokens('おとこ', 2, 'none');

    expect(tokens.every((token) => token.accent === undefined)).toBe(true);
    expect(tokens.every((token) => token.downstep === undefined)).toBe(true);
  });

  it.each([
    ['さくら', 0, ['rise', 'high', 'high']],
    ['め', 0, ['high']],
    ['あめ', 1, ['fall', 'low']],
    ['め', 1, ['fall']],
    ['おとこ', 2, ['rise', 'fall', 'low']],
    ['おとこ', 3, ['rise', 'high', 'fall']],
    ['あいうえお', 3, ['rise', 'high', 'fall', 'low', 'low']],
    ['きゃく', 1, ['fall', 'low']],
    ['コーヒー', 3, ['rise', 'high', 'fall', 'low']],
  ])('assigns binary accents for %s (%i)', (kana, accentPos, accents) => {
    expect(
      getReadingTokens(kana, accentPos, 'binary').map((t) => t.accent)
    ).toEqual(accents);
  });

  it('draws the accent on the last mora when the accent data overruns', () => {
    expect(
      getReadingTokens('たまご', 5, 'binary').map((t) => t.accent)
    ).toEqual(['rise', 'high', 'fall']);
    expect(
      getReadingTokens('たまご', 5, 'downstep').map((t) => t.downstep)
    ).toEqual([undefined, undefined, true]);
  });

  it('marks the downstep after its own mora', () => {
    expect(
      getReadingTokens('おとこ', 2, 'downstep').map((t) => t.downstep)
    ).toEqual([undefined, true, undefined]);
    expect(
      getReadingTokens('きゃく', 1, 'downstep').map((t) => t.downstep)
    ).toEqual([true, undefined]);
  });

  it('gives every mora of a heiban reading an overline in downstep mode', () => {
    const tokens = getReadingTokens('さくら', 0, 'downstep');

    expect(tokens.map((t) => t.accent)).toEqual(['high', 'high', 'high']);
    expect(tokens.every((token) => token.downstep === undefined)).toBe(true);
  });
});

describe('coalesceReadingTokens', () => {
  it('merges the run of high moras into the mora that falls', () => {
    expect(
      coalesceReadingTokens(getReadingTokens('あいうえお', 3, 'binary'))
    ).toEqual([
      { text: 'あ', accent: 'rise' },
      { text: 'いう', accent: 'fall' },
      { text: 'えお', accent: 'low' },
    ]);
  });

  it('keeps the rise out of the following high run', () => {
    expect(
      coalesceReadingTokens(getReadingTokens('さくら', 0, 'binary'))
    ).toEqual([
      { text: 'さ', accent: 'rise' },
      { text: 'くら', accent: 'high' },
    ]);
  });

  it('collapses an unaccented reading into one segment', () => {
    expect(
      coalesceReadingTokens(getReadingTokens('さくら', 0, 'none'))
    ).toEqual([{ text: 'さくら', accent: undefined }]);
  });
});

describe('getAccentPos', () => {
  it('reads the position from either shape of accent data', () => {
    expect(getAccentPos(0)).toBe(0);
    expect(getAccentPos(2)).toBe(2);
    expect(getAccentPos([{ i: 3 }, { i: 1 }])).toBe(3);
  });

  it('has no position without accent data', () => {
    expect(getAccentPos(undefined)).toBeUndefined();
    expect(getAccentPos([])).toBeUndefined();
  });
});
