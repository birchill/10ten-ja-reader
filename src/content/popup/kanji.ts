import { KanjiResult } from '@birchill/jpdict-idb';
import { h, render } from 'preact';

import { html } from '../../utils/builder';

import { KanjiEntry } from './Kanji/KanjiEntry';
import { PopupOptionsProvider } from './options-context';
import { getSelectedIndex } from './selected-index';
import { ShowPopupOptions } from './show-popup';

export function renderKanjiEntries({
  entries,
  options,
}: {
  entries: ReadonlyArray<KanjiResult>;
  options: ShowPopupOptions;
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
  selectState,
}: {
  entry: KanjiResult;
  index: number;
  options: ShowPopupOptions;
  selectState: 'unselected' | 'selected' | 'flash';
}): HTMLElement {
  const containerElement = html('div', {
    /* Make sure it's possible to scroll all the way to the bottom of each kanji
     * table. */
    style:
      'scroll-snap-align: start; scroll-margin-bottom: var(--expand-button-allowance);',
  });
  render(
    h(
      PopupOptionsProvider,
      { interactive: options.interactive },
      h(KanjiEntry, {
        entry,
        index,
        kanjiReferences: options.kanjiReferences,
        onStartCopy: options.onStartCopy,
        selectState,
        showComponents: options.showKanjiComponents,
      })
    ),
    containerElement
  );
  return containerElement;
}
