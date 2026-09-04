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
  it('keeps its glyph size when options and popup styles load together', () => {
    const { button, glyph } = mountButton({ kind: 'idle' });

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

  it("renders a 10px error badge at the glyph's top-right corner", () => {
    const { button, glyph } = mountButton({
      kind: 'error',
      activeEntryIndex: 0,
    });
    const badge = button.querySelector('.tts-error-badge')!;
    const glyphRect = glyph.getBoundingClientRect();
    const badgeRect = badge.getBoundingClientRect();

    expect(badgeRect.width).toBeCloseTo(10, 1);
    expect(badgeRect.height).toBeCloseTo(10, 1);
    expect(badgeRect.x + badgeRect.width / 2).toBeCloseTo(glyphRect.right, 1);
    expect(badgeRect.y + badgeRect.height / 2).toBeCloseTo(glyphRect.top, 1);
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
