import { h, render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WordResult } from '../../../background/search-result';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import { PopupOptionsProvider } from '../options-context';

import { WordEntry, type WordEntryConfig } from './WordEntry';

/**
 * @vitest-environment jsdom
 */

vi.mock('../../../common/i18n', () => ({
  useLocale: () => ({ t: () => '', langTag: 'en' }),
}));

vi.mock('webextension-polyfill', () => ({
  default: {
    i18n: { getMessage: () => '' },
    runtime: { getURL: (path: string) => path },
  },
}));

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi
      .fn()
      .mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('WordEntry playback threading', () => {
  it('renders the play button in an interactive popup', () => {
    const { container } = renderWithPlayback({ interactive: true });

    expect(container.querySelector('.tts-play-button')).not.toBeNull();
  });

  it('hides only the play button in a static popup, still rendering the entry', () => {
    const { container } = renderWithPlayback({ interactive: false });

    expect(container.querySelector('.tts-play-button')).toBeNull();
    expect(container.textContent).toContain('ひ');
  });

  it('hides the play button when no playback controller is supplied', () => {
    const { container } = renderWithPlayback({
      interactive: true,
      withController: false,
    });

    expect(container.querySelector('.tts-play-button')).toBeNull();
  });
});

function renderWithPlayback({
  interactive,
  withController = true,
}: {
  interactive: boolean;
  withController?: boolean;
}) {
  const controller = {
    state: { kind: 'idle' } as TtsPlaybackState,
    subscribe: () => () => {},
    toggle: () => {},
  };

  const entry = createEntry([{ ent: 'ひ', romaji: 'hi', match: true }]);
  const container = document.createElement('div');
  document.body.append(container);

  render(
    h(
      PopupOptionsProvider,
      { interactive },
      h(WordEntry, {
        entry,
        config: baseConfig(),
        selectState: 'unselected',
        tts: withController ? { controller, entryIndex: 0 } : undefined,
      })
    ),
    container
  );

  return { container };
}

function createEntry(r: WordResult['r']): WordResult {
  return { id: 1, k: [], r, s: [], matchLen: 1 };
}

function baseConfig(): WordEntryConfig {
  return {
    accentDisplay: 'none',
    dictLang: 'en',
    bunproDisplay: false,
    posDisplay: 'none',
    showPriority: false,
    showRomaji: false,
    waniKaniVocabDisplay: 'hide',
    readingOnly: true,
  };
}
