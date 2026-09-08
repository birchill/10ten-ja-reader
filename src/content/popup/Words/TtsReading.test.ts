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
  it('animates only its own reading, and keeps the same glyph nodes throughout', () => {
    const { glyphs, publish } = mount();
    const idleGlyphs = glyphs();
    expect(idleGlyphs.map((glyph) => glyph.textContent)).toEqual([
      'た',
      'べ',
      'る',
    ]);
    expect(swelling(idleGlyphs)).toEqual([false, false, false]);

    publish(playing({ activeEntryIndex: 1 }));
    expect(swelling(glyphs())).toEqual([false, false, false]);

    publish(playing({ readingIndex: 1 }));
    expect(swelling(glyphs())).toEqual([false, false, false]);

    publish({
      kind: 'loading',
      activeEntryIndex: 0,
      readingIndex: 0,
      audioStarted: false,
    });
    expect(swelling(glyphs())).toEqual([false, false, false]);

    publish(playing());
    expect(swelling(glyphs())).toEqual([true, true, true]);
    expect(glyphs()).toEqual(idleGlyphs);
  });

  it('starts each mora after the one before it', () => {
    const { glyphs, moras, publish } = mount();

    publish(playing());

    expect(colouring(glyphs())).toEqual([true, true, true]);
    expect(delaysFor(glyphs(), 'tts-mora-grow')).toEqual(
      ascending(delaysFor(glyphs(), 'tts-mora-grow'))
    );
    expect(delaysFor(moras(), 'tts-mora-reveal')).toEqual(
      ascending(delaysFor(moras(), 'tts-mora-reveal'))
    );
  });

  it.each([
    // Spoken, mid-sweep, and not yet reached.
    [250, [-250, -50, 150]],
    // Past the end of the clip every mora is already filled in.
    [900, [-900, -700, -500]],
  ])(
    'backdates the sweep by the %ims already spoken when it mounts',
    (elapsedMs, delays) => {
      vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + elapsedMs);

      const { glyphs, moras } = mount({ initialState: playing() });

      // A negative delay is what leaves an already-spoken mora at its end
      // state, so a popup rebuilt mid-reading catches up rather than replays.
      expect(delaysFor(glyphs(), 'tts-mora-grow')).toEqual(delays);
      expect(delaysFor(moras(), 'tts-mora-reveal')).toEqual(delays);
    }
  );

  it('holds the sweep steady when the popup re-renders', () => {
    const { glyphs, rerender } = mount({ initialState: playing() });
    const before = delaysFor(glyphs(), 'tts-mora-grow');

    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 400);
    rerender();

    expect(delaysFor(glyphs(), 'tts-mora-grow')).toEqual(before);
  });

  it('hides the ink layer from assistive tech', () => {
    const { accentOverlay, publish } = mount();

    publish(playing());

    expect(accentOverlay()!.getAttribute('aria-hidden')).toBe('true');
  });

  it('mounts no ink layer for a reading that draws no pitch line', () => {
    for (const accentDisplay of ['none', 'downstep'] as Array<AccentDisplay>) {
      const { accentOverlay, glyphs, publish } = mount({ accentDisplay });

      publish(playing());

      expect(accentOverlay()).toBeUndefined();
      expect(swelling(glyphs())).toEqual([true, true, true]);
    }
  });

  it('colours the downstep mark with its own mora and never moves it', () => {
    const { glyphMoras, publish } = mount({ accentDisplay: 'downstep' });

    publish(playing());

    const [, marked] = glyphMoras();
    const mark = marked.children[1] as HTMLElement;
    expect(mark.textContent).toBe('ꜜ');
    expect(colouring([mark])).toEqual([true]);
    expect(swelling([mark])).toEqual([false]);
  });

  it('reverses the colour of everything already spoken when playback stops', () => {
    const { glyphs, publish } = mount();

    publish(playing());
    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 600);
    publish({ kind: 'idle' });

    expect(uncolouring(glyphs())).toEqual([true, true, true]);
    expect(swelling(glyphs())).toEqual([false, false, false]);
  });

  it('leaves a mora that had not been reached alone when playback stops', () => {
    const { glyphs, moras, publish } = mount();

    publish(playing());
    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 250);
    publish({ kind: 'idle' });

    // Mora 0 is spoken, mora 1 is mid-sweep, mora 2 was never reached: it must
    // not colour, and it must not swell after the user pressed stop.
    expect(uncolouring(glyphs())).toEqual([true, true, false]);
    expect(swelling(glyphs())).toEqual([false, true, false]);
    expect(moras().map((mora) => mora.style.opacity)).toEqual(['1', '0', '0']);
  });

  it('freezes the mora being spoken rather than brightening its ink', () => {
    const { moras, publish } = mount();

    publish(playing());
    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 250);
    publish({ kind: 'idle' });

    // Letting the half-done reveal run on while the layer fades multiplies two
    // curves, so the ink brightens before it disappears. Pausing holds it.
    expect(paused(moras())).toEqual([false, true, false]);
  });

  it('waits for the fade before it clears the highlight', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { glyphs, moras, publish } = mount();

    publish(playing());
    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 600);
    publish({ kind: 'idle' });

    // Clearing on the spot would cut the reverse sweep off mid-fade.
    expect(uncolouring(glyphs())).toEqual([true, true, true]);

    act(() => {
      vi.runAllTimers();
    });
    expect(animating(glyphs())).toEqual([false, false, false]);
    expect(animating(moras())).toEqual([false, false, false]);
  });

  it('restarts a replay under a fresh name without replacing the glyph nodes', () => {
    const { glyphs, publish } = mount();

    publish(playing());
    const first = glyphs();
    const firstPhase = phaseFor(first[0], 'tts-mora-grow');

    publish({ kind: 'idle' });

    const replayedAt = STARTED_AT + 200;
    vi.spyOn(performance, 'now').mockReturnValue(replayedAt);
    publish(playing({ startedAt: replayedAt }));

    // Reusing the name would leave the CSS clock where it was, so a replay has
    // to alternate. Remounting the nodes instead would reraster the baseline.
    const second = glyphs();
    expect(second).toEqual(first);
    expect(phaseFor(second[0], 'tts-mora-grow')).not.toBe(firstPhase);
    expect(swelling(second)).toEqual([true, true, true]);
  });

  it('keeps colouring the reading under prefers-reduced-motion but does not move it', () => {
    setReducedMotion(true);

    const { glyphs, moras } = mount({ initialState: playing() });

    // Reduced motion asks for less movement, not less feedback: without the
    // colour there is nothing to say which of an entry's readings is playing.
    expect(swelling(glyphs())).toEqual([false, false, false]);
    expect(colouring(glyphs())).toEqual([true, true, true]);
    expect(animating(moras())).toEqual([true, true, true]);
  });

  it('adds the swell back without restarting the colour sweep', () => {
    setReducedMotion(true);
    const { glyphs } = mount({ initialState: playing() });
    const before = delaysFor(glyphs(), 'tts-mora-highlight');

    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 400);
    act(() => setReducedMotion(false));

    expect(swelling(glyphs())).toEqual([true, true, true]);
    expect(delaysFor(glyphs(), 'tts-mora-highlight')).toEqual(before);
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

    expect(animating(glyphs())).toEqual([false, false, false]);
    expect(animating(moras())).toEqual([false, false, false]);
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
    expect(swelling(glyphsFrom(root))).toEqual([true, true, true]);
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
  const moras = () =>
    [
      ...(accentOverlay()?.firstElementChild?.children ?? []),
    ] as Array<HTMLElement>;
  const glyphMoras = () => glyphMorasFrom(root());
  const glyphs = () => glyphsFrom(root());

  return {
    accentOverlay,
    glyphMoras,
    glyphs,
    moras,
    rerender: draw,
    publish: (state: TtsPlaybackState) => {
      current = state;
      act(() => listener?.(state));
    },
  };
}

function animationFor(element: HTMLElement, name: string): string | undefined {
  return element.style.animation
    .split(', ')
    .find((animation) => animation.startsWith(name));
}

function animating(elements: Array<HTMLElement>): Array<boolean> {
  return elements.map((element) => element.style.animation !== '');
}

function swelling(elements: Array<HTMLElement>): Array<boolean> {
  return elements.map(
    (element) => animationFor(element, 'tts-mora-grow') !== undefined
  );
}

function colouring(elements: Array<HTMLElement>): Array<boolean> {
  return elements.map(
    (element) => animationFor(element, 'tts-mora-highlight') !== undefined
  );
}

function uncolouring(elements: Array<HTMLElement>): Array<boolean> {
  return elements.map(
    (element) => animationFor(element, 'tts-mora-unhighlight') !== undefined
  );
}

function paused(elements: Array<HTMLElement>): Array<boolean> {
  return elements.map((element) => element.style.animation.includes('paused'));
}

// The delay is the fourth value of the shorthand, and the only number in it
// this component computes rather than reads off the clip.
function delaysFor(
  elements: Array<HTMLElement>,
  name: string
): Array<number | undefined> {
  return elements.map((element) => {
    const delay = animationFor(element, name)?.split(' ')[3];
    return delay === undefined ? undefined : Number.parseInt(delay, 10);
  });
}

function phaseFor(element: HTMLElement, name: string): string | undefined {
  return animationFor(element, name)
    ?.split(' ')[0]
    .slice(name.length + 1);
}

function ascending(
  delays: Array<number | undefined>
): Array<number | undefined> {
  return [...delays].sort((a, b) => (a ?? 0) - (b ?? 0));
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
