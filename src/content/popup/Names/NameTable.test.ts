import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NameResult } from '../../../background/search-result';

import type {
  TtsPlaybackHandle,
  TtsPlaybackState,
} from '../../tts-playback-controller';

import { NameTable } from './NameTable';

/**
 * @vitest-environment jsdom
 */

vi.mock('../../../common/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, langTag: 'en' }),
}));

vi.mock('webextension-polyfill', () => ({
  default: {
    i18n: { getMessage: () => '' },
    runtime: { getURL: (path: string) => path },
  },
}));

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi
      .fn()
      .mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('NameTable playback', () => {
  it('plays a name without starting copy mode, while clicking the row still copies', () => {
    const onStartCopy =
      vi.fn<(index: number, trigger: 'touch' | 'mouse') => void>();
    const toggles: Array<number> = [];
    const { controller } = createController((entryIndex) =>
      toggles.push(entryIndex)
    );
    const container = document.createElement('div');
    document.body.append(container);

    act(() => {
      render(
        h(NameTable, {
          entries: [
            createName(1, '佐藤', ['さとう'], 'Sato'),
            createName(2, '田中', ['たなか'], 'Tanaka'),
          ],
          matchLen: 2,
          more: false,
          fxData: undefined,
          preferredUnits: 'metric',
          copyState: { kind: 'inactive' },
          onStartCopy,
          ttsPlayback: controller,
        }),
        container
      );
    });

    const buttons = container.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="content_play_readings_label"]'
    );
    expect(buttons).toHaveLength(2);

    const japaneseRows = Array.from(container.querySelectorAll('[lang="ja"]'));
    const secondName = japaneseRows.find((row) =>
      row.textContent?.includes('たなか')
    )!;
    const secondButton = secondName.querySelector<HTMLButtonElement>(
      'button[aria-label="content_play_readings_label"]'
    )!;
    act(() => secondButton.click());
    expect(toggles).toEqual([1]);
    expect(onStartCopy).not.toHaveBeenCalled();

    const firstName = japaneseRows.find((row) =>
      row.textContent?.includes('さとう')
    )!;
    act(() => {
      firstName.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        })
      );
      firstName.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(onStartCopy).toHaveBeenCalledWith(0, 'mouse');
  });

  it('animates only the name reading currently being played', () => {
    const { controller, publish } = createController();
    const container = document.createElement('div');
    document.body.append(container);

    act(() => {
      render(
        h(NameTable, {
          entries: [createName(1, '佐藤', ['さとう', 'さとお'], 'Sato')],
          matchLen: 2,
          more: false,
          fxData: undefined,
          preferredUnits: 'metric',
          copyState: { kind: 'inactive' },
          ttsPlayback: controller,
        }),
        container
      );
    });

    act(() => {
      publish({
        kind: 'playing',
        activeEntryIndex: 0,
        readingIndex: 1,
        startedAt: performance.now(),
        moraTiming: { charTimingsMs: [0, 100, 200], totalDurationMs: 300 },
      });
    });

    const readings = container.querySelectorAll('.tp\\:inline-grid');
    expect(readings).toHaveLength(2);
    expect(hopAnimations(readings[0]!)).toEqual(['', '', '']);
    expect(hopAnimations(readings[1]!).every(Boolean)).toBe(true);
  });
});

function createController(onToggle: (entryIndex: number) => void = () => {}) {
  let state: TtsPlaybackState = { kind: 'idle' };
  const listeners = new Set<(state: TtsPlaybackState) => void>();
  const controller: TtsPlaybackHandle = {
    get state() {
      return state;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    toggle: onToggle,
  };

  return {
    controller,
    publish: (nextState: TtsPlaybackState) => {
      state = nextState;
      listeners.forEach((listener) => listener(state));
    },
  };
}

function hopAnimations(reading: Element): Array<string> {
  return [...reading.firstElementChild!.children].map(
    (mora) =>
      (mora.firstElementChild as HTMLElement).style.animation
        .split(', ')
        .find((animation) => animation.includes('tts-mora-hop')) ?? ''
  );
}

function createName(
  id: number,
  kanji: string,
  readings: Array<string>,
  translation: string
): NameResult {
  return {
    id,
    k: [kanji],
    r: readings,
    tr: [{ det: [translation], type: ['surname'] }],
    matchLen: 2,
  };
}
