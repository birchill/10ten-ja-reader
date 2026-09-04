import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import type { WordResult } from '../../background/search-result';

import type { TtsPlaybackState } from '../tts-playback-controller';

import { WordEntry, type WordEntryConfig } from './Words/WordEntry';
import { PopupOptionsProvider } from './options-context';
import './popup.css';

vi.mock('../../common/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, langTag: 'en' }),
}));

afterEach(() => {
  document.body.replaceChildren();
});

describe('TTS highlight colors', () => {
  it('uses the blue theme highlight for a hovered word row', async () => {
    const container = document.createElement('div');
    container.className = 'container interactive';
    const windowElement = document.createElement('div');
    windowElement.className = 'window theme-blue bundled-fonts';
    windowElement.dataset.type = 'window';
    windowElement.style.setProperty('--base-font-size', '14px');
    const content = document.createElement('div');
    content.className = 'content';
    windowElement.append(content);
    container.append(windowElement);
    document.body.append(container);

    const controller = {
      state: { kind: 'idle' } as TtsPlaybackState,
      subscribe: () => () => {},
      toggle: () => {},
    };
    act(() => {
      render(
        h(
          PopupOptionsProvider,
          { interactive: true },
          h(WordEntry, {
            entry: createEntry(),
            config: baseConfig(),
            selectState: 'unselected',
            tts: { controller, entryIndex: 0 },
          })
        ),
        content
      );
    });

    const button = content.querySelector<HTMLButtonElement>(
      'button[aria-label="content_play_readings_label"]'
    )!;
    expect(getComputedStyle(button).color).toBe('rgb(255, 255, 255)');

    const supportsHover = matchMedia('(hover: hover)').matches;
    await page.elementLocator(button).hover();

    expect(getComputedStyle(button).color).toBe(
      supportsHover ? 'rgb(68, 110, 160)' : 'rgb(255, 255, 255)'
    );
  });
});

function createEntry(): WordResult {
  return {
    id: 1,
    k: [],
    r: [{ ent: 'きねん', romaji: 'kinen', match: true }],
    s: [],
    matchLen: 3,
  };
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
