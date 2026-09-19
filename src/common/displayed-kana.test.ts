import { describe, expect, it } from 'vitest';

import type { WordResult } from '../background/search-result';

import { getDisplayedKana } from './displayed-kana';

describe('getDisplayedKana', () => {
  it('returns all matching kana headwords for a kanji match', () => {
    const entry = createEntry([
      { ent: 'ひ', romaji: 'hi', match: true },
      { ent: 'にち', romaji: 'nichi', match: true },
    ]);

    expect(kanaOf(getDisplayedKana(entry))).toEqual(['ひ', 'にち']);
  });

  it('returns only the matching kana headword for a kana match', () => {
    const entry = createEntry([
      { ent: 'ひ', romaji: 'hi', match: true, matchRange: [0, 1] },
      { ent: 'にち', romaji: 'nichi', match: false },
    ]);

    expect(kanaOf(getDisplayedKana(entry))).toEqual(['ひ']);
  });

  it('includes the regular kana headword when all kana matches are irregular', () => {
    const entry = createEntry([
      {
        ent: 'ふいんき',
        romaji: 'fuinki',
        match: true,
        matchRange: [0, 4],
        i: ['ik'],
      },
      { ent: 'ふんいき', romaji: "fun'iki", match: false },
    ]);

    expect(kanaOf(getDisplayedKana(entry))).toEqual(['ふいんき', 'ふんいき']);
  });

  it('excludes matched search-only kana headwords', () => {
    const entry = createEntry([
      { ent: 'ひ', romaji: 'hi', match: true, matchRange: [0, 1] },
      { ent: 'ひー', romaji: 'hi-', match: true, i: ['sk'] },
    ]);

    expect(kanaOf(getDisplayedKana(entry))).toEqual(['ひ']);
  });

  it('excludes search-only kana headwords from the irregular fallback', () => {
    const entry = createEntry([
      {
        ent: 'ふいんき',
        romaji: 'fuinki',
        match: true,
        matchRange: [0, 4],
        i: ['ik'],
      },
      { ent: 'ふんいき', romaji: "fun'iki", match: false },
      { ent: 'ふいんきー', romaji: 'x', match: true, i: ['sk'] },
    ]);

    expect(kanaOf(getDisplayedKana(entry))).toEqual(['ふいんき', 'ふんいき']);
  });
});

function createEntry(r: WordResult['r']): WordResult {
  return { id: 1, k: [], r, s: [], matchLen: 1 };
}

function kanaOf(r: WordResult['r']): Array<string> {
  return r.map((k) => k.ent);
}
