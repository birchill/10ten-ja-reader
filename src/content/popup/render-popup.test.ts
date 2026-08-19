import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { mountPopupComponent, withPopupRoot } from './mount';
import { PopupPositionMode } from './popup-position';
import { renderPopup } from './render-popup';
import type { ShowPopupOptions } from './show-popup';

/**
 * @vitest-environment jsdom
 */

vi.mock('webextension-polyfill', () => ({
  default: {
    i18n: { getMessage: () => '' },
    runtime: { getURL: (path: string) => path },
  },
}));

describe('renderPopup', () => {
  it("unmounts the previous render's popup islands when the popup rebuilds", async () => {
    const cleanup = vi.fn<() => void>();
    const host = document.createElement('div');
    const container = document.createElement('div');
    host.append(container);

    await act(() => {
      withPopupRoot(host, () => {
        mountPopupComponent(container, h(CleanupProbe, { onCleanup: cleanup }));
      });
    });
    expect(cleanup).not.toHaveBeenCalled();

    renderPopup(undefined, createOptions(host));

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

function createOptions(container: HTMLElement): ShowPopupOptions {
  return {
    accentDisplay: 'none',
    bunproDisplay: false,
    container,
    copyNextKey: '',
    copyState: { kind: 'inactive' },
    dictToShow: 'words',
    dictLang: 'en',
    displayMode: 'static',
    fxData: undefined,
    getCursorClearanceAndPos: () => ({
      cursorClearance: { top: 0, right: 0, bottom: 0, left: 0 },
    }),
    interactive: false,
    isExpanded: false,
    isVerticalText: false,
    kanjiReferences: [],
    pointerType: 'cursor',
    posDisplay: 'none',
    positionMode: PopupPositionMode.Auto,
    popupStyle: 'blue',
    preferredUnits: 'metric',
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    showDefinitions: false,
    showPriority: false,
    showRomaji: false,
    switchDictionaryKeys: [],
    tabDisplay: 'none',
    waniKaniVocabDisplay: 'hide',
  };
}

function CleanupProbe({ onCleanup }: { onCleanup: () => void }) {
  useEffect(() => onCleanup, []);
  return null;
}
