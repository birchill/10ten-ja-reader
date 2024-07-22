import { KanjiResult } from '@birchill/jpdict-idb';
import { h, render } from 'preact';
import browser from 'webextension-polyfill';

import { html } from '../../utils/builder';

import { KanjiComponents } from './KanjiComponents';
import { KanjiReferencesTable } from './KanjiReferencesTable';
import { renderFrequency, renderPencil, renderPerson } from './icons';
import { getLangTag } from './lang-tag';
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

  // -- Top-right part
  const topRightPart = html(
    'div',
    {},
    // -- -- Readings
    renderReadings(entry)
  );
  topPart.append(topRightPart);

  // -- -- Meta
  if (entry.misc.meta) {
    topRightPart.append(renderMeta(entry.misc.meta));
  }

  topRightPart.append(
    // -- -- Meanings
    html('div', { class: 'meanings', lang: entry.m_lang }, entry.m.join(', ')),
    // -- -- Misc info
    renderMiscRow(entry)
  );

  // -- -- Kanji components
  if (options.showKanjiComponents !== false) {
    topRightPart.append(renderKanjiComponents(entry));
  }

  // Reference row
  if (options.kanjiReferences?.length) {
    table.append(renderReferences(entry, options));
  }

  return table;
}

function renderReadings(entry: KanjiResult): HTMLElement {
  const readingsDiv = html('div', { class: 'readings', lang: 'ja' });

  if (entry.r.on && entry.r.on.length) {
    readingsDiv.append(entry.r.on.join('、'));
  }

  // Kun readings sometimes have a . in them separating the initial part that
  // represents the kanji, from the okurigana.
  //
  // e.g. あた.える
  //
  // We want to take the bit after the '.' and wrap it in a span with an
  // appropriate class.
  let hasPrecedingEntries = entry.r.on && entry.r.on.length !== 0;
  for (const reading of entry.r.kun || []) {
    if (hasPrecedingEntries) {
      readingsDiv.append('、');
    }

    const highlightIndex = reading.indexOf('.');
    if (highlightIndex === -1) {
      readingsDiv.append(reading);
    } else {
      readingsDiv.append(
        reading.substring(0, highlightIndex),
        html(
          'span',
          { class: 'okurigana' },
          reading.substring(highlightIndex + 1)
        )
      );
    }

    hasPrecedingEntries = true;
  }

  // Name readings
  if (entry.r.na && entry.r.na.length) {
    readingsDiv.append(
      html('br', {}),
      html(
        'span',
        { class: 'nanorilabel', lang: getLangTag() },
        browser.i18n.getMessage('content_kanji_nanori_label')
      ),
      ` ${entry.r.na.join('、')}`
    );
  }

  return readingsDiv;
}

function renderMeta(meta: Array<string>): HTMLElement {
  const metaDiv = html('div', { class: 'meta' });

  for (const tag of meta) {
    metaDiv.append(
      html(
        'span',
        { class: 'tag', lang: getLangTag() },
        browser.i18n.getMessage(`content_kanji_meta_${tag.replace(' ', '_')}`)
      )
    );
  }

  return metaDiv;
}

function renderMiscRow(entry: KanjiResult): HTMLElement {
  // Misc information row
  const miscInfoDiv = html('div', { class: 'misc', lang: getLangTag() });

  // Strokes
  const pencilIcon = renderPencil();
  pencilIcon.classList.add('svgicon');
  pencilIcon.style.opacity = '0.5';

  miscInfoDiv.append(
    html(
      'div',
      { class: 'strokes' },
      pencilIcon,
      html(
        'span',
        {},
        entry.misc.sc === 1
          ? browser.i18n.getMessage('content_kanji_strokes_label_1')
          : browser.i18n.getMessage('content_kanji_strokes_label', [
              String(entry.misc.sc),
            ])
      )
    )
  );

  // Frequency
  const frequencyIcon = renderFrequency(entry.misc.freq);
  frequencyIcon.classList.add('svgicon');

  const frequencyDiv = html('div', { class: 'frequency' }, frequencyIcon);
  const frequency = html('span', {});
  if (entry.misc.freq) {
    frequency.append(
      browser.i18n.getMessage('content_kanji_frequency_label') +
        ` ${entry.misc.freq.toLocaleString()}`,
      html('span', { class: 'denom' }, ` / ${Number(2500).toLocaleString()}`)
    );
  } else {
    frequency.textContent = '-';
  }
  frequencyDiv.append(frequency);
  miscInfoDiv.append(frequencyDiv);

  // Grade
  const personIcon = renderPerson();
  personIcon.classList.add('svgicon');
  personIcon.style.opacity = '0.5';

  const gradeDiv = html('div', { class: 'grade' }, personIcon);

  const grade = html('span', {});
  switch (entry.misc.gr || 0) {
    case 8:
      grade.append(browser.i18n.getMessage('content_kanji_grade_general_use'));
      break;
    case 9:
      grade.append(browser.i18n.getMessage('content_kanji_grade_name_use'));
      break;
    default:
      if (typeof entry.misc.gr === 'undefined') {
        grade.append('-');
      } else {
        grade.append(
          browser.i18n.getMessage('content_kanji_grade_label', [
            String(entry.misc.gr),
          ])
        );
      }
      break;
  }
  gradeDiv.append(grade);
  miscInfoDiv.append(gradeDiv);

  return miscInfoDiv;
}

function renderKanjiComponents(entry: KanjiResult): HTMLElement {
  // Temporary React root container
  const containerElement = html('div', { class: 'tp-mt-3' });
  render(h(KanjiComponents, entry), containerElement);
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
