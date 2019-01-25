import { NameDefinition, NameEntry, QueryResult, WordEntry } from './query';
import {
  CopyKeys,
  CopyType,
  CopyKanjiKeyStrings,
  CopyNextKeyStrings,
} from './copy-keys';
import { getKeyForTag } from './name-tags';

export const enum CopyState {
  Inactive,
  Active,
  Finished,
  Error,
}

export interface PopupOptions {
  showDefinitions: boolean;
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
  entry: KanjiEntry,
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

  // Summary information
  const summaryTable = document.createElement('div');
  table.append(summaryTable);
  summaryTable.classList.add('summary-box');

  const radicalCell = document.createElement('div');
  summaryTable.append(radicalCell);
  radicalCell.classList.add('cell');
  radicalCell.append(browser.i18n.getMessage('content_kanji_radical_label'));
  radicalCell.append(document.createElement('br'));
  radicalCell.append(`${entry.radical} ${entry.misc.C || entry.misc.B}`);

  const gradeCell = document.createElement('div');
  summaryTable.append(gradeCell);
  gradeCell.classList.add('cell');
  let grade = document.createDocumentFragment();
  switch (entry.misc.G || '') {
    case '8':
      grade.append(browser.i18n.getMessage('content_kanji_grade_general_use'));
      break;
    case '9':
      grade.append(browser.i18n.getMessage('content_kanji_grade_name_use'));
      break;
    default:
      if (
        typeof entry.misc.G === 'undefined' ||
        isNaN(parseInt(entry.misc.G))
      ) {
        grade.append('-');
      } else {
        grade.append(browser.i18n.getMessage('content_kanji_grade_label'));
        grade.append(document.createElement('br'));
        grade.append(entry.misc.G);
      }
      break;
  }
  gradeCell.append(grade);

  const frequencyCell = document.createElement('div');
  summaryTable.append(frequencyCell);
  frequencyCell.classList.add('cell');
  frequencyCell.append(
    browser.i18n.getMessage('content_kanji_frequency_label')
  );
  frequencyCell.append(document.createElement('br'));
  frequencyCell.append(entry.misc.F || '-');

  const strokesCell = document.createElement('div');
  summaryTable.append(strokesCell);
  strokesCell.classList.add('cell');
  strokesCell.append(browser.i18n.getMessage('content_kanji_strokes_label'));
  strokesCell.append(document.createElement('br'));
  strokesCell.append(entry.misc.S);

  // Kanji components
  if (entry.components) {
    const componentsTable = document.createElement('table');
    componentsTable.classList.add('k-bbox-tb');
    table.append(componentsTable);

    entry.components.forEach((component, index) => {
      const row = document.createElement('tr');
      componentsTable.append(row);

      const radicalCell = document.createElement('td');
      row.append(radicalCell);
      radicalCell.classList.add(`k-bbox-${(index + 1) % 2}a`);
      radicalCell.append(component.radical);

      const readingCell = document.createElement('td');
      row.append(readingCell);
      readingCell.classList.add(`k-bbox-${(index + 1) % 2}b`);
      readingCell.append(component.yomi);

      const englishCell = document.createElement('td');
      row.append(englishCell);
      englishCell.classList.add(`k-bbox-${(index + 1) % 2}b`);
      englishCell.append(component.english);
    });
  }

  // The kanji itself
  const kanjiSpan = document.createElement('span');
  kanjiSpan.classList.add('k-kanji');
  kanjiSpan.append(entry.kanji);
  table.append(kanjiSpan);
  table.append(document.createElement('br'));

  // English
  const englishDiv = document.createElement('div');
  englishDiv.classList.add('k-eigo');
  englishDiv.append(entry.eigo);
  table.append(englishDiv);

  // Readings
  const yomiDiv = document.createElement('div');
  yomiDiv.classList.add('k-yomi');
  table.append(yomiDiv);

  // Readings come in the form:
  //
  //  ヨ、 あた.える、 あずか.る、 くみ.する、 ともに
  //
  // We want to take the bit after the '.' and wrap it in a span with an
  // appropriate class.
  entry.onkun.forEach((reading, index) => {
    if (index !== 0) {
      yomiDiv.append('\u3001');
    }
    const highlightIndex = reading.indexOf('.');
    if (highlightIndex === -1) {
      yomiDiv.append(reading);
    } else {
      yomiDiv.append(reading.substr(0, highlightIndex));
      const highlightSpan = document.createElement('span');
      highlightSpan.classList.add('k-yomi-hi');
      highlightSpan.append(reading.substr(highlightIndex + 1));
      yomiDiv.append(highlightSpan);
    }
  });

  // Optional readings
  if (entry.nanori.length) {
    const nanoriLabelSpan = document.createElement('span');
    nanoriLabelSpan.classList.add('k-yomi-ti');
    nanoriLabelSpan.append('名乗り');
    yomiDiv.append(
      document.createElement('br'),
      nanoriLabelSpan,
      ` ${entry.nanori.join('\u3001')}`
    );
  }

  if (entry.bushumei.length) {
    const bushumeiLabelSpan = document.createElement('span');
    bushumeiLabelSpan.classList.add('k-yomi-ti');
    bushumeiLabelSpan.append('部首名');
    yomiDiv.append(
      document.createElement('br'),
      bushumeiLabelSpan,
      ` ${entry.bushumei.join('\u3001')}`
    );
  }

  // Reference row
  const referenceTable = document.createElement('div');
  referenceTable.classList.add('references');
  table.append(referenceTable);

  for (const ref of entry.miscDisplay) {
    let value = entry.misc[ref.abbrev] || '-';

    const isKanKen = ref.name === 'Kanji Kentei';
    const name = isKanKen
      ? browser.i18n.getMessage('content_kanji_kentei_label')
      : ref.name;

    const nameCell = document.createElement('div');
    nameCell.classList.add('name');
    nameCell.append(name);
    referenceTable.append(nameCell);

    if (isKanKen) {
      if (value.endsWith('.5')) {
        value = browser.i18n.getMessage(
          'content_kanji_kentei_level_pre',
          value.substring(0, 1)
        );
      } else {
        value = browser.i18n.getMessage('content_kanji_kentei_level', value);
      }
    }

    const valueCell = document.createElement('div');
    valueCell.classList.add('value');
    valueCell.append(value);
    referenceTable.append(valueCell);
  }

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
