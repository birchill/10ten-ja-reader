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

describe('Options and popup styles coexisting in Cosmos', () => {
  it('keeps the play button glyph size when both stylesheets load', () => {
    const { button, glyph } = mountButton({ kind: 'idle' });

    expect(getComputedStyle(button).boxSizing).toBe('content-box');
    expect(button.getBoundingClientRect().width).toBeCloseTo(40, 1);
    expect(glyph.getBoundingClientRect().width).toBeCloseTo(14, 1);
    expect(glyph.getBoundingClientRect().height).toBeCloseTo(14, 1);
  });

  it('preserves options border-box sizing after scoping its reset', () => {
    const options = document.createElement('div');
    options.className = 'options';
    const child = document.createElement('div');
    options.append(child);
    document.body.append(options);

    expect(getComputedStyle(child).boxSizing).toBe('border-box');
  });
});

function mountButton(state: TtsPlaybackState) {
  const container = document.createElement('div');
  container.className = 'theme-light window bundled-fonts';
  container.style.setProperty('--base-font-size', '14px');
  document.body.append(container);

  const controller = { state, subscribe: () => () => {}, toggle: () => {} };
  act(() => {
    render(h(TtsPlayButton, { controller, entryIndex: 0 }), container);
  });

  const button = container.querySelector('button')!;
  const glyph = button.querySelector('svg')!;

  return { button, glyph };
}
