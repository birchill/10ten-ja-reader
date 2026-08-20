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
    runtime: {
      getURL: (path: string) => path,
      sendMessage: () => Promise.resolve(),
    },
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

describe('WordEntry play button visibility', () => {
  it('hides only the play button in a static popup, still rendering the entry', () => {
    const { container } = renderWithPlayback({ interactive: false });

    expect(
      container.querySelector(
        'button[aria-label="content_play_readings_label"]'
      )
    ).toBeNull();
    expect(container.textContent).toContain('ひ');
  });

  it('hides the play button when no playback controller is supplied', () => {
    const { container } = renderWithPlayback({
      interactive: true,
      withController: false,
    });

    expect(
      container.querySelector(
        'button[aria-label="content_play_readings_label"]'
      )
    ).toBeNull();
    expect(container.textContent).toContain('ひ');
  });

  it('still shows the karaoke overlay while playing in a static popup', () => {
    const { container } = renderWithPlayback({
      interactive: false,
      state: {
        kind: 'playing',
        activeEntryIndex: 0,
        readingIndex: 0,
        moraTiming: { charTimingsMs: [0], totalDurationMs: 200 },
        startedAt: performance.now(),
      },
    });

    expect(container.querySelector('.tts-play-button')).toBeNull();
    expect(container.querySelector('[aria-hidden]')).not.toBeNull();
  });
});

function renderWithPlayback({
  interactive,
  withController = true,
  state = { kind: 'idle' },
}: {
  interactive: boolean;
  withController?: boolean;
  state?: TtsPlaybackState;
}) {
  const controller = { state, subscribe: () => () => {}, toggle: () => {} };

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
