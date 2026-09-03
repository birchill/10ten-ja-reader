import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';

import type { TtsPlaybackState } from '../tts-playback-controller';

import { TtsPlayButton } from './Words/TtsPlayButton';
import './popup.css';

vi.mock('../../common/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, langTag: 'en' }),
}));

afterEach(() => {
  document.body.replaceChildren();
});

describe('TTS highlight colors', () => {
  it('adapts the blue playback ink to the row surface', async () => {
    const root = document.createElement('div');
    root.className =
      'theme-blue tp:bg-(--bg-color) tp:text-(--text-color) tp:p-4';

    const row = document.createElement('div');
    row.className =
      'tp:p-4 tp:hover:bg-(--hover-bg) tp:hover:[--tts-highlight:var(--selected-highlight)]';

    root.append(row);
    document.body.append(root);

    const controller = {
      state: { kind: 'idle' } as TtsPlaybackState,
      subscribe: () => () => {},
      toggle: () => {},
    };
    act(() => {
      render(h(TtsPlayButton, { controller, entryIndex: 0 }), row);
    });

    const button = row.querySelector('button')!;
    const spokenReading = document.createElement('span');
    spokenReading.style.color = 'var(--tts-highlight)';
    spokenReading.textContent = 'きねん';
    row.append(spokenReading);

    expect(getComputedStyle(button).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(spokenReading).color).toBe('rgb(188, 223, 254)');

    const supportsHover = matchMedia('(hover: hover)').matches;
    await page.elementLocator(button).hover();

    expect(getComputedStyle(button).color).toBe(
      supportsHover ? 'rgb(68, 110, 160)' : 'rgb(255, 255, 255)'
    );
    expect(getComputedStyle(spokenReading).color).toBe(
      supportsHover ? 'rgb(68, 110, 160)' : 'rgb(188, 223, 254)'
    );
  });
});
