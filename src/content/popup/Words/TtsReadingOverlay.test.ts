import type { WordResult } from '@birchill/jpdict-idb';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccentDisplay } from '../../../common/content-config-params';
import type { MoraTimingData } from '../../../common/tts/tts-request';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import { TtsReading, type TtsReadingProps } from './TtsReadingOverlay';

const { sendMessage } = vi.hoisted(() => ({
  sendMessage: vi.fn<(message: unknown) => Promise<unknown>>(),
}));

vi.mock('webextension-polyfill', () => ({
  default: { runtime: { sendMessage } },
}));

/**
 * @vitest-environment jsdom
 */

// jsdom has no `onanimationend` property. Preact checks for that property to
// pick the case of the native listener name, so without it Preact listens
// under the wrong name and a dispatched event never arrives.
if (!('onanimationend' in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, 'onanimationend', {
    value: null,
    writable: true,
  });
}

const STARTED_AT = 1000;

// A mora may only name a border style where it draws a line: nothing resets
// `border-width` in this popup, so a bare `border-style` would pad the mora out
// with the browser's default `medium` width.
const SOLID = 'tp:border-solid tp:border-(--primary-highlight)';

// たべる: three single-codepoint moras, each running 200ms.
const evenTiming: MoraTimingData = {
  charTimingsMs: [0, 200, 400],
  totalDurationMs: 600,
};

beforeEach(() => {
  sendMessage.mockReset();
  sendMessage.mockResolvedValue(undefined);
  installMatchMedia();
  vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT);
});

afterEach(() => {
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
    expect(hopAnimations(idleGlyphs)).toEqual(['', '', '']);

    publish(playing({ activeEntryIndex: 1 }));
    expect(hopAnimations(glyphs())).toEqual(['', '', '']);

    publish(playing({ readingIndex: 1 }));
    expect(hopAnimations(glyphs())).toEqual(['', '', '']);

    publish({ kind: 'loading', activeEntryIndex: 0, readingIndex: 0 });
    expect(hopAnimations(glyphs())).toEqual(['', '', '']);

    publish(playing());
    expect(hopAnimations(glyphs()).every(Boolean)).toBe(true);
    expect(glyphs()).toEqual(idleGlyphs);
  });

  it('hides the border-only overlay from assistive tech and the pointer', () => {
    const { accentOverlay, publish } = mount();

    publish(playing());

    expect(accentOverlay().getAttribute('aria-hidden')).toBe('true');
    expect(accentOverlay().classList.contains('tp:pointer-events-none')).toBe(
      true
    );
  });

  it('colors and hops each single visible glyph on its own timing', () => {
    const { glyphs, moras, publish } = mount();

    publish(playing());

    expect(moras().map((mora) => mora.style.opacity)).toEqual(['0', '0', '0']);
    expect(revealAnimations(moras())).toEqual([
      'tts-mora-reveal-a 200ms ease-in-out 0ms forwards',
      'tts-mora-reveal-a 200ms ease-in-out 200ms forwards',
      'tts-mora-reveal-a 200ms ease-in-out 400ms forwards',
    ]);
    expect(hopAnimations(glyphs())).toEqual([
      'tts-mora-hop-a 200ms ease-in-out 0ms',
      'tts-mora-hop-a 200ms ease-in-out 200ms',
      'tts-mora-hop-a 200ms ease-in-out 400ms',
    ]);
    expect(colorAnimations(glyphs())).toEqual([
      'tts-mora-highlight-a 200ms ease-in-out 0ms forwards',
      'tts-mora-highlight-a 200ms ease-in-out 200ms forwards',
      'tts-mora-highlight-a 200ms ease-in-out 400ms forwards',
    ]);
    expect(glyphs().map((glyph) => glyph.style.translate)).toEqual([
      '0 0',
      '0 0',
      '0 0',
    ]);
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
      expect(hopAnimations(glyphs())).toEqual(
        delays.map((delay) => `tts-mora-hop-a 200ms ease-in-out ${delay}`)
      );
    }
  );

  it('holds the delays steady when the popup re-renders', () => {
    const { glyphs, rerender } = mount({ initialState: playing() });
    const before = hopAnimations(glyphs());

    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 400);
    rerender();

    expect(hopAnimations(glyphs())).toEqual(before);
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
      `tp:inline-block ${SOLID} tp:border-0 tp:border-b-(length:--border-width) tp:border-r-(length:--border-width)`,
      `tp:inline-block ${SOLID} tp:border-0 tp:border-t-(length:--border-width) tp:border-r-(length:--border-width)`,
      `tp:inline-block ${SOLID} tp:border-0 tp:border-b-(length:--border-width)`,
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
    const { baseMoras, moras, publish } = mount({
      kana: { ent: 'たべる', a: 2 },
      accentDisplay: 'downstep',
    });

    publish(playing());

    expect(moras().map((mora) => mora.textContent)).toEqual([
      'た',
      'べꜜ',
      'る',
    ]);
    expect(moras().every((mora) => mora.className === 'tp:inline-block')).toBe(
      true
    );
    const downstep = baseMoras()[1].children[1] as HTMLElement;
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
      `tp:inline-block ${SOLID} tp:border-0 tp:border-t-(length:--border-width)`,
      `tp:inline-block ${SOLID} tp:border-0 tp:border-t-(length:--border-width)`,
      `tp:inline-block ${SOLID} tp:border-0 tp:border-t-(length:--border-width)`,
    ]);
  });

  it('adds no accent line when accents are turned off', () => {
    const { moras, publish } = mount({
      kana: { ent: 'たべる', a: 2 },
      accentDisplay: 'none',
    });

    publish(playing());

    expect(moras().map((mora) => mora.textContent)).toEqual(['た', 'べ', 'る']);
    expect(moras().every((mora) => mora.className === 'tp:inline-block')).toBe(
      true
    );
  });

  it('fades the color and accent ink back over 400ms', () => {
    const { accentOverlay, glyphs, moras, publish } = mount();

    publish(playing());
    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 600);
    publish({ kind: 'idle' });

    expect(accentOverlay().style.animation).toBe(
      'fade-out 400ms ease-in-out forwards'
    );
    expect(colorAnimations(glyphs())).toEqual([
      'tts-mora-unhighlight 400ms ease-in-out 0ms forwards',
      'tts-mora-unhighlight 400ms ease-in-out 0ms forwards',
      'tts-mora-unhighlight 400ms ease-in-out 0ms forwards',
    ]);
    expect(hopAnimations(glyphs())).toEqual(['', '', '']);

    act(() => {
      accentOverlay().dispatchEvent(animationEnd('tts-mora-reveal-a'));
    });
    expect(accentOverlay().style.animation).not.toBe('');

    act(() => {
      accentOverlay().dispatchEvent(animationEnd('fade-out'));
    });
    expect(accentOverlay().style.animation).toBe('');
    expect(hopAnimations(glyphs())).toEqual(['', '', '']);
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
    expect(hopAnimations(glyphs())).toEqual([
      '',
      'tts-mora-hop-a 200ms ease-in-out 200ms',
      '',
    ]);
    expect(moras().map((mora) => mora.style.opacity)).toEqual(['1', '0', '0']);
    expect(revealAnimations(moras())).toEqual([
      '',
      'tts-mora-reveal-a 200ms ease-in-out 200ms forwards',
      '',
    ]);
  });

  it('restarts a replay without replacing the visible glyph nodes', () => {
    const { accentOverlay, glyphs, moras, publish } = mount();

    publish(playing());
    const first = glyphs();
    expect(first).toHaveLength(3);

    publish({ kind: 'idle' });
    expect(accentOverlay().style.animation).toBe(
      'fade-out 400ms ease-in-out forwards'
    );

    // Alternating keyframe names restart the CSS clock while preserving the
    // glyph nodes and their baseline/rasterization.
    const replayedAt = STARTED_AT + 200;
    vi.spyOn(performance, 'now').mockReturnValue(replayedAt);
    publish(playing({ startedAt: replayedAt }));

    const second = glyphs();
    expect(accentOverlay().style.animation).toBe('');
    expect(second).toHaveLength(3);
    expect(second).toEqual(first);
    expect(revealAnimations(moras())).toEqual([
      'tts-mora-reveal-b 200ms ease-in-out 0ms forwards',
      'tts-mora-reveal-b 200ms ease-in-out 200ms forwards',
      'tts-mora-reveal-b 200ms ease-in-out 400ms forwards',
    ]);
    expect(hopAnimations(second)).toEqual([
      'tts-mora-hop-b 200ms ease-in-out 0ms',
      'tts-mora-hop-b 200ms ease-in-out 200ms',
      'tts-mora-hop-b 200ms ease-in-out 400ms',
    ]);
  });

  it('keeps the reading still and uncolored under prefers-reduced-motion', () => {
    setReducedMotion(true);

    const { glyphs, moras } = mount({ initialState: playing() });

    expect(hopAnimations(glyphs())).toEqual(['', '', '']);
    expect(revealAnimations(moras())).toEqual(['', '', '']);
  });

  it('resyncs from the current clock when animation is switched back on', () => {
    setReducedMotion(true);
    const { glyphs, moras } = mount({ initialState: playing() });
    expect(hopAnimations(glyphs())).toEqual(['', '', '']);

    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 400);
    act(() => setReducedMotion(false));

    expect(revealAnimations(moras())).toEqual([
      'tts-mora-reveal-a 200ms ease-in-out -400ms forwards',
      'tts-mora-reveal-a 200ms ease-in-out -200ms forwards',
      'tts-mora-reveal-a 200ms ease-in-out 0ms forwards',
    ]);
  });

  it('clears a stale fade when reduced motion is enabled', () => {
    const { accentOverlay, glyphs, publish } = mount();
    publish(playing());
    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 600);
    publish({ kind: 'idle' });
    expect(accentOverlay().style.animation).not.toBe('');

    act(() => setReducedMotion(true));
    expect(accentOverlay().style.animation).toBe('');
    expect(hopAnimations(glyphs())).toEqual(['', '', '']);

    act(() => setReducedMotion(false));
    expect(accentOverlay().style.animation).toBe('');
    expect(hopAnimations(glyphs())).toEqual(['', '', '']);
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

    expect(hopAnimations(glyphs())).toEqual(['', '', '']);
    expect(revealAnimations(moras())).toEqual(['', '', '']);
  });

  it('leaves the reading still and warns once when timings do not fit', () => {
    const { glyphs, moras, rerender } = mount({
      initialState: playing({
        moraTiming: { charTimingsMs: [0, 200], totalDurationMs: 600 },
      }),
    });

    rerender();

    expect(hopAnimations(glyphs())).toEqual(['', '', '']);
    expect(revealAnimations(moras())).toEqual(['', '', '']);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    // What the user looked up must not reach telemetry.
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'notifyTtsWarning',
      message: 'Mora timing mismatch: 2 timings for 3 codepoints',
    });
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
        kana: { ent: 'たべる' } as Kana,
        accentDisplay: 'binary',
      }),
      container
    );

    const root = container.firstElementChild as HTMLElement;
    const glyphLayer = root.firstElementChild as HTMLElement;
    expect([...glyphLayer.children]).toHaveLength(3);
    expect(hopAnimations(glyphsFrom(root)).every(Boolean)).toBe(true);
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
    kana: { ent: 'たべる', ...options.kana } as Kana,
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
  const accentOverlay = () => root().children[1] as HTMLElement;
  const layer = () => accentOverlay().firstElementChild as HTMLElement;
  const moras = () => [...(layer()?.children ?? [])] as Array<HTMLElement>;
  const baseMoras = () =>
    [...(root().firstElementChild?.children ?? [])] as Array<HTMLElement>;
  const glyphs = () => glyphsFrom(root());

  return {
    accentOverlay,
    baseMoras,
    glyphs,
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

function hopAnimations(glyphs: Array<HTMLElement>): Array<string> {
  return glyphs.map(
    (glyph) =>
      glyph.style.animation
        .split(', ')
        .find((animation) => animation.includes('tts-mora-hop')) ?? ''
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
  const glyphLayer = root.firstElementChild as HTMLElement;
  return [...glyphLayer.children].map(
    (mora) => mora.firstElementChild as HTMLElement
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

function animationEnd(animationName: string): Event {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: animationName });
  return event;
}
