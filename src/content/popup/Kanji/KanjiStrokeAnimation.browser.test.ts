import type { KanjiResult } from '@birchill/jpdict-idb';
import { createRef, h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PopupOptionsProvider } from '../options-context';
import '../popup.css';

import { KanjiList } from './KanjiList';
import type { KanjiStrokeAnimationHandle } from './KanjiStrokeAnimation';

vi.mock('../../../common/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, langTag: 'en' }),
}));

vi.mock('webextension-polyfill', () => ({
  default: {
    i18n: { getMessage: () => '' },
    runtime: { getURL: (path: string) => path },
  },
}));

afterEach(() => {
  for (const container of Array.from(document.body.children)) {
    act(() => render(null, container));
  }
  document.body.replaceChildren();
});

describe('Kanji stroke playback', () => {
  it('uses the same playback state for the shortcut handle and play/stop button', () => {
    const { container, playbackRef } = mountList();
    expect(titles(container)).toEqual(['content_stroke_animation_play (p)']);
    expect(playbackAnimations(container)).toHaveLength(0);

    act(() => playbackRef.current!.toggle());
    const keyboardAnimations = playbackAnimations(container);
    expect(keyboardAnimations).toHaveLength(2);
    expect(
      keyboardAnimations.every((animation) => animation.playState === 'running')
    ).toBe(true);
    expect(titles(container)).toEqual(['content_stroke_animation_stop (p)']);

    clickPlayback(container);
    expect(
      keyboardAnimations.every((animation) => animation.playState === 'idle')
    ).toBe(true);
    expect(playbackAnimations(container)).toHaveLength(0);
    expect(titles(container)).toEqual(['content_stroke_animation_play (p)']);

    clickPlayback(container);
    const clickAnimations = playbackAnimations(container);
    expect(clickAnimations).toHaveLength(2);
    expect(
      clickAnimations.every((animation) => animation.playState === 'running')
    ).toBe(true);

    act(() => playbackRef.current!.toggle());
    expect(
      clickAnimations.every((animation) => animation.playState === 'idle')
    ).toBe(true);
    expect(titles(container)).toEqual(['content_stroke_animation_play (p)']);
  });

  it('shows the static character outside playback when pointer interaction is disabled', () => {
    const { container, playbackRef } = mountList({ interactive: false });
    expect(container.querySelector('[lang="ja"]')?.textContent).toBe('一');
    expect(titles(container)).toEqual([]);

    act(() => playbackRef.current!.toggle());
    const animations = playbackAnimations(container);
    expect(animations).toHaveLength(1);
    expect(titles(container)).toEqual(['content_stroke_animation_stop (p)']);

    act(() => playbackRef.current!.toggle());
    expect(
      animations.every((animation) => animation.playState === 'idle')
    ).toBe(true);
    expect(container.querySelector('[lang="ja"]')?.textContent).toBe('一');
    expect(titles(container)).toEqual([]);
  });

  it.each([false, true])(
    'preserves the character and content dimensions during noninteractive playback (expanded: %s)',
    (expanded) => {
      const { container, playbackRef } = mountList({
        entries: [makeKanji('一'), makeKanji('二')],
        interactive: false,
      });
      container.dataset.type = 'expandable';
      if (expanded) {
        container.dataset.expanded = '';
      }
      const list = container.firstElementChild!;
      const character = () =>
        list.firstElementChild!.firstElementChild!.firstElementChild!
          .firstElementChild!;
      const before = character().getBoundingClientRect();
      const contentBefore = list.getBoundingClientRect();
      expect(before.width).toBeGreaterThan(0);
      expect(before.height).toBeGreaterThan(0);

      act(() => playbackRef.current!.toggle());
      expect(character().getBoundingClientRect().width).toBeCloseTo(
        before.width,
        1
      );
      expect(character().getBoundingClientRect().height).toBeCloseTo(
        before.height,
        1
      );
      expect(list.getBoundingClientRect().height).toBeCloseTo(
        contentBefore.height,
        1
      );
      expect(list.getBoundingClientRect().width).toBeCloseTo(
        contentBefore.width,
        1
      );
      expect(
        container
          .querySelector('title')!
          .closest('svg')!
          .getBoundingClientRect().height
      ).toBe(0);

      act(() => playbackRef.current!.toggle());
      expect(character().getBoundingClientRect().width).toBeCloseTo(
        before.width,
        1
      );
      expect(character().getBoundingClientRect().height).toBeCloseTo(
        before.height,
        1
      );
      expect(list.getBoundingClientRect().height).toBeCloseTo(
        contentBefore.height,
        1
      );
    }
  );

  it('stops playback through the handle without unmounting the character', () => {
    const { container, playbackRef } = mountList({ interactive: false });
    act(() => playbackRef.current!.toggle());
    const animations = playbackAnimations(container);
    expect(animations).toHaveLength(1);

    act(() => playbackRef.current!.stop());
    expect(
      animations.every((animation) => animation.playState === 'idle')
    ).toBe(true);
    expect(container.querySelector('[lang="ja"]')?.textContent).toBe('一');
    expect(titles(container)).toEqual([]);
    expect(playbackRef.current).not.toBeNull();

    act(() => playbackRef.current!.stop());
    expect(playbackAnimations(container)).toHaveLength(0);
    act(() => playbackRef.current!.toggle());
    expect(playbackAnimations(container)).toHaveLength(1);
  });

  it('clears the playback handle and cancels animations on unmount', () => {
    const { container, playbackRef } = mountList();
    act(() => playbackRef.current!.toggle());
    const animations = playbackAnimations(container);
    expect(animations).toHaveLength(2);

    act(() => render(null, container));
    expect(playbackRef.current).toBeNull();
    expect(
      animations.every((animation) => animation.playState === 'idle')
    ).toBe(true);
  });

  it('advertises and controls only the first entry, using the configured shortcut', () => {
    const { container, playbackRef } = mountList({
      entries: [makeKanji('一'), makeKanji('二')],
      shortcuts: ['q'],
    });
    expect(titles(container)).toEqual([
      'content_stroke_animation_play (q)',
      'content_stroke_animation_play',
    ]);

    act(() => playbackRef.current!.toggle());
    expect(titles(container)).toEqual([
      'content_stroke_animation_stop (q)',
      'content_stroke_animation_play',
    ]);
    expect(playbackAnimations(container)).toHaveLength(2);
  });

  it('omits shortcut hints when the shortcut is disabled', () => {
    const { container } = mountList({ shortcuts: [] });
    expect(titles(container)).toEqual(['content_stroke_animation_play']);
    clickPlayback(container);
    expect(titles(container)).toEqual(['content_stroke_animation_stop']);
  });

  it('does not redirect the shortcut to a later entry when the first has no stroke data', () => {
    const first = makeKanji('一');
    delete first.st;
    const { container, playbackRef } = mountList({
      entries: [first, makeKanji('二')],
    });
    expect(playbackRef.current).toBeNull();
    expect(titles(container)).toEqual(['content_stroke_animation_play']);
    expect(playbackAnimations(container)).toHaveLength(0);
  });
});

function mountList({
  entries = [makeKanji('一')],
  interactive = true,
  shortcuts = ['p'],
}: {
  entries?: Array<KanjiResult>;
  interactive?: boolean;
  shortcuts?: Array<string>;
} = {}) {
  const container = document.createElement('div');
  container.className = 'theme-light window system-fonts';
  container.style.setProperty('--base-font-size', '14px');
  container.style.width = '400px';
  document.body.append(container);
  const playbackRef = createRef<KanjiStrokeAnimationHandle>();
  act(() => {
    render(
      h(
        PopupOptionsProvider,
        { interactive },
        h(KanjiList, {
          copyState: { kind: 'inactive' },
          entries,
          kanjiReferences: [],
          playbackRef,
          playbackShortcuts: shortcuts,
          showComponents: false,
        })
      ),
      container
    );
  });
  return { container, playbackRef };
}

function makeKanji(c: string): KanjiResult {
  return {
    c,
    r: {},
    m: [],
    m_lang: 'en',
    rad: { x: { r: 1, c: '一', na: [], m: [], m_lang: 'en' } },
    refs: {},
    misc: { sc: 1 },
    st: 'M10 50L90 50',
    comp: [],
    cf: [],
  };
}

function titles(container: HTMLElement): Array<string | null> {
  return Array.from(
    container.querySelectorAll('title'),
    (title) => title.textContent
  );
}

function clickPlayback(container: HTMLElement) {
  act(() => {
    container
      .querySelector('title')!
      .parentElement!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function playbackAnimations(container: HTMLElement): Array<Animation> {
  return container
    .getAnimations({ subtree: true })
    .filter(
      (animation) => animation.effect?.getTiming().iterations === Infinity
    );
}
