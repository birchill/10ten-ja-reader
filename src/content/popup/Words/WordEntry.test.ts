import { h, render } from 'preact';
import { describe, expect, it, vi } from 'vitest';

import type { WordResult } from '../../../background/search-result';

import { WordEntry, type WordEntryConfig } from './WordEntry';

/**
 * @vitest-environment jsdom
 */

vi.mock('../../../common/i18n', () => ({
  useLocale: () => ({ t: () => '', langTag: 'en' }),
}));

describe('WordEntry kana cluster', () => {
  it('renders every matching kana headword, in order, when matched on kanji', () => {
    const entry = createEntry([
      { ent: 'ひ', romaji: 'hi', match: true },
      { ent: 'にち', romaji: 'nichi', match: true },
    ]);

    expect(renderKanaCluster(entry)).toBe('ひ、にち');
  });

  it('falls back to the regular kana headword when every match is irregular', () => {
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

    expect(renderKanaCluster(entry)).toBe('ふいんき(ik)、ふんいき');
  });

  it('excludes a search-only kana headword even when it matched', () => {
    const entry = createEntry([
      { ent: 'ひ', romaji: 'hi', match: true, matchRange: [0, 1] },
      { ent: 'ひー', romaji: 'hi-', match: true, i: ['sk'] },
    ]);

    expect(renderKanaCluster(entry)).toBe('ひ');
  });
});

function createEntry(r: WordResult['r']): WordResult {
  return { id: 1, k: [], r, s: [], matchLen: 1 };
}

function renderKanaCluster(entry: WordResult): string | null {
  const config: WordEntryConfig = {
    accentDisplay: 'none',
    dictLang: 'en',
    bunproDisplay: false,
    posDisplay: 'none',
    showPriority: false,
    showRomaji: false,
    waniKaniVocabDisplay: 'hide',
    readingOnly: true,
  };

  const container = document.createElement('div');
  render(h(WordEntry, { entry, config, selectState: 'unselected' }), container);
  return container.textContent;
}
