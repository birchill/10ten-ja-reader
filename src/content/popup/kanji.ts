import type { KanjiResult } from '@birchill/jpdict-idb';
import { h } from 'preact';

import { html } from '../../utils/builder';

import { KanjiEntry } from './Kanji/KanjiEntry';
import { mountPopupComponent } from './mount';
import { PopupOptionsProvider } from './options-context';
import { getSelectedIndex } from './selected-index';
import type { ShowPopupOptions } from './show-popup';

export function renderKanjiEntries({
  entries,
  options,
  popupHost,
}: {
  entries: ReadonlyArray<KanjiResult>;
  options: ShowPopupOptions;
  popupHost: Element;
}): HTMLElement {
  const container = html('div', { class: 'kanjilist entry-data' });

  const selectedIndex = getSelectedIndex(options.copyState, entries.length);
  for (const [i, entry] of entries.entries()) {
    if (i === 1) {
      container.append(html('div', { class: 'fold-point' }));
    }
    container.append(
      renderKanjiEntry({
        entry,
        index: i,
        options,
        popupHost,
        selectState:
          selectedIndex === i
            ? options.copyState.kind === 'active'
              ? 'selected'
              : 'flash'
            : 'unselected',
      })
    );
  }

  return container;
}

function renderKanjiEntry({
  entry,
  index,
  options,
  popupHost,
  selectState,
}: {
  entry: KanjiResult;
  index: number;
  options: ShowPopupOptions;
  popupHost: Element;
  selectState: 'unselected' | 'selected' | 'flash';
}): HTMLElement {
  const containerElement = html('div', {
    /* Make sure it's possible to scroll all the way to the bottom of each kanji
     * table. */
    style:
      'scroll-snap-align: start; scroll-margin-bottom: var(--expand-button-allowance);',
  });
  mountPopupComponent({
    popupHost,
    container: containerElement,
    vnode: h(
      PopupOptionsProvider,
      { ...options },
      h(KanjiEntry, {
        entry,
        index,
        kanjiReferences: options.kanjiReferences,
        onStartCopy: options.onStartCopy,
        selectState,
        showComponents: options.showKanjiComponents,
      })
    ),
  });
  return containerElement;
}
