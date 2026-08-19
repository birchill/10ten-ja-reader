import { describe, expect, it } from 'vitest';

import type { WordResult } from '../background/search-result';

import { getDisplayedKana } from './displayed-kana';

describe('getDisplayedKana', () => {
  it('shows the matching kana headwords when the lookup matched on kanji', () => {
    const entry = createEntry([
      { ent: 'ひ', romaji: 'hi', match: true },
      { ent: 'にち', romaji: 'nichi', match: true },
    ]);

    expect(kanaOf(getDisplayedKana(entry))).toEqual(['ひ', 'にち']);
  });

  it('shows only the matching kana headword when the lookup matched on kana', () => {
    const entry = createEntry([
      { ent: 'ひ', romaji: 'hi', match: true, matchRange: [0, 1] },
      { ent: 'にち', romaji: 'nichi', match: false },
    ]);

    expect(kanaOf(getDisplayedKana(entry))).toEqual(['ひ']);
  });

  it('adds the regular kana headword when every kana match is irregular', () => {
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

  it('excludes search-only kana headwords even when they matched', () => {
    const entry = createEntry([
      { ent: 'ひ', romaji: 'hi', match: true, matchRange: [0, 1] },
      { ent: 'ひー', romaji: 'hi-', match: true, i: ['sk'] },
    ]);

    expect(kanaOf(getDisplayedKana(entry))).toEqual(['ひ']);
  });

  it('excludes a search-only kana headword from the irregular fallback too', () => {
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
