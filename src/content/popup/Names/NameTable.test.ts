import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NameResult } from '../../../background/search-result';

import type { TtsPlaybackState } from '../../tts-playback-controller';

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

describe('NameTable row click vs. the play button', () => {
  it('plays the selected name without starting copy mode, while the row still copies', () => {
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
        h(NameTable, {
          entries: [createName(1), createName(2)],
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

    const buttons = Array.from(
      container.querySelectorAll('.tts-play-button')
    ) as Array<HTMLButtonElement>;
    expect(buttons).toHaveLength(2);

    act(() => buttons[1]!.click());
    expect(toggles).toEqual([1]);
    expect(onStartCopy).not.toHaveBeenCalled();

    const rows = container.querySelectorAll('[lang="ja"]');
    act(() => {
      rows[0]!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(onStartCopy).toHaveBeenCalledWith(0, 'touch');
  });
});

function createName(id: number): NameResult {
  return {
    id,
    k: ['佐藤'],
    r: ['さとう'],
    tr: [{ det: ['Sato'], type: ['surname'] }],
    matchLen: 2,
  };
}
