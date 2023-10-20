import { KanjiResult } from '@birchill/jpdict-idb';
import browser from 'webextension-polyfill';

import { getSelectedReferenceLabels } from '../../common/refs';
import { html } from '../../utils/builder';

import { getReferenceValue } from '../reference-value';

import { renderFrequency, renderPencil, renderPerson } from './icons';
import { getLangTag } from './lang-tag';
import { PopupOptions } from './popup';
import { getSelectedIndex } from './selected-index';
import { popupHasSelectedText } from './selection';

export function renderKanjiEntries({
  entries,
  options,
}: {
  entries: ReadonlyArray<KanjiResult>;
  options: PopupOptions;
}): HTMLElement {
  const container = html('div', { class: 'kanjilist entry-data' });

  const selectedIndex = getSelectedIndex(options, entries.length);
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
  options: PopupOptions;
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
  if (
    typeof options.showKanjiComponents === 'undefined' ||
    options.showKanjiComponents
  ) {
    topRightPart.append(renderKanjiComponents(entry));
  }

  // Reference row
  if (options.kanjiReferences && options.kanjiReferences.length) {
    table.append(renderReferences(entry, options));
  }

  return table;
}

function renderKanjiComponents(entry: KanjiResult): HTMLElement {
  const componentsDiv = html('div', { class: 'components' });

  const componentsTable = html('table', {});
  componentsDiv.append(componentsTable);

  // The radical row is special. It has special highlighting, we show all
  // readings and meanings (not just the first of each), and we also show
  // the base radical, if any.
  const addRadicalRow = () => {
    const { rad } = entry;

    componentsTable.append(
      html(
        'tr',
        { class: '-radical' },
        html('td', { class: 'char', lang: 'ja' }, (rad.b || rad.k)!),
        html('td', { class: 'reading', lang: 'ja' }, rad.na.join('、')),
        html('td', { class: 'meaning', lang: rad.m_lang }, rad.m.join(', '))
      )
    );

    if (rad.base) {
      const baseChar = (rad.base.b || rad.base.k)!;
      const baseReadings = rad.base.na.join('、');
      const fromText = browser.i18n.getMessage('content_kanji_base_radical', [
        baseChar,
        baseReadings,
      ]);

      componentsTable.append(
        html(
          'tr',
          { class: '-baseradical', lang: getLangTag() },
          html('td', { colspan: '3' }, fromText)
        )
      );
    }
  };

  // Typically, the radical will also be one of the components, but in case it's
  // not (the data is frequently hand-edited, after all), make sure we add it
  // first.
  if (
    !entry.comp.some((comp) => comp.c === entry.rad.b || comp.c === entry.rad.k)
  ) {
    addRadicalRow();
  }

  for (const component of entry.comp) {
    if (component.c === entry.rad.b || component.c === entry.rad.k) {
      addRadicalRow();
      continue;
    }

    componentsTable.append(
      html(
        'tr',
        {},
        html('td', { class: 'char', lang: 'ja' }, component.c),
        html(
          'td',
          { class: 'reading', lang: 'ja' },
          component.na.length ? component.na[0] : '-'
        ),
        html(
          'td',
          { class: 'meaning', lang: component.m_lang },
          component.m.length ? component.m[0] : '-'
        )
      )
    );
  }

  return componentsDiv;
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

function renderReferences(
  entry: KanjiResult,
  options: PopupOptions
): HTMLElement {
  const referenceTable = html('div', {
    class: 'references',
    lang: getLangTag(),
  });

  const referenceNames = getSelectedReferenceLabels(options.kanjiReferences);
  let numReferences = 0;
  for (const ref of referenceNames) {
    // Don't show the Nelson radical if it's the same as the regular radical
    // (in which case it will be empty) and we're showing the regular radical.
    if (
      ref.ref === 'nelson_r' &&
      !entry.rad.nelson &&
      options.kanjiReferences.includes('radical')
    ) {
      continue;
    }

    const referenceCell = html('div', { class: 'ref' });
    referenceTable.append(referenceCell);

    const value = getReferenceValue(entry, ref.ref) || '-';
    referenceCell.append(
      html('span', { class: 'name' }, ref.short || ref.full),
      html(
        'span',
        {
          class: 'value',
          lang:
            ref.ref === 'radical' || ref.ref === 'nelson_r' ? 'ja' : undefined,
        },
        value
      )
    );

    numReferences++;
  }

  // The layout we want is something in-between what CSS grid and CSS multicol
  // can do. See:
  //
  //   https://twitter.com/brianskold/status/1186198347184398336
  //
  // In the stylesheet we make let the table flow horizontally, but then here
  // where we know the number of rows, we update it to produce the desired
  // vertical flow.
  if (numReferences > 1) {
    referenceTable.style.gridAutoFlow = 'column';
    referenceTable.style.gridTemplateRows = `repeat(${Math.ceil(
      numReferences / 2
    )}, minmax(min-content, max-content))`;
  }

  // Now we go through and toggle the styles to get the desired alternating
  // effect.
  //
  // We can't easily use nth-child voodoo here because we need to
  // handle unbalanced columns etc. We also can't easily do this in the loop
  // where we generate the cells because we don't know how many references we
  // will generate at that point.
  for (const [index, cell] of [...referenceTable.children].entries()) {
    const row = index % Math.ceil(numReferences / 2);
    if (row % 2 === 0) {
      cell.classList.add('-highlight');
    }
  }

  return referenceTable;
}
