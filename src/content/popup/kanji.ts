import { KanjiResult } from '@birchill/jpdict-idb';
import { h, render } from 'preact';

import { html } from '../../utils/builder';

import { KanjiInfo } from './KanjiInfo';
import { KanjiReferencesTable } from './KanjiReferencesTable';
import { getSelectedIndex } from './selected-index';
import { popupHasSelectedText } from './selection';
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
  // Main table
  const table = html('div', { class: 'kanji-table' });
  table.classList.toggle('-selected', selectState === 'selected');
  table.classList.toggle('-flash', selectState === 'flash');

  // Top part
  const topPart = html('div', { class: 'top-part' });
  table.append(topPart);

  // -- The kanji itself
  const kanjiDiv = html('div', { class: 'kanji', lang: 'ja' }, entry.c);
  let lastPointerType = 'touch';
  kanjiDiv.addEventListener('pointerup', (evt) => {
    lastPointerType = evt.pointerType;
  });
  kanjiDiv.addEventListener('click', () => {
    if (popupHasSelectedText(table)) {
      return;
    }

    const trigger = lastPointerType === 'mouse' ? 'mouse' : 'touch';
    options.onStartCopy?.(index, trigger);
  });
  topPart.append(kanjiDiv);

  // Kanji info
  topPart.append(renderKanjiInfo(entry, options.showKanjiComponents !== false));

  // Reference row
  if (options.kanjiReferences?.length) {
    table.append(renderReferences(entry, options));
  }

  return table;
}

function renderKanjiInfo(
  entry: KanjiResult,
  showComponents: boolean
): HTMLElement {
  const containerElement = html('div', { class: 'tp-mt-1.5' });
  render(h(KanjiInfo, { ...entry, showComponents }), containerElement);
  return containerElement;
}

function renderReferences(
  entry: KanjiResult,
  options: ShowPopupOptions
): HTMLElement {
  // Temporary React root container
  const containerElement = html('div');
  render(
    h(KanjiReferencesTable, {
      entry,
      kanjiReferences: options.kanjiReferences,
    }),
    containerElement
  );

  return containerElement;
}
