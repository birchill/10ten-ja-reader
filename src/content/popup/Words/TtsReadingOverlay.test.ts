import type { WordResult } from '@birchill/jpdict-idb';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccentDisplay } from '../../../common/content-config-params';
import type { MoraTimingData } from '../../../common/tts/tts-request';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import {
  TtsReadingOverlay,
  type TtsReadingOverlayProps,
} from './TtsReadingOverlay';

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

describe('TtsReadingOverlay', () => {
  it('renders nothing until its own reading is spoken', () => {
    const { overlay, publish } = mount();
    expect(overlay()).toBeNull();

    publish(playing({ activeEntryIndex: 1 }));
    expect(overlay()).toBeNull();

    publish(playing({ readingIndex: 1 }));
    expect(overlay()).toBeNull();

    publish({ kind: 'loading', activeEntryIndex: 0, readingIndex: 0 });
    expect(overlay()).toBeNull();

    publish(playing());
    expect(overlay()).not.toBeNull();
  });

  it('hides the overlay from assistive tech and from the pointer', () => {
    const { overlay, publish } = mount();

    publish(playing());

    expect(overlay()!.getAttribute('aria-hidden')).toBe('true');
    expect(overlay()!.classList.contains('tp:pointer-events-none')).toBe(true);
  });

  it('reveals and grows each mora on its own timing', () => {
    const { moras, publish } = mount();

    publish(playing());

    expect(moras().map((mora) => mora.style.opacity)).toEqual(['0', '0', '0']);
    expect(revealAnimations(moras())).toEqual([
      'fade-in 200ms ease-in-out 0ms forwards',
      'fade-in 200ms ease-in-out 200ms forwards',
      'fade-in 200ms ease-in-out 400ms forwards',
    ]);
    expect(growAnimations(moras())).toEqual([
      'tts-mora-grow 200ms ease-in-out 0ms',
      'tts-mora-grow 200ms ease-in-out 200ms',
      'tts-mora-grow 200ms ease-in-out 400ms',
    ]);
    expect(
      growSpans(moras()).map((span) => span.style.transformOrigin)
    ).toEqual(['center bottom', 'center bottom', 'center bottom']);
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

      const { moras } = mount({ initialState: playing() });

      expect(revealAnimations(moras())).toEqual(
        delays.map((delay) => `fade-in 200ms ease-in-out ${delay} forwards`)
      );
      expect(growAnimations(moras())).toEqual(
        delays.map((delay) => `tts-mora-grow 200ms ease-in-out ${delay}`)
      );
    }
  );

  it('holds the delays steady when the popup re-renders', () => {
    const { moras, rerender } = mount({ initialState: playing() });
    const before = revealAnimations(moras());

    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 400);
    rerender();

    expect(revealAnimations(moras())).toEqual(before);
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

  it('reveals the downstep mark with its own mora', () => {
    const { moras, publish } = mount({
      kana: { ent: 'たべる', a: 2 },
      accentDisplay: 'downstep',
    });

    publish(playing());

    expect(moras().map((mora) => mora.textContent)).toEqual([
      'た',
      'べꜜ',
      'る',
    ]);
    expect(moras().every((mora) => !mora.getAttribute('class'))).toBe(true);
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

  it('adds no accent line when accents are turned off', () => {
    const { moras, publish } = mount({
      kana: { ent: 'たべる', a: 2 },
      accentDisplay: 'none',
    });

    publish(playing());

    expect(moras().map((mora) => mora.textContent)).toEqual(['た', 'べ', 'る']);
    expect(moras().every((mora) => !mora.getAttribute('class'))).toBe(true);
  });

  it('fades out over 400ms and unmounts on its own animationend', () => {
    const { overlay, publish } = mount();

    publish(playing());
    publish({ kind: 'idle' });

    expect(overlay()!.style.animation).toBe(
      'fade-out 400ms ease-in-out forwards'
    );

    act(() => {
      overlay()!.dispatchEvent(animationEnd('fade-in'));
    });
    expect(overlay()).not.toBeNull();

    act(() => {
      overlay()!.dispatchEvent(animationEnd('fade-out'));
    });
    expect(overlay()).toBeNull();
  });

  it('builds new mora spans when a reading replays during the fade-out', () => {
    const { overlay, moras, publish } = mount();

    publish(playing());
    const first = moras();
    expect(first).toHaveLength(3);

    publish({ kind: 'idle' });
    expect(overlay()!.style.animation).toBe(
      'fade-out 400ms ease-in-out forwards'
    );

    // Replay 200ms in, while the overlay is still fading. Retiming the spans
    // that are already there would leave their finished animations finished —
    // the whole reading lit, with no sweep — so they have to be new elements.
    const replayedAt = STARTED_AT + 200;
    vi.spyOn(performance, 'now').mockReturnValue(replayedAt);
    publish(playing({ startedAt: replayedAt }));

    const second = moras();
    expect(overlay()!.style.animation).toBe('');
    expect(second).toHaveLength(3);
    expect(second.some((span, index) => span === first[index])).toBe(false);
    expect(revealAnimations(second)).toEqual([
      'fade-in 200ms ease-in-out 0ms forwards',
      'fade-in 200ms ease-in-out 200ms forwards',
      'fade-in 200ms ease-in-out 400ms forwards',
    ]);
  });

  it('renders no overlay under prefers-reduced-motion', () => {
    setReducedMotion(true);

    const { overlay } = mount({ initialState: playing() });

    expect(overlay()).toBeNull();
  });

  it('resyncs from the current clock when animation is switched back on', () => {
    setReducedMotion(true);
    const { overlay, moras } = mount({ initialState: playing() });
    expect(overlay()).toBeNull();

    vi.spyOn(performance, 'now').mockReturnValue(STARTED_AT + 400);
    act(() => setReducedMotion(false));

    expect(revealAnimations(moras())).toEqual([
      'fade-in 200ms ease-in-out -400ms forwards',
      'fade-in 200ms ease-in-out -200ms forwards',
      'fade-in 200ms ease-in-out 0ms forwards',
    ]);
  });

  it('renders no overlay when the clip has no timings', () => {
    const { overlay } = mount({
      initialState: {
        kind: 'playing',
        activeEntryIndex: 0,
        readingIndex: 0,
        startedAt: STARTED_AT,
      },
    });

    expect(overlay()).toBeNull();
  });

  it('renders no overlay and warns once when the timings do not fit', () => {
    const { overlay, rerender } = mount({
      initialState: playing({
        moraTiming: { charTimingsMs: [0, 200], totalDurationMs: 600 },
      }),
    });

    rerender();

    expect(overlay()).toBeNull();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    // What the user looked up must not reach telemetry.
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'notifyTtsWarning',
      message: 'Mora timing mismatch: 2 timings for 3 codepoints',
    });
  });

  it('highlights on the very first paint when the controller is already playing', () => {
    const controller: TtsReadingOverlayProps['controller'] = {
      state: playing(),
      subscribe: () => () => {},
    };
    const container = document.createElement('div');
    document.body.append(container);

    // Not wrapped in act(): a popup rebuilt mid-playback must paint the
    // highlight on its synchronous first render, before effects flush.
    render(
      h(TtsReadingOverlay, {
        controller,
        entryIndex: 0,
        readingIndex: 0,
        kana: { ent: 'たべる' } as Kana,
        accentDisplay: 'binary',
      }),
      container
    );

    const overlay = container.firstElementChild as HTMLElement | null;
    expect(overlay).not.toBeNull();
    expect([...(overlay!.firstElementChild?.children ?? [])]).toHaveLength(3);
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

  const props: TtsReadingOverlayProps = {
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
      render(h(TtsReadingOverlay, props), container);
    });
  };
  draw();

  const overlay = () => container.firstElementChild as HTMLElement | null;
  const layer = () => overlay()?.firstElementChild ?? null;
  const moras = () => [...(layer()?.children ?? [])] as Array<HTMLElement>;

  return {
    overlay,
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

function growAnimations(moras: Array<HTMLElement>): Array<string> {
  return growSpans(moras).map((span) => span.style.animation);
}

function growSpans(moras: Array<HTMLElement>): Array<HTMLElement> {
  return moras.map((mora) => mora.firstElementChild as HTMLElement);
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
