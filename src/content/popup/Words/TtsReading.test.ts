import type { WordResult } from '@birchill/jpdict-idb';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccentDisplay } from '../../../common/content-config-params';
import type { MoraTimingData } from '../../../common/tts/tts-request';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import { TtsReading, type TtsReadingProps } from './TtsReading';

/**
 * @vitest-environment jsdom
 */

const STARTED_AT = 1000;

// A mora may only name a border style where it draws a line: nothing resets
// `border-width` in this popup, so a bare `border-style` would pad the mora out
// with the browser's default `medium` width.
const SOLID = 'tp:border-solid tp:border-(--tts-highlight)';

// たべる: three single-codepoint moras, each running 200ms.
const evenTiming: MoraTimingData = {
  charTimingsMs: [0, 200, 400],
  totalDurationMs: 600,
};

beforeEach(() => {
  installMatchMedia();
  vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('TtsReading', () => {
  it('keeps one visible reading mounted and only animates its own playback', () => {
    const { glyphs, publish } = mount();
    const idleGlyphs = glyphs();
    expect(idleGlyphs.map((glyph) => glyph.textContent)).toEqual([
      'た',
      'べ',
      'る',
    ]);
    expect(growAnimations(idleGlyphs)).toEqual(['', '', '']);

    publish(playing({ activeEntryIndex: 1 }));
    expect(growAnimations(glyphs())).toEqual(['', '', '']);

    publish(playing({ readingIndex: 1 }));
    expect(growAnimations(glyphs())).toEqual(['', '', '']);

    publish({
      kind: 'loading',
      activeEntryIndex: 0,
      readingIndex: 0,
      audioStarted: false,
    });
    expect(growAnimations(glyphs())).toEqual(['', '', '']);

    publish(playing());
    expect(growAnimations(glyphs())).toEqual([
      'tts-mora-grow-a 200ms ease-in-out 0ms',
      'tts-mora-grow-a 200ms ease-in-out 200ms',
      'tts-mora-grow-a 200ms ease-in-out 400ms',
    ]);
    expect(glyphs()).toEqual(idleGlyphs);
  });

  it('hides the border-only overlay from assistive tech and the pointer', () => {
    const { accentOverlay, publish } = mount();

    publish(playing());

    expect(accentOverlay()!.getAttribute('aria-hidden')).toBe('true');
    expect(accentOverlay()!.classList.contains('tp:pointer-events-none')).toBe(
      true
    );
  });

  it('draws the accent borders on a plain inline box, as the static reading does', () => {
    const { groups, publish } = mount({ kana: { ent: 'たべる', a: 0 } });

    publish(playing());

    // An inline-block here would size the border to the line box and lift
    // every accent line off the glyphs.
    expect(groups().map((group) => group.getAttribute('class'))).toEqual([
      'tp:border-0 tp:border-b-(length:--border-width) tp:border-r-(length:--border-width)',
      'tp:border-0 tp:border-t-(length:--border-width)',
    ]);
    expect(groups().map((group) => group.textContent)).toEqual(['た', 'べる']);
  });

  it('colors and grows each single visible glyph on its own timing', () => {
    const { glyphs, moras, publish } = mount();

    publish(playing());

    expect(moras().map((mora) => mora.style.opacity)).toEqual(['0', '0', '0']);
    expect(revealAnimations(moras())).toEqual([
      'tts-mora-reveal-a 200ms ease-in-out 0ms forwards',
      'tts-mora-reveal-a 200ms ease-in-out 200ms forwards',
      'tts-mora-reveal-a 200ms ease-in-out 400ms forwards',
    ]);
    expect(growAnimations(glyphs())).toEqual([
      'tts-mora-grow-a 200ms ease-in-out 0ms',
      'tts-mora-grow-a 200ms ease-in-out 200ms',
      'tts-mora-grow-a 200ms ease-in-out 400ms',
    ]);
    expect(colorAnimations(glyphs())).toEqual([
      'tts-mora-highlight-a 200ms ease-in-out 0ms forwards',
      'tts-mora-highlight-a 200ms ease-in-out 200ms forwards',
      'tts-mora-highlight-a 200ms ease-in-out 400ms forwards',
    ]);
    expect(glyphs().map((glyph) => glyph.style.scale)).toEqual(['1', '1', '1']);
  });

  it.each([
    [0, ['0ms', '200ms', '400ms']],
    [50, ['-50ms', '150ms', '350ms']],
    [250, ['-250ms', '-50ms', '150ms']],
    [599, ['-599ms', '-399ms', '-199ms']],
    // Past the end of the clip every mora is already filled in.
    [900, ['-900ms', '-700ms', '-500ms']],
  ])(
    'shifts the delays by the %ims already spoken when it mounts',
    (elapsedMs, delays) => {
      vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + elapsedMs);

      const { glyphs, moras } = mount({ initialState: playing() });

      expect(revealAnimations(moras())).toEqual(
        delays.map(
          (delay) => `tts-mora-reveal-a 200ms ease-in-out ${delay} forwards`
        )
      );
      expect(growAnimations(glyphs())).toEqual(
        delays.map((delay) => `tts-mora-grow-a 200ms ease-in-out ${delay}`)
      );
    }
  );

  it('holds the delays steady when the popup re-renders', () => {
    const { glyphs, rerender } = mount({ initialState: playing() });
    const before = growAnimations(glyphs());

    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 400);
    rerender();

    expect(growAnimations(glyphs())).toEqual(before);
  });

  it('draws solid accent borders sized to the base layer', () => {
    const { layer, moras, publish } = mount({
      kana: { ent: 'たべる', a: 2 },
      accentDisplay: 'binary',
    });

    publish(playing());

    expect(layer()!.getAttribute('style')).toBe('--border-width: 1.5px;');
    expect(layer()!.getAttribute('class')).toBe(
      'tp:inline-block tp:mb-1 tp:*:m-0 tp:*:text-[90%]'
    );
    expect(moras().map((mora) => mora.getAttribute('class'))).toEqual([
      `${SOLID} tp:border-0 tp:border-b-(length:--border-width) tp:border-r-(length:--border-width)`,
      `${SOLID} tp:border-0 tp:border-t-(length:--border-width) tp:border-r-(length:--border-width)`,
      `${SOLID} tp:border-0 tp:border-b-(length:--border-width)`,
    ]);
  });

  it('matches the high-contrast border width', () => {
    const { layer, publish } = mount({
      kana: { ent: 'たべる', a: 2 },
      accentDisplay: 'binary-hi-contrast',
    });

    publish(playing());

    expect(layer()!.getAttribute('style')).toBe('--border-width: 2px;');
  });

  it('colors the downstep mark without moving it', () => {
    const { accentOverlay, glyphMoras, publish } = mount({
      kana: { ent: 'たべる', a: 2 },
      accentDisplay: 'downstep',
    });

    publish(playing());

    // A downstep reading draws no pitch line, so it gets no ink layer at all.
    expect(accentOverlay()).toBeUndefined();

    const downstep = glyphMoras()[1].children[1] as HTMLElement;
    expect(downstep.textContent).toBe('ꜜ');
    expect(downstep.style.animation).toBe(
      'tts-mora-highlight-a 200ms ease-in-out 200ms forwards'
    );
    expect(downstep.style.transformOrigin).toBe('');
  });

  it('fills the heiban overline mora by mora in downstep mode', () => {
    const { layer, moras, publish } = mount({
      kana: { ent: 'たべる', a: 0 },
      accentDisplay: 'downstep',
    });

    publish(playing());

    // Downstep readings sit in the running text, so the overlay must not
    // scale them the way the binary layer does.
    expect(layer()!.getAttribute('class')).toBeNull();
    expect(layer()!.getAttribute('style')).toBe('--border-width: 1.5px;');
    expect(moras().map((mora) => mora.getAttribute('class'))).toEqual([
      `${SOLID} tp:border-0 tp:border-t-(length:--border-width)`,
      `${SOLID} tp:border-0 tp:border-t-(length:--border-width)`,
      `${SOLID} tp:border-0 tp:border-t-(length:--border-width)`,
    ]);
  });

  it('mounts no ink layer when accents are turned off', () => {
    const { accentOverlay, glyphs, publish } = mount({
      kana: { ent: 'たべる', a: 2 },
      accentDisplay: 'none',
    });

    publish(playing());

    expect(accentOverlay()).toBeUndefined();
    expect(glyphs().map((glyph) => glyph.textContent)).toEqual([
      'た',
      'べ',
      'る',
    ]);
    expect(growAnimations(glyphs()).every(Boolean)).toBe(true);
  });

  it('fades the color and accent ink back over 400ms', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { accentOverlay, glyphs, moras, publish } = mount();

    publish(playing());
    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 600);
    publish({ kind: 'idle' });

    expect(accentOverlay()!.style.animation).toBe(
      'fade-out 400ms ease-in-out forwards'
    );
    expect(colorAnimations(glyphs())).toEqual([
      'tts-mora-unhighlight 400ms ease-in-out 0ms forwards',
      'tts-mora-unhighlight 400ms ease-in-out 0ms forwards',
      'tts-mora-unhighlight 400ms ease-in-out 0ms forwards',
    ]);
    expect(growAnimations(glyphs())).toEqual(['', '', '']);

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(accentOverlay()!.style.animation).not.toBe('');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(accentOverlay()!.style.animation).toBe('');
    expect(growAnimations(glyphs())).toEqual(['', '', '']);
    expect(revealAnimations(moras())).toEqual(['', '', '']);
  });

  it('stops future mora motion when playback ends early', () => {
    const { glyphs, moras, publish } = mount();

    publish(playing());
    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 250);
    publish({ kind: 'idle' });

    expect(colorAnimations(glyphs())).toEqual([
      'tts-mora-unhighlight 400ms ease-in-out 0ms forwards',
      'tts-mora-unhighlight 400ms ease-in-out -300ms forwards',
      '',
    ]);
    expect(growAnimations(glyphs())).toEqual([
      '',
      'tts-mora-grow-a 200ms ease-in-out 200ms',
      '',
    ]);
    expect(moras().map((mora) => mora.style.opacity)).toEqual(['1', '0', '0']);
  });

  it('freezes the half-revealed mora instead of brightening it while fading', () => {
    const { moras, publish } = mount();

    publish(playing());
    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 250);
    publish({ kind: 'idle' });

    // Mora 1 is 50ms into its 200ms reveal. Running it on while the layer
    // fades would multiply two curves and flash the ink brighter than it was.
    expect(revealAnimations(moras())).toEqual([
      '',
      'tts-mora-reveal-a 200ms ease-in-out -50ms forwards paused',
      '',
    ]);
  });

  it('restarts a replay without replacing the visible glyph nodes', () => {
    const { accentOverlay, glyphs, moras, publish } = mount();

    publish(playing());
    const first = glyphs();
    expect(first).toHaveLength(3);

    publish({ kind: 'idle' });
    expect(accentOverlay()!.style.animation).toBe(
      'fade-out 400ms ease-in-out forwards'
    );

    // Alternating keyframe names restart the CSS clock while preserving the
    // glyph nodes and their baseline/rasterization.
    const replayedAt = STARTED_AT + 200;
    vi.spyOn(performance, 'now').mockReturnValue(replayedAt);
    publish(playing({ startedAt: replayedAt }));

    const second = glyphs();
    expect(accentOverlay()!.style.animation).toBe('');
    expect(second).toHaveLength(3);
    expect(second).toEqual(first);
    expect(revealAnimations(moras())).toEqual([
      'tts-mora-reveal-b 200ms ease-in-out 0ms forwards',
      'tts-mora-reveal-b 200ms ease-in-out 200ms forwards',
      'tts-mora-reveal-b 200ms ease-in-out 400ms forwards',
    ]);
    expect(growAnimations(second)).toEqual([
      'tts-mora-grow-b 200ms ease-in-out 0ms',
      'tts-mora-grow-b 200ms ease-in-out 200ms',
      'tts-mora-grow-b 200ms ease-in-out 400ms',
    ]);
  });

  it('keeps colouring the reading under prefers-reduced-motion but does not move it', () => {
    setReducedMotion(true);

    const { glyphs, moras } = mount({ initialState: playing() });

    // Reduced motion asks for less movement, not less feedback: without the
    // colour the user cannot tell which of an entry's readings is playing.
    expect(growAnimations(glyphs())).toEqual(['', '', '']);
    expect(colorAnimations(glyphs())).toEqual([
      'tts-mora-highlight-a 200ms ease-in-out 0ms forwards',
      'tts-mora-highlight-a 200ms ease-in-out 200ms forwards',
      'tts-mora-highlight-a 200ms ease-in-out 400ms forwards',
    ]);
    expect(revealAnimations(moras())).toEqual([
      'tts-mora-reveal-a 200ms ease-in-out 0ms forwards',
      'tts-mora-reveal-a 200ms ease-in-out 200ms forwards',
      'tts-mora-reveal-a 200ms ease-in-out 400ms forwards',
    ]);
  });

  it('adds the swell back without restarting the colour sweep', () => {
    setReducedMotion(true);
    const { glyphs } = mount({ initialState: playing() });
    const colors = colorAnimations(glyphs());

    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 400);
    act(() => setReducedMotion(false));

    expect(growAnimations(glyphs())).toEqual([
      'tts-mora-grow-a 200ms ease-in-out 0ms',
      'tts-mora-grow-a 200ms ease-in-out 200ms',
      'tts-mora-grow-a 200ms ease-in-out 400ms',
    ]);
    expect(colorAnimations(glyphs())).toEqual(colors);
  });

  it('leaves the reading still when the clip has no timings', () => {
    const { glyphs, moras } = mount({
      initialState: {
        kind: 'playing',
        activeEntryIndex: 0,
        readingIndex: 0,
        startedAt: STARTED_AT,
      },
    });

    expect(growAnimations(glyphs())).toEqual(['', '', '']);
    expect(revealAnimations(moras())).toEqual(['', '', '']);
  });

  it('highlights on the very first paint when the controller is already playing', () => {
    const controller: TtsReadingProps['controller'] = {
      state: playing(),
      subscribe: () => () => {},
    };
    const container = document.createElement('div');
    document.body.append(container);

    // Not wrapped in act(): a popup rebuilt mid-playback must paint the
    // highlight on its synchronous first render, before effects flush.
    render(
      h(TtsReading, {
        controller,
        entryIndex: 0,
        readingIndex: 0,
        kana: { ent: 'たべる', a: 2 } as Kana,
        accentDisplay: 'binary',
      }),
      container
    );

    const root = container.firstElementChild as HTMLElement;
    expect(growAnimations(glyphsFrom(root))).toEqual([
      'tts-mora-grow-a 200ms ease-in-out 0ms',
      'tts-mora-grow-a 200ms ease-in-out 200ms',
      'tts-mora-grow-a 200ms ease-in-out 400ms',
    ]);
  });
});

type Kana = WordResult['r'][0];

function playing(
  overrides: {
    activeEntryIndex?: number;
    readingIndex?: number;
    moraTiming?: MoraTimingData;
    startedAt?: number;
  } = {}
): TtsPlaybackState {
  return {
    kind: 'playing',
    activeEntryIndex: 0,
    readingIndex: 0,
    moraTiming: evenTiming,
    startedAt: STARTED_AT,
    ...overrides,
  };
}

function mount(
  options: {
    initialState?: TtsPlaybackState;
    kana?: Partial<Kana>;
    accentDisplay?: AccentDisplay;
  } = {}
) {
  let listener: ((state: TtsPlaybackState) => void) | undefined;
  let current: TtsPlaybackState = options.initialState ?? { kind: 'idle' };

  const props: TtsReadingProps = {
    controller: {
      get state() {
        return current;
      },
      subscribe: (nextListener) => {
        listener = nextListener;
        nextListener(current);
        return () => {
          listener = undefined;
        };
      },
    },
    entryIndex: 0,
    readingIndex: 0,
    kana: { ent: 'たべる', a: 2, ...options.kana } as Kana,
    accentDisplay: options.accentDisplay ?? 'binary',
  };

  const container = document.createElement('div');
  document.body.append(container);
  const draw = () => {
    act(() => {
      render(h(TtsReading, props), container);
    });
  };
  draw();

  const root = () => container.firstElementChild as HTMLElement;
  const accentOverlay = () => root().children[1] as HTMLElement | undefined;
  const layer = () => accentOverlay()?.firstElementChild as HTMLElement;
  const moras = () => [...(layer()?.children ?? [])] as Array<HTMLElement>;
  const groups = () =>
    [...(root().firstElementChild?.children ?? [])] as Array<HTMLElement>;
  const glyphMoras = () => glyphMorasFrom(root());
  const glyphs = () => glyphsFrom(root());

  return {
    accentOverlay,
    glyphMoras,
    glyphs,
    groups,
    layer,
    moras,
    rerender: draw,
    publish: (state: TtsPlaybackState) => {
      current = state;
      act(() => listener?.(state));
    },
  };
}

function revealAnimations(moras: Array<HTMLElement>): Array<string> {
  return moras.map((mora) => mora.style.animation);
}

function growAnimations(glyphs: Array<HTMLElement>): Array<string> {
  return glyphs.map(
    (glyph) =>
      glyph.style.animation
        .split(', ')
        .find((animation) => animation.includes('tts-mora-grow')) ?? ''
  );
}

function colorAnimations(glyphs: Array<HTMLElement>): Array<string> {
  return glyphs.map(
    (glyph) =>
      glyph.style.animation
        .split(', ')
        .find(
          (animation) =>
            animation.includes('tts-mora-highlight') ||
            animation.includes('tts-mora-unhighlight')
        ) ?? ''
  );
}

function glyphsFrom(root: HTMLElement): Array<HTMLElement> {
  return glyphMorasFrom(root).map(
    (mora) => mora.firstElementChild as HTMLElement
  );
}

// The glyph layer groups its moras into one box per accent run, so the moras
// sit a level below the layer's own children.
function glyphMorasFrom(root: HTMLElement): Array<HTMLElement> {
  const glyphLayer = root.firstElementChild as HTMLElement;
  return [...glyphLayer.children].flatMap(
    (group) => [...group.children] as Array<HTMLElement>
  );
}

let reduced = false;
let motionListeners: Array<(event: MediaQueryListEvent) => void> = [];

function installMatchMedia() {
  reduced = false;
  motionListeners = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return reduced;
      },
      media: query,
      addEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void
      ) => {
        motionListeners.push(listener);
      },
      removeEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void
      ) => {
        motionListeners = motionListeners.filter((l) => l !== listener);
      },
    }))
  );
}

function setReducedMotion(reduce: boolean) {
  reduced = reduce;
  for (const listener of motionListeners) {
    listener({ matches: reduce } as MediaQueryListEvent);
  }
}
