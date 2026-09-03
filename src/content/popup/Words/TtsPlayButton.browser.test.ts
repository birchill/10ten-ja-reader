import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../../options/options.css';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import '../popup.css';

import { TtsPlayButton } from './TtsPlayButton';

vi.mock('../../../common/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, langTag: 'en' }),
}));

afterEach(() => {
  document.body.replaceChildren();
});

describe('TtsPlayButton browser rendering', () => {
  it('keeps its glyph size when Cosmos loads the options styles', () => {
    const container = document.createElement('div');
    container.className = 'theme-light window bundled-fonts';
    container.style.setProperty('--base-font-size', '14px');
    document.body.append(container);

    const controller = {
      state: { kind: 'idle' } as TtsPlaybackState,
      subscribe: () => () => {},
      toggle: () => {},
    };
    act(() => {
      render(h(TtsPlayButton, { controller, entryIndex: 0 }), container);
    });

    const button = container.querySelector('button')!;
    const glyph = button.querySelector('svg')!;

    expect(getComputedStyle(button).boxSizing).toBe('content-box');
    expect(button.getBoundingClientRect().width).toBeCloseTo(40, 1);
    expect(glyph.getBoundingClientRect().width).toBeCloseTo(14, 1);
    expect(glyph.getBoundingClientRect().height).toBeCloseTo(14, 1);
  });

  it('keeps border-box sizing inside the options UI', () => {
    const options = document.createElement('div');
    options.className = 'options';
    const child = document.createElement('div');
    options.append(child);
    document.body.append(options);

    expect(getComputedStyle(child).boxSizing).toBe('border-box');
  });
});
