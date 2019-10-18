import { KanjiResult } from '@birchill/hikibiki-data';

import {
  CopyKeys,
  CopyType,
  CopyKanjiKeyStrings,
  CopyNextKeyStrings,
} from './copy-keys';
import { getKeyForTag } from './name-tags';
import { NameDefinition, NameEntry, QueryResult, WordEntry } from './query';
import { getReferenceNames, ReferenceAbbreviation } from './refs';

export const enum CopyState {
  Inactive,
  Active,
  Finished,
  Error,
}

export interface PopupOptions {
  showDefinitions: boolean;
  kanjiReferences: Array<ReferenceAbbreviation>;
  showKanjiComponents?: boolean;
  copyNextKey: string;
  copyState?: CopyState;
  // Set when copyState !== CopyState.Inactive
  copyIndex?: number;
  // Set when copyState === CopyState.Finished
  copyType?: CopyType;
}

export function renderPopup(
  result: QueryResult,
  options: PopupOptions
): HTMLElement | DocumentFragment {
  if (result.type === 'kanji') {
    return renderKanjiEntry(result.data, options);
  }

  if (result.type === 'names') {
    return renderNamesEntries(result.data, result.more, options);
  }

  return renderWordEntries(result.data, result.title, result.more, options);
}

function renderWordEntries(
  entries: Array<WordEntry>,
  title: string | null,
  more: boolean,
  options: PopupOptions
): HTMLElement {
  const container = document.createElement('div');
  container.classList.add('wordlist');

  if (title) {
    const titleDiv = document.createElement('div');
    container.append(titleDiv);
    titleDiv.classList.add('title');
    titleDiv.append(title);
  }

  let index = 0;
  const selectedIndex = getSelectedIndex(options, entries.length);
  for (const entry of entries) {
    const entryDiv = document.createElement('div');
    container.append(entryDiv);

    entryDiv.classList.add('entry');
    if (index === selectedIndex) {
      entryDiv.classList.add(
        options.copyState === CopyState.Active ? '-selected' : '-flash'
      );
    }
    index++;

    const headingDiv = document.createElement('div');
    entryDiv.append(headingDiv);

    const kanjiSpan = document.createElement('span');
    headingDiv.append(kanjiSpan);
    kanjiSpan.classList.add(entry.kana.length ? 'w-kanji' : 'w-kana');
    kanjiSpan.append(entry.kanjiKana);

    for (const kana of entry.kana) {
      if (headingDiv.lastElementChild!.classList.contains('w-kana')) {
        headingDiv.append('、 ');
      }
      const kanaSpan = document.createElement('span');
      headingDiv.append(kanaSpan);
      kanaSpan.classList.add('w-kana');
      kanaSpan.append(kana);
    }

    if (entry.romaji.length) {
      const romajiSpan = document.createElement('span');
      headingDiv.append(romajiSpan);
      romajiSpan.classList.add('w-romaji');
      for (const romaji of entry.romaji) {
        if (romajiSpan.textContent) {
          romajiSpan.textContent += `, ${romaji}`;
        } else {
          romajiSpan.textContent = romaji;
        }
      }
    }

    if (entry.reason) {
      const reasonSpan = document.createElement('span');
      headingDiv.append(reasonSpan);
      reasonSpan.classList.add('w-conj');
      reasonSpan.append(`(${entry.reason})`);
    }

    if (options.showDefinitions) {
      const definitionSpan = document.createElement('span');
      entryDiv.append(definitionSpan);
      definitionSpan.classList.add('w-def');
      definitionSpan.append(entry.definition);
    }
  }

  if (more) {
    const moreDiv = document.createElement('div');
    moreDiv.classList.add('more');
    moreDiv.append('...');
    container.append(moreDiv);
  }

  const copyDetails = renderCopyDetails(
    options.copyNextKey,
    options.copyState,
    typeof options.copyType !== 'undefined' ? options.copyType : undefined
  );
  if (copyDetails) {
    container.append(copyDetails);
  }

  return container;
}

function renderNamesEntries(
  entries: Array<NameEntry>,
  more: boolean,
  options: PopupOptions
): HTMLElement {
  const container = document.createElement('div');

  const titleDiv = document.createElement('div');
  container.append(titleDiv);
  titleDiv.classList.add('title');
  titleDiv.append(browser.i18n.getMessage('content_names_dictionary'));

  const namesTable = document.createElement('div');
  container.append(namesTable);
  namesTable.classList.add('name-table');

  if (entries.length > 4) {
    namesTable.classList.add('-multicol');
  }

  let index = 0;
  const selectedIndex = getSelectedIndex(options, entries.length);
  for (const entry of entries) {
    const entryDiv = document.createElement('div');
    entryDiv.classList.add('entry');
    if (index === selectedIndex) {
      entryDiv.classList.add(
        options.copyState === CopyState.Active ? '-selected' : '-flash'
      );
    }
    index++;

    const entryTitleDiv = document.createElement('div');
    entryTitleDiv.classList.add('w-title');
    entryDiv.append(entryTitleDiv);

    for (const name of entry.names) {
      const entryHeadingDiv = document.createElement('div');
      entryHeadingDiv.classList.add('heading');

      if (name.kanji) {
        const kanjiSpan = document.createElement('span');
        entryHeadingDiv.append(kanjiSpan);
        kanjiSpan.classList.add('w-kanji');
        kanjiSpan.append(name.kanji);
      }

      const kanaSpan = document.createElement('span');
      entryHeadingDiv.append(kanaSpan);
      kanaSpan.classList.add('w-kana');
      kanaSpan.append(name.kana);

      entryTitleDiv.append(entryHeadingDiv);
    }

    entryDiv.append(renderNameDefinition(entry.definition));

    namesTable.append(entryDiv);
  }

  if (more) {
    const moreDiv = document.createElement('div');
    moreDiv.classList.add('more');
    moreDiv.append('...');
    namesTable.append(moreDiv);
  }

  const copyDetails = renderCopyDetails(
    options.copyNextKey,
    options.copyState,
    typeof options.copyType !== 'undefined' ? options.copyType : undefined
  );
  if (copyDetails) {
    container.append(copyDetails);
  }

  return container;
}

function renderNameDefinition(definition: NameDefinition): HTMLDivElement {
  const definitionSpan = document.createElement('div');
  definitionSpan.classList.add('w-def');
  definitionSpan.append(definition.text);

  for (const tag of definition.tags) {
    const tagKey = getKeyForTag(tag);
    const tagText = browser.i18n.getMessage(`content_names_tag_${tagKey}`);
    if (!tagText) {
      continue;
    }

    const tagSpan = document.createElement('span');
    tagSpan.classList.add('tag');
    tagSpan.classList.add(`tag-${tagKey}`);
    tagSpan.append(tagText);
    definitionSpan.append(tagSpan);
  }

  return definitionSpan;
}

function getSelectedIndex(options: PopupOptions, numEntries: number) {
  return typeof options.copyState !== 'undefined' &&
    options.copyState !== CopyState.Inactive &&
    typeof options.copyIndex !== 'undefined' &&
    numEntries
    ? options.copyIndex % numEntries
    : -1;
}

function renderKanjiEntry(
  entry: KanjiResult,
  options: PopupOptions
): HTMLElement | DocumentFragment {
  const container = document.createDocumentFragment();

  // Main table
  const table = document.createElement('div');
  container.append(table);
  table.classList.add('kanji-table');

  if (options.copyState === CopyState.Active) {
    table.classList.add('-copy');
  } else if (
    options.copyState === CopyState.Finished ||
    options.copyState === CopyState.Error
  ) {
    table.classList.add('-finished');
  }

  // Top part
  const topPart = document.createElement('div');
  topPart.classList.add('top-part');
  table.append(topPart);

  // The kanji itself
  const kanjiDiv = document.createElement('div');
  kanjiDiv.classList.add('kanji');
  kanjiDiv.append(entry.c);
  topPart.append(kanjiDiv);

  // Kanji components
  if (
    typeof options.showKanjiComponents === 'undefined' ||
    options.showKanjiComponents
  ) {
    topPart.append(renderKanjiComponents(entry));
  }

  // Readings
  table.append(renderReadings(entry));

  // English
  const meaningsDiv = document.createElement('div');
  meaningsDiv.classList.add('meanings');
  meaningsDiv.append(entry.m.join(', '));
  table.append(meaningsDiv);

  // Misc info
  table.append(renderMiscRow(entry));

  // Reference row
  table.append(renderReferences(entry, options));

  // Copy details
  const copyDetails = renderCopyDetails(
    options.copyNextKey,
    options.copyState,
    typeof options.copyType !== 'undefined' ? options.copyType : undefined,
    {
      kanji: true,
    }
  );
  if (copyDetails) {
    container.append(copyDetails);
  }

  return container;
}

function renderKanjiComponents(entry: KanjiResult): HTMLElement {
  const componentsDiv = document.createElement('div');
  componentsDiv.classList.add('components');

  const componentsTable = document.createElement('table');
  componentsDiv.append(componentsTable);

  // The radical row is special. It has special highlighting, we show all
  // readings and meanings (not just the first of each), and we also show
  // the base radical, if any.
  const addRadicalRow = () => {
    const { rad } = entry;

    const row = document.createElement('tr');
    row.classList.add('-radical');
    componentsTable.append(row);

    const radicalCell = document.createElement('td');
    row.append(radicalCell);
    radicalCell.classList.add('char');
    radicalCell.append((rad.b || rad.k)!);
    radicalCell.lang = 'ja';

    const readingCell = document.createElement('td');
    row.append(readingCell);
    readingCell.classList.add('reading');
    readingCell.append(rad.na.join('、'));
    radicalCell.lang = 'ja';

    const meaningCell = document.createElement('td');
    row.append(meaningCell);
    meaningCell.classList.add('meaning');
    meaningCell.append(rad.m.join(', '));

    if (rad.base) {
      const baseRow = document.createElement('tr');
      baseRow.classList.add('-baseradical');
      componentsTable.append(baseRow);

      const baseChar = (rad.base.b || rad.base.k)!;
      const baseReadings = rad.base.na.join('、');
      const fromText = browser.i18n.getMessage('content_kanji_base_radical', [
        baseChar,
        baseReadings,
      ]);

      const baseCell = document.createElement('td');
      baseCell.setAttribute('colspan', '3');
      baseCell.innerText = fromText;
      baseRow.append(baseCell);
    }
  };

  // Typically, the radical will also be one of the components, but in case it's
  // not (the data is frequently hand-edited, after all), make sure we add it
  // first.
  if (
    !entry.comp.some(comp => comp.c === entry.rad.b || comp.c === entry.rad.k)
  ) {
    addRadicalRow();
  }

  for (const component of entry.comp) {
    if (component.c === entry.rad.b || component.c === entry.rad.k) {
      addRadicalRow();
      continue;
    }

    const row = document.createElement('tr');
    componentsTable.append(row);

    const radicalCell = document.createElement('td');
    row.append(radicalCell);
    radicalCell.classList.add('char');
    radicalCell.append(component.c);

    const readingCell = document.createElement('td');
    row.append(readingCell);
    readingCell.classList.add('reading');
    readingCell.append(component.na.length ? component.na[0] : '-');

    const meaningCell = document.createElement('td');
    row.append(meaningCell);
    meaningCell.classList.add('meaning');
    meaningCell.append(component.m.length ? component.m[0] : '-');
  }

  return componentsDiv;
}

function renderReadings(entry: KanjiResult): HTMLElement {
  // Readings
  const readingsDiv = document.createElement('div');
  readingsDiv.classList.add('readings');

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
      readingsDiv.append(reading.substr(0, highlightIndex));
      const okuriganaSpan = document.createElement('span');
      okuriganaSpan.classList.add('okurigana');
      okuriganaSpan.append(reading.substr(highlightIndex + 1));
      readingsDiv.append(okuriganaSpan);
    }

    hasPrecedingEntries = true;
  }

  // Name readings
  if (entry.r.na && entry.r.na.length) {
    const nanoriLabelSpan = document.createElement('span');
    nanoriLabelSpan.classList.add('nanorilabel');
    nanoriLabelSpan.append(
      browser.i18n.getMessage('content_kanji_nanori_label')
    );
    readingsDiv.append(
      document.createElement('br'),
      nanoriLabelSpan,
      ` ${entry.r.na.join('、')}`
    );
  }

  return readingsDiv;
}

function renderMiscRow(entry: KanjiResult): HTMLElement {
  // Misc information row
  const miscInfoDiv = document.createElement('div');
  miscInfoDiv.classList.add('misc');

  // Strokes
  const strokesDiv = document.createElement('div');
  strokesDiv.classList.add('strokes');
  strokesDiv.append(renderBrush());
  const strokeCount = document.createElement('span');
  strokeCount.textContent =
    entry.misc.sc === 1
      ? browser.i18n.getMessage('content_kanji_strokes_label_1')
      : browser.i18n.getMessage('content_kanji_strokes_label', [
          String(entry.misc.sc),
        ]);
  strokesDiv.append(strokeCount);
  miscInfoDiv.append(strokesDiv);

  // Frequency
  const frequencyDiv = document.createElement('div');
  frequencyDiv.classList.add('freq');
  frequencyDiv.append(renderFrequency(entry.misc.freq));
  const frequency = document.createElement('span');
  if (entry.misc.freq) {
    frequency.textContent =
      browser.i18n.getMessage('content_kanji_frequency_label') +
      ` ${entry.misc.freq}`;
    const denominator = document.createElement('span');
    denominator.classList.add('denom');
    denominator.append(' / 2,500');
    frequency.append(denominator);
  } else {
    frequency.textContent = '-';
  }
  frequencyDiv.append(frequency);
  miscInfoDiv.append(frequencyDiv);

  // Grade
  const gradeDiv = document.createElement('div');
  gradeDiv.classList.add('grade');
  gradeDiv.append(renderUser());
  const grade = document.createElement('span');
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

const SVG_NS = 'http://www.w3.org/2000/svg';

let brushSvg: SVGElement | undefined;
function renderBrush(): SVGElement {
  if (!brushSvg) {
    brushSvg = document.createElementNS(SVG_NS, 'svg');
    brushSvg.classList.add('svgicon');
    brushSvg.style.opacity = '0.5';
    brushSvg.setAttribute('viewBox', '0 0 90 90');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M80 11c-2-2-5-2-7 0L22 58l12 12 46-52c2-2 2-5 0-7zM11 82c11 0 17-3 20-11L21 61c-12 6-3 14-10 21z'
    );
    brushSvg.append(path);
  }

  return brushSvg;
}

function renderFrequency(frequency: number | undefined): SVGElement {
  const freqSvg = document.createElementNS(SVG_NS, 'svg');
  freqSvg.classList.add('svgicon');
  freqSvg.setAttribute('viewBox', '0 0 8 8');

  const rect1 = document.createElementNS(SVG_NS, 'rect');
  rect1.setAttribute('x', '0');
  rect1.setAttribute('y', '5');
  rect1.setAttribute('width', '2');
  rect1.setAttribute('height', '3');
  rect1.setAttribute('rx', '0.5');
  rect1.setAttribute('ry', '0.5');
  if (!frequency) {
    rect1.setAttribute('opacity', '0.5');
  }
  freqSvg.append(rect1);

  const rect2 = document.createElementNS(SVG_NS, 'rect');
  rect2.setAttribute('x', '3');
  rect2.setAttribute('y', '3');
  rect2.setAttribute('width', '2');
  rect2.setAttribute('height', '5');
  rect2.setAttribute('rx', '0.5');
  rect2.setAttribute('ry', '0.5');
  if (!frequency || frequency >= (2500 * 2) / 3) {
    rect2.setAttribute('opacity', '0.5');
  }
  freqSvg.append(rect2);

  const rect3 = document.createElementNS(SVG_NS, 'rect');
  rect3.setAttribute('x', '6');
  rect3.setAttribute('width', '2');
  rect3.setAttribute('height', '8');
  rect3.setAttribute('rx', '0.5');
  rect3.setAttribute('ry', '0.5');
  if (!frequency || frequency >= 2500 / 3) {
    rect3.setAttribute('opacity', '0.5');
  }
  freqSvg.append(rect3);

  return freqSvg;
}

let userSvg: SVGElement | undefined;
function renderUser(): SVGElement {
  if (!userSvg) {
    userSvg = document.createElementNS(SVG_NS, 'svg');
    userSvg.classList.add('svgicon');
    userSvg.style.opacity = '0.5';
    userSvg.setAttribute('viewBox', '0 0 8 8');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M4 8C1.93 8 .25 7.73.25 7.25V7c0-.9.69-1.39 1.02-1.55.33-.16 1.04-.38 1.34-.57L3 4.62s0-.04 0 0v-.37a2.62 2.62 0 0 1-.44-1.05c-.15.05-.33-.14-.4-.42-.07-.27-.01-.52.13-.56h.02l-.06-.82c0-.21-.03-.39.23-.76.27-.36.5-.22.5-.22s.17-.18.32-.26c.16-.08.54-.28 1.24-.07.69.2.96.3 1.13 1.1.1.46.07.8.04 1.03h.02c.14.03.2.29.12.56-.07.27-.24.46-.38.43-.1.44-.24.75-.47 1.04v.37c0-.01 0 0 0 0s.08.07.37.26c.3.2 1.02.41 1.35.57.32.16 1 .69 1.03 1.55v.25C7.75 7.73 6.07 8 4 8z'
    );
    userSvg.append(path);
  }

  return userSvg;
}

function renderReferences(
  entry: KanjiResult,
  options: PopupOptions
): HTMLElement {
  const referenceTable = document.createElement('div');
  referenceTable.classList.add('references');

  const referenceNames = getReferenceNames({
    lang: 'en',
    selectedRefs: options.kanjiReferences,
  });

  for (const ref of referenceNames) {
    let value: string;
    switch (ref.ref) {
      case 'radical':
        {
          const { rad } = entry;
          const radChar = rad.base ? rad.base.b || rad.base.k : rad.b || rad.k;
          value = `${rad.x} ${radChar}`;
        }
        break;

      case 'nelson_r':
        if (!entry.rad.nelson) {
          continue;
        }
        value = `${entry.rad.nelson} ${String.fromCodePoint(
          entry.rad.nelson + 0x2eff
        )}`;
        break;

      case 'kk':
        value = renderKanKen(entry.misc.kk);
        break;

      case 'jlpt':
        value = entry.misc.jlpt ? String(entry.misc.jlpt) : '-';
        break;

      case 'unicode':
        value = `U+${entry.c
          .codePointAt(0)!
          .toString(16)
          .toUpperCase()}`;
        break;

      default:
        value = entry.refs[ref.ref] ? String(entry.refs[ref.ref]) : '-';
        break;
    }

    const referenceCell = document.createElement('div');
    referenceCell.classList.add('ref');
    referenceTable.append(referenceCell);

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('name');
    nameSpan.append(ref.short || ref.full);
    referenceCell.append(nameSpan);

    const valueSpan = document.createElement('span');
    valueSpan.classList.add('value');
    valueSpan.append(value);
    referenceCell.append(valueSpan);
  }

  return referenceTable;
}

function renderKanKen(level: number | undefined): string {
  if (!level) {
    return '—';
  }
  if (level === 15) {
    return browser.i18n.getMessage('content_kanji_kentei_level_pre', ['1']);
  }
  if (level === 25) {
    return browser.i18n.getMessage('content_kanji_kentei_level_pre', ['2']);
  }
  return browser.i18n.getMessage('content_kanji_kentei_level', [String(level)]);
}

function renderCopyDetails(
  copyNextKey: string,
  copyState?: CopyState,
  copyType?: CopyType,
  options: { kanji: boolean } = { kanji: false }
): HTMLElement | null {
  if (typeof copyState === 'undefined' || copyState === CopyState.Inactive) {
    return null;
  }

  const copyDiv = document.createElement('div');
  copyDiv.classList.add('copy');

  const keysDiv = document.createElement('div');
  keysDiv.classList.add('keys');
  copyDiv.append(keysDiv);

  keysDiv.append(browser.i18n.getMessage('content_copy_keys_label') + ' ');

  const copyKeys: Array<{ key: string; l10nKey: string }> = CopyKeys.map(
    ({ key, type, popupString }) => {
      if (type === CopyType.Word && options.kanji) {
        return { key, l10nKey: CopyKanjiKeyStrings.popupString };
      } else {
        return { key, l10nKey: popupString };
      }
    }
  );
  copyKeys.push({
    key: copyNextKey,
    l10nKey: CopyNextKeyStrings.popupString,
  });

  for (const copyKey of copyKeys) {
    const keyElem = document.createElement('kbd');
    keyElem.append(copyKey.key);
    keysDiv.append(keyElem, ' = ' + browser.i18n.getMessage(copyKey.l10nKey));
    if (copyKey.key !== copyNextKey) {
      keysDiv.append(', ');
    }
  }

  if (copyState === CopyState.Finished && typeof copyType !== 'undefined') {
    copyDiv.classList.add('-finished');
    copyDiv.append(renderCopyStatus(getCopiedString(copyType)));
  } else if (copyState === CopyState.Error) {
    copyDiv.classList.add('-error');
    copyDiv.append(
      renderCopyStatus(browser.i18n.getMessage('content_copy_error'))
    );
  }

  return copyDiv;
}

function getCopiedString(target: CopyType): string {
  switch (target) {
    case CopyType.Entry:
      return browser.i18n.getMessage('content_copied_entry');

    case CopyType.TabDelimited:
      return browser.i18n.getMessage('content_copied_fields');

    case CopyType.Word:
      return browser.i18n.getMessage('content_copied_word');
  }
}

function renderCopyStatus(message: string): HTMLElement {
  const status = document.createElement('div');
  status.classList.add('status');
  status.innerText = message;
  return status;
}

export default renderPopup;
