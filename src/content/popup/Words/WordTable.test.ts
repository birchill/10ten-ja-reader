import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NameResult, WordResult } from '../../../background/search-result';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import type { WordTableProps } from './WordTable';
import { WordTable } from './WordTable';

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

describe('WordTable row click vs. the play button', () => {
  it('clicking the play button does not start copy mode, but the rest of the row still does', () => {
    const onStartCopy =
      vi.fn<(index: number, trigger: 'touch' | 'mouse') => void>();
    const toggles: Array<number> = [];
    const controller = {
      state: { kind: 'idle' } as TtsPlaybackState,
      subscribe: (listener: (state: TtsPlaybackState) => void) => {
        listener({ kind: 'idle' });
        return () => {};
      },
      toggle: (entryIndex: number) => toggles.push(entryIndex),
    };

    const container = document.createElement('div');
    document.body.append(container);

    act(() => {
      render(
        h(WordTable, {
          entries: [createEntry()],
          matchLen: 1,
          more: false,
          config: baseConfig(),
          copyState: { kind: 'inactive' },
          onStartCopy,
          ttsPlayback: controller,
        }),
        container
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="content_play_readings_label"]'
    );
    expect(button).not.toBeNull();

    act(() => {
      button!.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        })
      );
      button!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(toggles).toEqual([0]);
    expect(onStartCopy).not.toHaveBeenCalled();

    const kanaText = container.querySelector('[lang="ja"]') as HTMLElement;
    act(() => {
      kanaText.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        })
      );
      kanaText.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(onStartCopy).toHaveBeenCalledWith(0, 'mouse');
  });

  it('clicking the name preview then the word uses word-first playback indices', () => {
    const onStartCopy =
      vi.fn<(index: number, trigger: 'touch' | 'mouse') => void>();
    const toggles: Array<number> = [];
    const controller = {
      state: { kind: 'idle' } as TtsPlaybackState,
      subscribe: (listener: (state: TtsPlaybackState) => void) => {
        listener({ kind: 'idle' });
        return () => {};
      },
      toggle: (entryIndex: number) => toggles.push(entryIndex),
    };
    const container = document.createElement('div');
    document.body.append(container);

    act(() => {
      render(
        h(WordTable, {
          entries: [createEntry()],
          matchLen: 1,
          more: false,
          namePreview: { names: [createName()], more: false },
          config: baseConfig(),
          copyState: { kind: 'inactive' },
          onStartCopy,
          ttsPlayback: controller,
        }),
        container
      );
    });

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        'button[aria-label="content_play_readings_label"]'
      )
    );
    const nameButton = buttons.find((button) =>
      button.parentElement?.textContent?.includes('さとう')
    )!;
    const wordButton = buttons.find((button) =>
      button.parentElement?.textContent?.includes('ひ')
    )!;

    act(() => nameButton.click());
    act(() => wordButton.click());

    expect(toggles).toEqual([1, 0]);
    expect(onStartCopy).not.toHaveBeenCalled();
  });
});

function createEntry(): WordResult {
  return {
    id: 1,
    k: [],
    r: [{ ent: 'ひ', romaji: 'hi', match: true }],
    s: [{ g: [{ str: 'day' }], pos: ['n'], match: true }],
    matchLen: 1,
  };
}

function baseConfig(): WordTableProps['config'] {
  return {
    accentDisplay: 'none',
    dictLang: 'en',
    bunproDisplay: false,
    posDisplay: 'none',
    showPriority: false,
    showRomaji: false,
    waniKaniVocabDisplay: 'hide',
    readingOnly: true,
    preferredUnits: 'metric',
    fx: undefined,
  };
}

function createName(): NameResult {
  return {
    id: 2,
    k: ['佐藤'],
    r: ['さとう'],
    tr: [{ det: ['Sato'], type: ['surname'] }],
    matchLen: 2,
  };
}
