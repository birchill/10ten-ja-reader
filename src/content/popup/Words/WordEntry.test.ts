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

describe('WordEntry', () => {
  it('renders only the displayed kana headwords, in order', () => {
    const entry = createEntry([
      { ent: 'ひ', romaji: 'hi', match: true },
      { ent: 'ひー', romaji: 'hi-', match: true, i: ['sk'] },
      { ent: 'にち', romaji: 'nichi', match: true },
    ]);

    expect(renderKana(entry)).toBe('ひ、にち');
  });
});

function createEntry(r: WordResult['r']): WordResult {
  return { id: 1, k: [], r, s: [], matchLen: 1 };
}

function renderKana(entry: WordResult): string | null {
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
