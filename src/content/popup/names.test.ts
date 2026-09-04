import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { NameResult } from '../../background/search-result';

import type { TtsPlaybackHandle } from '../tts-playback-controller';

import { unmountPopupComponents } from './mount';
import { renderNamesEntries } from './names';

/**
 * @vitest-environment jsdom
 */

vi.mock('../../common/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, langTag: 'en' }),
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
});

it('renders a play button in a standalone name popup', () => {
  const popupHost = document.createElement('div');
  const controller: TtsPlaybackHandle = {
    state: { kind: 'idle' },
    subscribe: () => () => {},
    toggle: () => {},
  };

  try {
    const names = renderNamesEntries({
      entries: [createName()],
      matchLen: 2,
      more: false,
      options: {
        copyState: { kind: 'inactive' },
        fontSize: 'normal',
        fxData: undefined,
        interactive: true,
        preferredUnits: 'metric',
        ttsPlayback: controller,
      },
      popupHost,
    });

    expect(
      names.querySelector('button[aria-label="content_play_readings_label"]')
    ).not.toBeNull();
  } finally {
    unmountPopupComponents(popupHost);
  }
});

it('hides playback controls in a static standalone name popup', () => {
  const popupHost = document.createElement('div');
  const controller: TtsPlaybackHandle = {
    state: { kind: 'idle' },
    subscribe: () => () => {},
    toggle: vi.fn<(entryIndex: number) => void>(),
  };

  try {
    const names = renderNamesEntries({
      entries: [createName()],
      matchLen: 2,
      more: false,
      options: {
        copyState: { kind: 'inactive' },
        fontSize: 'normal',
        fxData: undefined,
        interactive: false,
        preferredUnits: 'metric',
        ttsPlayback: controller,
      },
      popupHost,
    });

    expect(names.textContent).toContain('さとう');
    expect(
      names.querySelector('button[aria-label="content_play_readings_label"]')
    ).toBeNull();
  } finally {
    unmountPopupComponents(popupHost);
  }
});

function createName(): NameResult {
  return {
    id: 1,
    k: ['佐藤'],
    r: ['さとう'],
    tr: [{ det: ['Sato'], type: ['surname'] }],
    matchLen: 2,
  };
}
