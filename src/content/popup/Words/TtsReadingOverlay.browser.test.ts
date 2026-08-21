import type { WordResult } from '@birchill/jpdict-idb';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { AccentDisplay } from '../../../common/content-config-params';
import type { MoraTimingData } from '../../../common/tts/tts-request';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import '../popup.css';

import type {
  TtsReading as TtsReadingComponent,
  TtsReadingProps,
} from './TtsReadingOverlay';

let TtsReading: typeof TtsReadingComponent;
let previousChromeObject: typeof globalThis.chrome;
let previousBrowserObject: typeof globalThis.browser;

const TIMING: MoraTimingData = {
  charTimingsMs: [0, 220, 440],
  totalDurationMs: 660,
};

beforeAll(async () => {
  previousChromeObject = globalThis.chrome;
  previousBrowserObject = globalThis.browser;
  globalThis.chrome = { runtime: { id: 'test' } } as typeof globalThis.chrome;
  ({ TtsReading } = await import('./TtsReadingOverlay'));
});

afterAll(() => {
  globalThis.browser = previousBrowserObject;
  globalThis.chrome = previousChromeObject;
});

afterEach(() => {
  document.body.replaceChildren();
});

describe('TtsReading browser rendering', () => {
  it('keeps the same glyph nodes and future-mora baseline when playback starts', async () => {
    const subject = mount();
    const beforeNodes = subject.glyphs();
    const beforeRects = beforeNodes.map(rect);

    subject.publish(playing(performance.now()));
    await nextFrame();

    const afterNodes = subject.glyphs();
    expect(afterNodes).toEqual(beforeNodes);
    // The first glyph is supposed to jump. The delayed glyphs must not move
    // merely because playback changed their animation attributes.
    expectRectClose(rect(afterNodes[1]), beforeRects[1]);
    expectRectClose(rect(afterNodes[2]), beforeRects[2]);
  });

  it('has only one visible text-bearing glyph per mora at peak scale', async () => {
    const subject = mount({
      kana: { ent: 'きゃく', a: 1, match: true },
      timing: { charTimingsMs: [0, 0, 220], totalDurationMs: 440 },
    });

    subject.publish(playing(performance.now() - 110, subject.timing));
    await nextFrame();

    expect(
      visibleTextElements(subject.root()).map((node) => node.textContent)
    ).toEqual(['きゃ', 'く']);
    expect(getComputedStyle(subject.glyphs()[0]).scale).not.toBe('none');
  });

  it('aligns the dotted and solid accent boxes without transforming them', async () => {
    const subject = mount({
      kana: { ent: 'たべる', a: 2, match: true },
      accentDisplay: 'binary',
    });

    subject.publish(playing(performance.now() - 110));
    await nextFrame();

    const baseMoras = subject.baseMoras();
    const accentMoras = subject.accentMoras();
    expect(baseMoras).toHaveLength(3);
    expect(accentMoras).toHaveLength(3);
    for (const [index, baseMora] of baseMoras.entries()) {
      expectRectClose(rect(accentMoras[index]), rect(baseMora));
      expect(getComputedStyle(baseMora).borderStyle).toContain('dotted');
      expect(getComputedStyle(accentMoras[index]).borderStyle).toContain(
        'solid'
      );
      expect(getComputedStyle(accentMoras[index]).transform).toBe('none');
    }
  });

  it('returns a highlighted glyph to its inherited color after fading', async () => {
    const subject = mount();
    const inheritedColor = getComputedStyle(subject.container).color;

    subject.publish(playing(performance.now() - 660));
    await nextFrame();
    expect(getComputedStyle(subject.glyphs()[0]).color).not.toBe(
      inheritedColor
    );

    subject.publish({ kind: 'idle' });
    await wait(450);

    expect(getComputedStyle(subject.glyphs()[0]).color).toBe(inheritedColor);
  });

  it('does not animate future moras after playback is cancelled early', async () => {
    const subject = mount();
    subject.publish(playing(performance.now() - 50));
    await nextFrame();

    subject.publish({ kind: 'idle' });
    await nextFrame();

    const futureGlyph = subject.glyphs()[2];
    const futureAccent = subject.accentMoras()[2];
    expect(futureGlyph.style.animation).toBe('');
    expect(futureAccent.style.animation).toBe('');
    expect(futureAccent.style.opacity).toBe('0');
  });

  it('keeps the downstep marker stationary while its mora jumps', async () => {
    const subject = mount({
      kana: { ent: 'たべる', a: 2, match: true },
      accentDisplay: 'downstep',
    });
    const downstep = subject.baseMoras()[1].children[1] as HTMLElement;
    const before = rect(downstep);

    subject.publish(playing(performance.now() - 330));
    await nextFrame();

    expect(getComputedStyle(subject.glyphs()[1]).scale).not.toBe('none');
    expect(getComputedStyle(downstep).transform).toBe('none');
    expectRectClose(rect(downstep), before);
  });
});

type Kana = WordResult['r'][0];

function mount(
  options: {
    kana?: Kana;
    accentDisplay?: AccentDisplay;
    timing?: MoraTimingData;
  } = {}
) {
  let state: TtsPlaybackState = { kind: 'idle' };
  let listener: ((nextState: TtsPlaybackState) => void) | undefined;
  const timing = options.timing ?? TIMING;
  const controller: TtsReadingProps['controller'] = {
    get state() {
      return state;
    },
    subscribe(nextListener) {
      listener = nextListener;
      nextListener(state);
      return () => {
        listener = undefined;
      };
    },
  };
  const container = document.createElement('div');
  container.style.cssText = [
    'position: fixed',
    'inset: 40px auto auto 40px',
    'font: 32px/1.4 sans-serif',
    'color: rgb(96, 96, 96)',
    '--primary-highlight: rgb(220, 20, 60)',
    '--hi-contrast-pitch-accent: rgb(0, 0, 0)',
  ].join(';');
  document.body.append(container);

  act(() => {
    render(
      h(TtsReading, {
        controller,
        entryIndex: 0,
        readingIndex: 0,
        kana: options.kana ?? ({ ent: 'たべる', a: 2, match: true } as Kana),
        accentDisplay: options.accentDisplay ?? 'binary',
      }),
      container
    );
  });

  const root = () => container.firstElementChild as HTMLElement;
  const baseMoras = () =>
    [...(root().firstElementChild?.children ?? [])] as Array<HTMLElement>;
  const glyphs = () =>
    baseMoras().map((mora) => mora.firstElementChild as HTMLElement);
  const accentMoras = () =>
    [
      ...(root().children[1].firstElementChild?.children ?? []),
    ] as Array<HTMLElement>;

  return {
    accentMoras,
    baseMoras,
    container,
    glyphs,
    root: root,
    timing,
    publish(nextState: TtsPlaybackState) {
      state = nextState;
      act(() => listener?.(nextState));
    },
  };
}

function playing(
  startedAt: number,
  moraTiming: MoraTimingData = TIMING
): TtsPlaybackState {
  return {
    kind: 'playing',
    activeEntryIndex: 0,
    readingIndex: 0,
    moraTiming,
    startedAt,
  };
}

function visibleTextElements(root: HTMLElement): Array<HTMLElement> {
  return [...root.querySelectorAll<HTMLElement>('span')].filter((element) => {
    const hasDirectText = [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent
    );
    return hasDirectText && getComputedStyle(element).visibility === 'visible';
  });
}

function rect(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

function expectRectClose(actual: DOMRect, expected: DOMRect) {
  expect(actual.x).toBeCloseTo(expected.x, 1);
  expect(actual.y).toBeCloseTo(expected.y, 1);
  expect(actual.width).toBeCloseTo(expected.width, 1);
  expect(actual.height).toBeCloseTo(expected.height, 1);
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function wait(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
