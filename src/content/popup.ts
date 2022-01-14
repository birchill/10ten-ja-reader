import {
  allMajorDataSeries,
  Gloss,
  GlossType,
  groupSenses,
  KanjiInfo,
  KanjiResult,
  LangSource,
  MajorDataSeries,
  NameTranslation,
  ReadingInfo,
} from '@birchill/hikibiki-data';
import { countMora, moraSubstring } from '@birchill/normal-jp';
import { browser } from 'webextension-polyfill-ts';

import {
  AccentDisplay,
  ContentConfig,
  PartOfSpeechDisplay,
} from '../common/content-config';
import {
  CopyKanjiKeyStrings,
  CopyKeys,
  CopyNextKeyStrings,
  CopyType,
} from '../common/copy-keys';
import {
  getReferenceValue,
  getSelectedReferenceLabels,
  ReferenceAbbreviation,
} from '../common/refs';
import { probablyHasPhysicalKeyboard } from '../utils/device';
import { HTML_NS, SVG_NS } from '../utils/dom-utils';
import { NameResult, Sense, WordResult } from '../background/search-result';
import { getThemeClass } from '../utils/themes';

import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from './content-container';
import { CurrencyMeta } from './currency';
import { convertMeasure, MeasureMeta } from './measure';
import { SelectionMeta } from './meta';
import { NamePreview, QueryResult } from './query';
import { EraInfo, EraMeta, getEraInfo } from './years';

import popupStyles from '../../css/popup.css';
import { NumberMeta } from './numbers';
import { getDob } from '../utils/age';
import { renderCopyOverlay } from './popup/copy-overlay';
import { getLangTag } from './popup/lang-tag';
import {
  renderBook,
  renderCog,
  renderCross,
  renderFrequency,
  renderKanjiIcon,
  renderPencil,
  renderPerson,
  renderStar,
} from './popup/icons';
import { html } from './popup/builder';

// Update NumberFormatOptions definition
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Intl {
    interface NumberFormatOptions {
      compactDisplay?: 'short' | 'long';
      currency?: string;
      // Should be 'symbol' | 'narrowSymbol' | 'code' | 'name' but TS doesn't
      // let us override the type here.
      currencyDisplay?: string;
      // Should be 'standard' | 'accounting' but TS doesn't let us override the
      // type here.
      currencySign?: string;
      // Should be 'lookup' | 'best fit' but TS doesn't let us override the
      // type here.
      notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
      numberingSystem?:
        | 'arab'
        | 'arabext'
        | 'bali'
        | 'beng'
        | 'deva'
        | 'fullwide'
        | 'gujr'
        | 'guru'
        | 'hanidec'
        | 'khmr'
        | 'knda'
        | 'laoo'
        | 'latn'
        | 'limb'
        | 'mlym'
        | 'mong'
        | 'mymr'
        | 'orya'
        | 'tamldec'
        | 'telu'
        | 'thai'
        | 'tibt';
      signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
      // Should be 'decimal' | 'currency' | 'percent' | 'unit' but TS doesn't
      // let us override the type here.
      style?: string;
      unit?: string;
      unitDisplay?: 'short' | 'long' | 'narrow';
      useGrouping?: boolean;
      minimumIntegerDigits?: number;
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
      minimumSignificantDigits?: number;
      maximumSignificantDigits?: number;
    }
  }
}

export type CopyState =
  | {
      kind: 'inactive';
    }
  | {
      kind: 'active';
      index: number;
      mode: 'overlay' | 'keyboard';
    }
  | {
      kind: 'finished';
      type: CopyType;
      index: number;
      mode: 'overlay' | 'keyboard';
    }
  | {
      kind: 'error';
      index: number;
      mode: 'overlay' | 'keyboard';
    };

export interface PopupOptions {
  accentDisplay: AccentDisplay;
  container?: HTMLElement;
  copyNextKey: string;
  copyState: CopyState;
  dictToShow: MajorDataSeries;
  dictLang?: string;
  document?: Document;
  fxData: ContentConfig['fx'];
  hasSwitchedDictionary?: boolean;
  kanjiReferences: Array<ReferenceAbbreviation>;
  meta?: SelectionMeta;
  onCancelCopy?: () => void;
  onStartCopy?: (index: number) => void;
  onCopy?: (copyType: CopyType) => void;
  onClosePopup?: () => void;
  onShowSettings?: () => void;
  onSwitchDictionary?: (newDict: MajorDataSeries) => void;
  posDisplay: PartOfSpeechDisplay;
  popupStyle: string;
  showDefinitions: boolean;
  showPriority: boolean;
  showKanjiComponents?: boolean;
  switchDictionaryKeys: ReadonlyArray<string>;
  tabDisplay: 'top' | 'left' | 'right' | 'none';
  touchMode?: boolean;
}

export function renderPopup(
  result: QueryResult | undefined,
  options: PopupOptions
): HTMLElement | null {
  const doc = options.document || document;
  const container = options.container || getDefaultContainer(doc);
  const touchMode = !!options.touchMode;
  const windowElem = resetContainer({
    container,
    document: doc,
    popupStyle: options.popupStyle,
    touchMode,
  });

  // TODO: We should use `options.document` everywhere in this file and in
  // the other methods too.

  const hasResult = result && (result.words || result.kanji || result.names);
  const showTabs =
    hasResult &&
    result.resultType !== 'db-unavailable' &&
    !result.title &&
    options.tabDisplay !== 'none';
  if (showTabs) {
    windowElem.append(
      renderTabBar({
        onClosePopup: options.onClosePopup,
        onShowSettings: options.onShowSettings,
        onSwitchDictionary: options.onSwitchDictionary,
        queryResult: result,
        selectedTab: options.dictToShow,
      })
    );

    windowElem.dataset.tabSide = options.tabDisplay || 'top';
  }

  const contentContainer = document.createElementNS(HTML_NS, 'div');
  contentContainer.classList.add('content');

  const resultToShow = result?.[options.dictToShow];

  switch (resultToShow?.type) {
    case 'kanji':
      contentContainer.append(
        renderKanjiEntry({ entry: resultToShow.data, options })
      );
      break;

    case 'names':
      contentContainer.append(
        renderNamesEntries({
          entries: resultToShow.data,
          more: resultToShow.more,
          options,
        })
      );
      break;

    case 'words':
      {
        contentContainer.append(
          renderWordEntries({
            entries: resultToShow.data,
            matchLen: resultToShow.matchLen,
            more: resultToShow.more,
            namePreview: result!.namePreview,
            options,
            title: result!.title,
          })
        );
      }
      break;

    default:
      {
        if (!options.meta) {
          return null;
        }

        const metadata = renderMetadata({
          fxData: options.fxData,
          isCombinedResult: false,
          matchLen: 0,
          meta: options.meta,
        });
        if (!metadata) {
          return null;
        }
        metadata.classList.add('-metaonly');

        const metaDataContainer = document.createElementNS(HTML_NS, 'div');
        metaDataContainer.classList.add('wordlist');
        metaDataContainer.classList.add('entry-data');
        metaDataContainer.append(metadata);
        contentContainer.append(metaDataContainer);
      }
      break;
  }

  // Render the copy overlay if needed
  if (showOverlay(options.copyState)) {
    const stackContainer = document.createElementNS(HTML_NS, 'div');
    stackContainer.classList.add('grid-stack');
    const dictionaryContent = contentContainer.lastElementChild as HTMLElement;
    stackContainer.append(dictionaryContent);
    stackContainer.append(
      renderCopyOverlay({
        copyState: options.copyState,
        kanjiReferences: options.kanjiReferences,
        onCancelCopy: options.onCancelCopy,
        onCopy: options.onCopy,
        result: resultToShow || undefined,
        showKanjiComponents: options.showKanjiComponents,
      })
    );
    contentContainer.append(stackContainer);

    // Set the overlay styles for the window, but wait a moment so we can
    // transition the styles in.
    requestAnimationFrame(() => windowElem.classList.add('-has-overlay'));
  }

  // Set copy styles
  switch (options.copyState.kind) {
    case 'active':
      windowElem.classList.add('-copy-active');
      break;

    case 'error':
      windowElem.classList.add('-copy-error');
      break;

    case 'finished':
      windowElem.classList.add('-copy-finished');
      break;
  }

  // Generate status bar contents
  const copyDetails = renderCopyDetails({
    copyNextKey: options.copyNextKey,
    copyState: options.copyState,
    series: resultToShow?.type || 'words',
  });
  const numResultsAvailable = allMajorDataSeries.filter(
    (series) => !!result?.[series]
  ).length;

  let statusBar: HTMLElement | null = null;
  if (copyDetails) {
    statusBar = copyDetails;
  } else if (hasResult && result?.resultType === 'db-updating') {
    statusBar = renderUpdatingStatus();
  } else if (
    showTabs &&
    numResultsAvailable > 1 &&
    options.hasSwitchedDictionary === false &&
    options.switchDictionaryKeys.length &&
    probablyHasPhysicalKeyboard()
  ) {
    statusBar = renderSwitchDictionaryHint(options.switchDictionaryKeys);
  }

  let contentWrapper = contentContainer;
  if (statusBar) {
    contentWrapper = document.createElementNS(HTML_NS, 'div');
    contentWrapper.classList.add('status-bar-wrapper');
    contentWrapper.append(contentContainer);
    contentWrapper.append(statusBar);
  }

  if (!showTabs && options.onClosePopup) {
    const closeButtonWrapper = document.createElementNS(HTML_NS, 'div');
    closeButtonWrapper.classList.add('close-button-wrapper');
    closeButtonWrapper.append(contentWrapper);
    closeButtonWrapper.append(renderCloseButton(options.onClosePopup));
    windowElem.append(closeButtonWrapper);
  } else {
    windowElem.append(contentWrapper);
  }

  return container;
}

function getDefaultContainer(doc: Document): HTMLElement {
  return getOrCreateEmptyContainer({
    doc,
    id: 'tenten-ja-window',
    legacyIds: ['rikaichamp-window'],
    styles: popupStyles.toString(),
  });
}

function resetContainer({
  container,
  document: doc,
  popupStyle,
  touchMode,
}: {
  container: HTMLElement;
  document: Document;
  popupStyle: string;
  touchMode: boolean;
}): HTMLElement {
  const windowDiv = doc.createElementNS(HTML_NS, 'div');
  windowDiv.classList.add('window');

  // Set theme
  windowDiv.classList.add(getThemeClass(popupStyle));

  // Set touch status
  if (touchMode) {
    windowDiv.classList.add('touch');
  }

  if (container.shadowRoot) {
    container.shadowRoot.append(windowDiv);
  } else {
    container.append(windowDiv);
  }

  // Reset the container position and size so that we can consistently measure
  // the size of the popup.
  container.style.removeProperty('left');
  container.style.removeProperty('top');
  container.style.removeProperty('max-width');
  container.style.removeProperty('max-height');

  return windowDiv;
}

export function isPopupVisible(): boolean {
  const popupWindow = getPopupWindow();
  return !!popupWindow && !popupWindow.classList.contains('hidden');
}

export function hidePopup() {
  getPopupWindow()?.classList.add('hidden');
}

export function removePopup() {
  removeContentContainer(['rikaichamp-window', 'tenten-ja-window']);
}

export function setPopupStyle(style: string) {
  const windowElem = getPopupWindow();
  if (!windowElem) {
    return;
  }

  for (const className of windowElem.classList.values()) {
    if (className.startsWith('theme-')) {
      windowElem.classList.remove(className);
    }
  }

  windowElem.classList.add(getThemeClass(style));
}

function getPopupWindow(): HTMLElement | null {
  const contentContainer = document.getElementById('tenten-ja-window');
  return contentContainer && contentContainer.shadowRoot
    ? contentContainer.shadowRoot.querySelector('.window')
    : null;
}

export function isPopupWindow(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.id === 'tenten-ja-window';
}

export function showOverlay(copyState: CopyState): boolean {
  return (
    (copyState.kind === 'active' || copyState.kind === 'error') &&
    copyState.mode === 'overlay'
  );
}

function renderTabBar({
  onClosePopup,
  onShowSettings,
  onSwitchDictionary,
  queryResult,
  selectedTab,
}: {
  onClosePopup?: () => void;
  onShowSettings?: () => void;
  onSwitchDictionary?: (newDict: MajorDataSeries) => void;
  queryResult?: QueryResult;
  selectedTab: MajorDataSeries;
}): HTMLElement {
  const tabBar = document.createElementNS(HTML_NS, 'div');
  tabBar.classList.add('tab-bar');
  tabBar.lang = getLangTag();

  tabBar.addEventListener('pointerup', () => {
    // Dummy event to make Safari not eat clicks on the child links / buttons.
  });

  const list = document.createElementNS(HTML_NS, 'ul');
  list.classList.add('tabs');

  const sections: Array<{
    series: MajorDataSeries;
    renderIcon: () => SVGElement;
  }> = [
    { series: 'words', renderIcon: renderBook },
    { series: 'kanji', renderIcon: renderKanjiIcon },
    { series: 'names', renderIcon: renderPerson },
  ];
  for (const { series, renderIcon } of sections) {
    const li = document.createElementNS(HTML_NS, 'li');
    li.setAttribute('role', 'presentation');
    li.classList.add('tab');

    if (series === selectedTab) {
      li.setAttribute('aria-selected', 'true');
    } else if (!queryResult || !queryResult[series]) {
      li.classList.add('disabled');
    }

    const a = document.createElementNS(HTML_NS, 'a') as HTMLAnchorElement;
    if (series !== selectedTab && onSwitchDictionary) {
      a.href = '#';
      a.onclick = (event: Event) => {
        event.preventDefault();
        onSwitchDictionary(series);
      };
    }
    li.append(a);

    const icon = renderIcon();
    icon.classList.add('icon');
    a.append(icon);

    const label = document.createElementNS(HTML_NS, 'span');
    label.textContent = browser.i18n.getMessage(`tabs_${series}_label`);
    a.append(label);

    list.append(li);
  }
  tabBar.append(list);

  if (onShowSettings) {
    tabBar.append(renderSettingsButton(onShowSettings));
  }

  if (onClosePopup) {
    tabBar.append(renderCloseButton(onClosePopup));
  }

  return tabBar;
}

function renderSettingsButton(onShowSettings: () => void): HTMLElement {
  const settingsButton = html(
    'button',
    {
      'aria-label': browser.i18n.getMessage('popup_settings_label'),
      class: 'settings-button',
      type: 'button',
    },
    renderCog()
  );
  settingsButton.onclick = onShowSettings;

  return html('div', { class: 'settings' }, settingsButton);
}

function renderCloseButton(onClosePopup: () => void): HTMLElement {
  const closeButton = html(
    'button',
    {
      'aria-label': browser.i18n.getMessage('popup_close_label'),
      class: 'close-button',
      type: 'button',
    },
    renderCross()
  );
  closeButton.onclick = (event: MouseEvent) => {
    event.preventDefault();
    onClosePopup();
  };

  return html('div', { class: 'close' }, closeButton);
}

function renderWordEntries({
  entries,
  matchLen,
  more,
  namePreview,
  options,
  title,
}: {
  entries: Array<WordResult>;
  matchLen: number;
  more: boolean;
  namePreview: NamePreview | undefined;
  options: PopupOptions;
  title: string | undefined;
}): HTMLElement {
  const container = document.createElementNS(HTML_NS, 'div');
  container.classList.add('wordlist');
  container.classList.add('entry-data');

  if (title) {
    const titleDiv = document.createElementNS(HTML_NS, 'div');
    container.append(titleDiv);
    titleDiv.classList.add('title');
    titleDiv.lang = 'ja';
    titleDiv.append(title);
  }

  if (options.meta) {
    const metadata = renderMetadata({
      fxData: options.fxData,
      isCombinedResult: true,
      matchLen,
      meta: options.meta,
    });
    if (metadata) {
      container.append(metadata);
    }
  }

  if (namePreview) {
    container.append(renderNamePreview(namePreview));
  }

  const selectedIndex = getSelectedIndex(options, entries.length);
  for (const [index, entry] of entries.entries()) {
    const entryDiv = document.createElementNS(HTML_NS, 'div');
    container.append(entryDiv);

    entryDiv.classList.add('entry');
    if (index === selectedIndex) {
      entryDiv.classList.add(
        options.copyState.kind === 'active' ? '-selected' : '-flash'
      );
    }

    entryDiv.addEventListener('click', () => {
      options.onStartCopy?.(index);
    });

    const headingDiv = document.createElementNS(HTML_NS, 'div');
    entryDiv.append(headingDiv);

    // Sort matched kanji entries first
    const sortedKanji = entry.k
      ? [...entry.k].sort((a, b) => Number(b.match) - Number(a.match))
      : [];
    if (sortedKanji.length) {
      const kanjiSpan = document.createElementNS(HTML_NS, 'span');
      kanjiSpan.classList.add('w-kanji');
      kanjiSpan.lang = 'ja';
      for (const [i, kanji] of sortedKanji.entries()) {
        if (i) {
          const commaSpan = document.createElementNS(HTML_NS, 'span');
          commaSpan.classList.add('w-separator');
          commaSpan.textContent = '、';
          kanjiSpan.append(commaSpan);
        }

        let headwordSpan = kanjiSpan;
        if (!kanji.match) {
          const dimmedSpan = document.createElementNS(HTML_NS, 'span');
          dimmedSpan.classList.add('w-unmatched');
          kanjiSpan.append(dimmedSpan);
          headwordSpan = dimmedSpan;
        }

        headwordSpan.append(kanji.ent);

        appendHeadwordInfo(kanji.i, headwordSpan);
        if (options.showPriority) {
          appendPriorityMark(kanji.p, headwordSpan);
        }
      }
      headingDiv.append(kanjiSpan);
    }

    const matchingKana = entry.r.filter((r) => r.match);
    if (matchingKana.length) {
      const kanaSpan = document.createElementNS(HTML_NS, 'span');
      kanaSpan.classList.add('w-kana');
      kanaSpan.lang = 'ja';
      for (const [i, kana] of matchingKana.entries()) {
        if (i) {
          kanaSpan.append('、 ');
        }
        kanaSpan.append(renderKana(kana, options));
        appendHeadwordInfo(kana.i, kanaSpan);
        if (options.showPriority) {
          appendPriorityMark(kana.p, kanaSpan);
        }
      }
      headingDiv.append(kanaSpan);
    }

    if (entry.romaji?.length) {
      const romajiSpan = document.createElementNS(HTML_NS, 'span');
      romajiSpan.classList.add('w-romaji');
      romajiSpan.lang = 'ja';
      romajiSpan.append(entry.romaji.join(', '));
      headingDiv.append(romajiSpan);
    }

    if (entry.reason) {
      const reasonSpan = document.createElementNS(HTML_NS, 'span');
      headingDiv.append(reasonSpan);
      reasonSpan.lang = getLangTag();
      reasonSpan.classList.add('w-conj');
      reasonSpan.append(`(${entry.reason})`);
    }

    if (options.showDefinitions) {
      entryDiv.append(renderDefinitions(entry, options));
    }
  }

  if (more) {
    const moreDiv = document.createElementNS(HTML_NS, 'div');
    moreDiv.classList.add('more');
    moreDiv.append('...');
    container.append(moreDiv);
  }

  return container;
}

function renderEraInfo(meta: EraMeta, eraInfo: EraInfo): HTMLElement {
  const metaDiv = document.createElementNS(HTML_NS, 'div');
  metaDiv.classList.add('meta', 'era');
  metaDiv.lang = 'ja';

  const eraSpan = document.createElementNS(HTML_NS, 'span');
  eraSpan.classList.add('era-name');

  const rubyBase = document.createElementNS(HTML_NS, 'ruby');
  rubyBase.append(meta.era);

  const rpOpen = document.createElementNS(HTML_NS, 'rp');
  rpOpen.append('(');
  rubyBase.append(rpOpen);

  const rubyText = document.createElementNS(HTML_NS, 'rt');
  rubyText.append(eraInfo.reading);
  rubyBase.append(rubyText);

  const rpClose = document.createElementNS(HTML_NS, 'rp');
  rpClose.append(')');
  rubyBase.append(rpClose);
  eraSpan.append(rubyBase);

  if (meta.year === 0) {
    eraSpan.append('元年');
  } else {
    eraSpan.append(`${meta.year}年`);
  }
  metaDiv.append(eraSpan);

  const equalsSpan = document.createElementNS(HTML_NS, 'span');
  equalsSpan.classList.add('equals');
  equalsSpan.append('=');
  metaDiv.append(equalsSpan);

  const seirekiSpan = document.createElementNS(HTML_NS, 'span');
  seirekiSpan.classList.add('seireki');
  const seireki =
    meta.year === 0 ? eraInfo.start : meta.year - 1 + eraInfo.start;
  seirekiSpan.append(`${seireki}年`);
  metaDiv.append(seirekiSpan);

  return metaDiv;
}

function renderMeasureInfo(meta: MeasureMeta): HTMLElement {
  const converted = convertMeasure(meta);

  const metaDiv = document.createElementNS(HTML_NS, 'div');
  metaDiv.classList.add('meta', 'measure');
  metaDiv.lang = 'ja';

  const mainRow = document.createElementNS(HTML_NS, 'div');
  mainRow.classList.add('main');
  metaDiv.append(mainRow);

  const measureSpan = document.createElementNS(HTML_NS, 'span');
  measureSpan.classList.add('value');
  measureSpan.append(meta.value.toLocaleString());
  measureSpan.append(renderUnit(meta.unit));
  mainRow.append(measureSpan);

  const equalsSpan = document.createElementNS(HTML_NS, 'span');
  equalsSpan.classList.add('equals');
  equalsSpan.append('=');
  mainRow.append(equalsSpan);

  const convertedSpan = document.createElementNS(HTML_NS, 'span');
  convertedSpan.classList.add('value');
  convertedSpan.append(renderValue(converted.value));
  convertedSpan.append(renderUnit(converted.unit));
  mainRow.append(convertedSpan);

  if (converted.alt) {
    for (const { type, label, unit, value } of converted.alt) {
      const altRow = document.createElementNS(HTML_NS, 'div');
      altRow.classList.add('alt');

      const altLabel = document.createElementNS(HTML_NS, 'span');
      if (label) {
        altLabel.append(label);
      }
      const expl = browser.i18n.getMessage(`measure_expl_${type}`);
      if (expl) {
        const altExplLabel = document.createElementNS(HTML_NS, 'span');
        altExplLabel.append(expl);
        altExplLabel.lang = getLangTag();
        altLabel.append(altExplLabel);
      }
      altRow.append(altLabel);

      const altEquals = document.createElementNS(HTML_NS, 'span');
      altEquals.classList.add('equals');
      altEquals.append('=');
      altRow.append(altEquals);

      const altValue = document.createElementNS(HTML_NS, 'span');
      altValue.classList.add('measure');
      altValue.append(renderValue(value));
      altValue.append(renderUnit(unit, { showRuby: false }));
      altRow.append(altValue);

      metaDiv.append(altRow);
    }
  }

  return metaDiv;
}

function renderValue(value: number): string {
  // Round to two decimal places, then to five significant figures
  return parseFloat(round(value, 2).toPrecision(5)).toLocaleString();
}

function round(value: number, places: number): number {
  const base = Math.pow(10, places);
  return Math.round(value * base) / base;
}

function renderUnit(
  unit: MeasureMeta['unit'],
  { showRuby = true }: { showRuby?: boolean } = {}
): HTMLElement {
  const unitSpan = document.createElementNS(HTML_NS, 'span');
  unitSpan.classList.add('unit');

  if (unit === 'm2') {
    unitSpan.append('m');
    const sup = document.createElementNS(HTML_NS, 'sup');
    sup.append('2');
    unitSpan.append(sup);
  } else if (showRuby) {
    const rubyBase = document.createElementNS(HTML_NS, 'ruby');
    rubyBase.append(unit);

    const rpOpen = document.createElementNS(HTML_NS, 'rp');
    rpOpen.append('(');
    rubyBase.append(rpOpen);

    const rubyText = document.createElementNS(HTML_NS, 'rt');
    rubyText.append('じょう');
    rubyBase.append(rubyText);

    const rpClose = document.createElementNS(HTML_NS, 'rp');
    rpClose.append(')');
    rubyBase.append(rpClose);
    unitSpan.append(rubyBase);
  } else {
    unitSpan.append(unit);
  }

  return unitSpan;
}

function renderCurrencyInfo(
  meta: CurrencyMeta,
  fxData: NonNullable<ContentConfig['fx']>
): HTMLElement {
  const metaDiv = document.createElementNS(HTML_NS, 'div');
  metaDiv.classList.add('meta', 'currency');
  metaDiv.lang = 'ja';

  const mainRow = document.createElementNS(HTML_NS, 'div');
  mainRow.classList.add('main');
  metaDiv.append(mainRow);

  const lhs = document.createElementNS(HTML_NS, 'div');
  lhs.classList.add('equation-part');
  mainRow.append(lhs);

  const srcCurrencyLabel = document.createElementNS(HTML_NS, 'span');
  srcCurrencyLabel.classList.add('curr');
  srcCurrencyLabel.append('JPY');
  lhs.append(srcCurrencyLabel);

  const srcSpan = document.createElementNS(HTML_NS, 'span');
  srcSpan.classList.add('src');
  srcSpan.append(
    new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(meta.value)
  );
  lhs.append(srcSpan);

  const equalsSpan = document.createElementNS(HTML_NS, 'span');
  equalsSpan.classList.add('equals');
  equalsSpan.append('≈');
  lhs.append(equalsSpan);

  const rhs = document.createElementNS(HTML_NS, 'div');
  rhs.classList.add('equation-part');
  mainRow.append(rhs);

  const valueCurrencyLabel = document.createElementNS(HTML_NS, 'span');
  valueCurrencyLabel.classList.add('curr');
  valueCurrencyLabel.append(fxData.currency);
  rhs.append(valueCurrencyLabel);

  const valueSpan = document.createElementNS(HTML_NS, 'span');
  valueSpan.classList.add('value');
  const value = meta.value * fxData.rate;
  valueSpan.append(renderCurrencyValue({ currency: fxData.currency, value }));
  rhs.append(valueSpan);

  const timestampRow = document.createElementNS(HTML_NS, 'div');
  timestampRow.classList.add('timestamp');
  const timestampAsDate = new Date(fxData.timestamp);
  const timestampAsString = timestampAsDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  } as any);
  const expl = browser.i18n.getMessage(
    'currency_data_updated_label',
    timestampAsString
  );
  timestampRow.append(expl);
  metaDiv.append(timestampRow);

  return metaDiv;
}

function renderCurrencyValue({
  currency,
  value,
}: {
  currency: string;
  value: number;
}): string {
  // BTC is a bit special because Intl.NumberFormat doesn't support it and if we
  // let it do its fallback rounding to two decimal places we'll lose most of
  // the information.
  //
  // In fact, the convention for BTC appears to be to always use 8 decimal
  // places.
  if (currency === 'BTC') {
    return `\u20bf${value.toFixed(8)}`;
  }

  let formattedValue: string;
  try {
    formattedValue = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(value);
  } catch {
    // Some older browsers may not support all the options above so fall back to
    // general number formatting in that case.
    formattedValue = new Intl.NumberFormat().format(value);
  }

  // Drop redundant currency code.
  //
  // If the browser doesn't have a specific symbol (e.g. $) for the currency,
  // it generally just prepends the currency code (e.g. USD) but that's
  // redundant with our valueCurrencyLabel so we try to detect and drop it in
  // that case.
  formattedValue = formattedValue.replace(
    new RegExp(`^\\s*${currency}\\s*`),
    ''
  );

  return formattedValue;
}

function renderNumberInfo(
  meta: NumberMeta,
  { isCombinedResult }: { isCombinedResult: boolean }
): HTMLElement {
  const metaDiv = document.createElementNS(HTML_NS, 'div');
  metaDiv.classList.add('meta', 'number');

  if (isCombinedResult) {
    const srcSpan = document.createElementNS(HTML_NS, 'span');
    srcSpan.classList.add('src');
    srcSpan.append(meta.src);
    srcSpan.lang = 'ja';
    metaDiv.append(srcSpan);

    const equalsSpan = document.createElementNS(HTML_NS, 'span');
    equalsSpan.classList.add('equals');
    equalsSpan.append('=');
    metaDiv.append(equalsSpan);
  }

  const numberSpan = document.createElementNS(HTML_NS, 'span');
  numberSpan.classList.add('value');
  numberSpan.append(meta.value.toLocaleString());
  metaDiv.append(numberSpan);

  return metaDiv;
}

function renderNamePreview({ names, more }: NamePreview): HTMLElement {
  const container = document.createElementNS(HTML_NS, 'div');
  container.classList.add('bonus-name');

  for (const name of names) {
    container.append(renderName(name));
  }

  if (more) {
    const moreSpan = document.createElementNS(HTML_NS, 'span');
    moreSpan.classList.add('more');
    moreSpan.append('…');
    container.append(moreSpan);
  }

  return container;
}

function renderKana(
  kana: WordResult['r'][0],
  options: PopupOptions
): string | Element {
  const accents = kana.a;
  if (
    options.accentDisplay === 'none' ||
    typeof accents === 'undefined' ||
    (Array.isArray(accents) && !accents.length)
  ) {
    return kana.ent;
  }

  const accentPos = typeof accents === 'number' ? accents : accents[0].i;

  if (options.accentDisplay === 'downstep') {
    if (!accentPos) {
      // accentPos 0 (heiban) is special since there's no accent to show.
      //
      // At the same time we want to distinguish between heiban and
      // "no accent information". So we indicate heiban with a dotted line
      // across the top instead.
      const wrapperSpan = document.createElementNS(HTML_NS, 'span');
      wrapperSpan.classList.add('w-heiban');
      wrapperSpan.textContent = kana.ent;
      return wrapperSpan;
    } else {
      return (
        moraSubstring(kana.ent, 0, accentPos) +
        'ꜜ' +
        moraSubstring(kana.ent, accentPos)
      );
    }
  }

  // Generate binary pitch display
  const wrapperSpan = document.createElementNS(HTML_NS, 'span');
  wrapperSpan.classList.add('w-binary');

  // Accent position 0 (heiban: LHHHHH) and accent position 1 (atamadata: HLLLL)
  // are sufficiently similar that we handle them together.
  if (accentPos === 0 || accentPos === 1) {
    const len = countMora(kana.ent);
    const startSpan = document.createElementNS(HTML_NS, 'span');
    startSpan.classList.add(accentPos ? 'h-l' : len > 1 ? 'l-h' : 'h');
    startSpan.textContent = moraSubstring(kana.ent, 0, 1);
    wrapperSpan.append(startSpan);

    if (len > 1) {
      const endSpan = document.createElementNS(HTML_NS, 'span');
      endSpan.classList.add(accentPos ? 'l' : 'h');
      endSpan.textContent = moraSubstring(kana.ent, 1);
      wrapperSpan.append(endSpan);
    }
  } else {
    // Otherwise we have nakadaka (LHHHHL) or odaka (LHHHH)
    const startSpan = document.createElementNS(HTML_NS, 'span');
    startSpan.classList.add('l-h');
    startSpan.textContent = moraSubstring(kana.ent, 0, 1);
    wrapperSpan.append(startSpan);

    const middleSpan = document.createElementNS(HTML_NS, 'span');
    middleSpan.classList.add('h-l');
    middleSpan.textContent = moraSubstring(kana.ent, 1, accentPos);
    wrapperSpan.append(middleSpan);

    if (accentPos < countMora(kana.ent)) {
      const endSpan = document.createElementNS(HTML_NS, 'span');
      endSpan.classList.add('l');
      endSpan.textContent = moraSubstring(kana.ent, accentPos);
      wrapperSpan.append(endSpan);
    }
  }

  return wrapperSpan;
}

function appendHeadwordInfo(
  info: Array<KanjiInfo> | Array<ReadingInfo> | undefined,
  parent: ParentNode
) {
  if (!info || !info.length) {
    return;
  }

  for (const i of info) {
    const span = document.createElementNS(HTML_NS, 'span');
    span.classList.add('w-head-info');
    span.lang = getLangTag();
    span.append('(');

    // Some KanjiInfo/RadicalInfo values differ only by case but
    // addons-linter (as used by webext etc.) does not allow WebExtension i18n
    // keys to differ by case only.
    //
    // I couldn't find the rationale for this, the rule just magically
    // appears in https://github.com/mozilla/addons-linter/commit/3923b399f8166b59617071730b87048f45122c7e
    // it seems.
    const specialKeys: { [k in KanjiInfo | ReadingInfo]?: string } = {
      iK: 'ikanji',
      ik: 'ikana',
      oK: 'okanji',
      ok: 'okana',
      uK: 'ukanji',
      rK: 'rkanji',
    };
    const key = specialKeys.hasOwnProperty(i) ? specialKeys[i] : i;

    span.append(browser.i18n.getMessage(`head_info_label_${key}`) || i);
    span.append(')');
    parent.append(span);
  }
}

function appendPriorityMark(
  priority: Array<string> | undefined,
  parent: ParentNode
) {
  if (!priority || !priority.length) {
    return;
  }

  // These are the ones that are annotated with a (P) in the EDICT file.
  const highPriorityLabels = ['i1', 'n1', 's1', 's2', 'g1'];
  let highPriority = false;
  for (const p of priority) {
    if (highPriorityLabels.includes(p)) {
      highPriority = true;
      break;
    }
  }

  parent.append(renderStar(highPriority ? 'full' : 'hollow'));
}

function renderDefinitions(entry: WordResult, options: PopupOptions) {
  const senses = entry.s.filter((s) => s.match);
  if (!senses.length) {
    return '';
  }

  const definitionsDiv = document.createElementNS(HTML_NS, 'div');
  definitionsDiv.classList.add('w-def');

  if (senses.length === 1) {
    definitionsDiv.append(renderSense(senses[0], options));
    definitionsDiv.lang = senses[0].lang || 'en';
    if (
      options.dictLang &&
      options.dictLang !== 'en' &&
      senses[0].lang !== options.dictLang
    ) {
      definitionsDiv.classList.add('foreign');
    }
  } else {
    // First extract any native language senses
    const nativeSenses = senses.filter((s) => s.lang && s.lang !== 'en');
    if (nativeSenses.length) {
      const definitionList = document.createElementNS(HTML_NS, 'ul');
      for (const sense of nativeSenses) {
        const listItem = document.createElementNS(HTML_NS, 'li');
        listItem.lang = sense.lang || 'en';
        listItem.append(renderSense(sense, options));
        definitionList.append(listItem);
      }
      definitionsDiv.append(definitionList);
    }

    // Try grouping the remaining (English) definitions by part-of-speech.
    const enSenses = senses.filter((s) => !s.lang || s.lang === 'en');
    const posGroups =
      options.posDisplay !== 'none' ? groupSenses(enSenses) : [];
    const isForeign = !!options.dictLang && options.dictLang !== 'en';

    // Determine if the grouping makes sense
    //
    // If the group headings make the number of lines used to represent
    // all the senses (ignoring word wrapping) grow by more than 50%, we should
    // skip using groups. This will typically be the case where there are no
    // common parts-of-speech, or at least very few.
    const linesWithGrouping = posGroups.length + enSenses.length;
    const linesWithoutGrouping = enSenses.length;
    const useGroups =
      posGroups.length && linesWithGrouping / linesWithoutGrouping <= 1.5;

    if (useGroups) {
      let startIndex = 1;
      for (const group of posGroups) {
        // Group heading
        const groupHeading = document.createElementNS(HTML_NS, 'p');
        groupHeading.classList.add('w-group-head');

        for (const pos of group.pos) {
          const posSpan = document.createElementNS(HTML_NS, 'span');
          posSpan.classList.add('w-pos', 'tag');
          if (options.posDisplay === 'expl') {
            posSpan.lang = getLangTag();
            posSpan.textContent =
              browser.i18n.getMessage(`pos_label_${pos.replace(/-/g, '_')}`) ||
              pos;
          } else {
            posSpan.textContent = pos;
          }
          groupHeading.append(posSpan);
        }

        for (const misc of group.misc) {
          const miscSpan = document.createElementNS(HTML_NS, 'span');
          miscSpan.classList.add('w-misc', 'tag');
          miscSpan.lang = getLangTag();
          miscSpan.textContent =
            browser.i18n.getMessage(`misc_label_${misc.replace(/-/g, '_')}`) ||
            misc;
          groupHeading.append(miscSpan);
        }

        // If there is no group heading, just add a '-' placeholder
        if (!group.pos.length && !group.misc.length) {
          const posSpan = document.createElementNS(HTML_NS, 'span');
          posSpan.classList.add('w-pos', 'tag');
          posSpan.textContent = '-';
          groupHeading.append(posSpan);
        }

        definitionsDiv.append(groupHeading);

        // Group items
        const definitionList = document.createElementNS(
          HTML_NS,
          'ol'
        ) as HTMLOListElement;
        definitionList.start = startIndex;
        for (const sense of group.senses) {
          const listItem = document.createElementNS(HTML_NS, 'li');
          listItem.lang = sense.lang || 'en';
          listItem.append(renderSense(sense, options));
          listItem.classList.toggle('foreign', isForeign);
          definitionList.append(listItem);
          startIndex++;
        }
        definitionsDiv.append(definitionList);
      }
    } else {
      const definitionList = document.createElementNS(HTML_NS, 'ol');
      for (const sense of enSenses) {
        const listItem = document.createElementNS(HTML_NS, 'li');
        listItem.lang = sense.lang || 'en';
        listItem.append(renderSense(sense, options));
        listItem.classList.toggle('foreign', isForeign);
        definitionList.append(listItem);
      }
      definitionsDiv.append(definitionList);
    }
  }

  return definitionsDiv;
}

function renderSense(
  sense: Sense,
  options: PopupOptions
): string | DocumentFragment {
  const fragment = document.createDocumentFragment();

  if (options.posDisplay !== 'none') {
    for (const pos of sense.pos || []) {
      const posSpan = document.createElementNS(HTML_NS, 'span');
      posSpan.classList.add('w-pos', 'tag');
      switch (options.posDisplay) {
        case 'expl':
          posSpan.lang = getLangTag();
          posSpan.append(
            browser.i18n.getMessage(`pos_label_${pos.replace(/-/g, '_')}`) ||
              pos
          );
          break;

        case 'code':
          posSpan.append(pos);
          break;
      }
      fragment.append(posSpan);
    }
  }

  if (sense.field) {
    for (const field of sense.field) {
      const fieldSpan = document.createElementNS(HTML_NS, 'span');
      fieldSpan.classList.add('w-field', 'tag');
      fieldSpan.lang = getLangTag();
      fieldSpan.textContent =
        browser.i18n.getMessage(`field_label_${field}`) || field;
      fragment.append(fieldSpan);
    }
  }

  if (sense.misc) {
    for (const misc of sense.misc) {
      const miscSpan = document.createElementNS(HTML_NS, 'span');
      miscSpan.classList.add('w-misc', 'tag');
      miscSpan.lang = getLangTag();
      miscSpan.textContent =
        browser.i18n.getMessage(`misc_label_${misc.replace(/-/g, '_')}`) ||
        misc;
      fragment.append(miscSpan);
    }
  }

  if (sense.dial) {
    for (const dial of sense.dial) {
      const dialSpan = document.createElementNS(HTML_NS, 'span');
      dialSpan.classList.add('w-dial', 'tag');
      dialSpan.lang = getLangTag();
      dialSpan.textContent =
        browser.i18n.getMessage(`dial_label_${dial}`) || dial;
      fragment.append(dialSpan);
    }
  }

  appendGlosses(sense.g, fragment);

  if (sense.inf) {
    const infSpan = document.createElementNS(HTML_NS, 'span');
    infSpan.classList.add('w-inf');
    // Mark inf as Japanese because it often contains Japanese text
    infSpan.lang = 'ja';
    infSpan.textContent = ` (${sense.inf})`;
    fragment.append(infSpan);
  }

  if (sense.lsrc && sense.lsrc.length) {
    fragment.append(renderLangSources(sense.lsrc));
  }

  return fragment;
}

function appendGlosses(glosses: Array<Gloss>, parent: ParentNode) {
  for (const [i, gloss] of glosses.entries()) {
    if (i) {
      parent.append('; ');
    }

    if (gloss.type && gloss.type !== GlossType.Tm) {
      const typeCode = {
        [GlossType.Expl]: 'expl',
        [GlossType.Fig]: 'fig',
        [GlossType.Lit]: 'lit',
      }[gloss.type];
      const typeStr = typeCode
        ? browser.i18n.getMessage(`gloss_type_label_${typeCode}`)
        : '';
      if (typeStr) {
        const typeSpan = document.createElementNS(HTML_NS, 'span');
        typeSpan.classList.add('w-type');
        typeSpan.lang = getLangTag();
        typeSpan.textContent = `(${typeStr}) `;
        parent.append(typeSpan);
      }
    }

    parent.append(gloss.str);
    if (gloss.type === GlossType.Tm) {
      parent.append('™');
    }
  }
}

function renderLangSources(sources: Array<LangSource>): DocumentFragment {
  const container = document.createDocumentFragment();

  for (const lsrc of sources) {
    container.append(' ');

    let prefix = lsrc.wasei
      ? browser.i18n.getMessage('lang_label_wasei')
      : undefined;
    if (!prefix) {
      prefix =
        browser.i18n.getMessage(`lang_label_${lsrc.lang || 'en'}`) || lsrc.lang;
    }

    const wrapperSpan = document.createElementNS(HTML_NS, 'span');
    wrapperSpan.classList.add('w-lsrc');
    wrapperSpan.lang = getLangTag();
    wrapperSpan.append('(');

    if (prefix && lsrc.src) {
      prefix = `${prefix}: `;
    }
    if (prefix) {
      wrapperSpan.append(prefix);
    }

    if (lsrc.src) {
      const sourceSpan = document.createElementNS(HTML_NS, 'span');
      if (lsrc.lang) {
        sourceSpan.lang = lsrc.lang;
      }
      sourceSpan.textContent = lsrc.src;
      wrapperSpan.append(sourceSpan);
    }

    wrapperSpan.append(')');

    container.append(wrapperSpan);
  }

  return container;
}

function renderNamesEntries({
  entries,
  more,
  options,
}: {
  entries: Array<NameResult>;
  more: boolean;
  options: PopupOptions;
}): HTMLElement {
  const namesTable = document.createElementNS(HTML_NS, 'div');
  namesTable.classList.add('name-table');
  namesTable.classList.add('entry-data');

  if (entries.length > 4) {
    namesTable.classList.add('-multicol');
  }

  const selectedIndex = getSelectedIndex(options, entries.length);
  for (const [index, entry] of entries.entries()) {
    const entryDiv = renderName(entry);
    if (index === selectedIndex) {
      entryDiv.classList.add(
        options.copyState.kind === 'active' ? '-selected' : '-flash'
      );
    }

    entryDiv.addEventListener('click', () => {
      options.onStartCopy?.(index);
    });

    namesTable.append(entryDiv);
  }

  if (more) {
    const moreDiv = document.createElementNS(HTML_NS, 'div');
    moreDiv.classList.add('more');
    moreDiv.append('...');
    namesTable.append(moreDiv);
  }

  return namesTable;
}

function renderName(entry: NameResult): HTMLElement {
  const entryDiv = document.createElementNS(HTML_NS, 'div');
  entryDiv.classList.add('entry');

  const entryTitleDiv = document.createElementNS(HTML_NS, 'div');
  entryTitleDiv.classList.add('w-title');
  entryTitleDiv.lang = 'ja';
  entryDiv.append(entryTitleDiv);

  if (entry.k) {
    const MAX_KANJI = 15;
    const trimKanji = entry.k.length > MAX_KANJI;
    const kanjiToDisplay = trimKanji ? entry.k.slice(0, MAX_KANJI) : entry.k;
    let kanji = kanjiToDisplay.join('、');
    if (trimKanji) {
      kanji += '…';
    }

    const kanjiSpan = document.createElementNS(HTML_NS, 'span');
    entryTitleDiv.append(kanjiSpan);
    kanjiSpan.classList.add('w-kanji');
    kanjiSpan.append(kanji);
  }

  const kana = entry.r.join('、');
  const kanaSpan = document.createElementNS(HTML_NS, 'span');
  entryTitleDiv.append(kanaSpan);
  kanaSpan.classList.add('w-kana');
  kanaSpan.append(kana);

  const definitionBlock = document.createElementNS(HTML_NS, 'div');
  definitionBlock.classList.add('w-def');
  for (const tr of entry.tr) {
    definitionBlock.append(renderNameTranslation(tr));
  }
  entryDiv.append(definitionBlock);

  return entryDiv;
}

function renderNameTranslation(tr: NameTranslation): HTMLSpanElement {
  const definitionSpan = document.createElementNS(HTML_NS, 'div');
  // ENAMDICT only has English glosses
  definitionSpan.lang = 'en';
  // Only add age annotations if the name is for a person
  const annotateDetailFn = tr.type?.includes('person')
    ? annotateAge
    : (det: string) => det;
  definitionSpan.append(tr.det.map(annotateDetailFn).join(', '));

  for (const tag of tr.type || []) {
    const tagText = browser.i18n.getMessage(`content_names_tag_${tag}`);
    if (!tagText) {
      continue;
    }

    const tagSpan = document.createElementNS(HTML_NS, 'span');
    tagSpan.classList.add('tag');
    tagSpan.classList.add(`tag-${tag}`);
    tagSpan.lang = getLangTag();
    tagSpan.append(tagText);
    definitionSpan.append(tagSpan);
  }

  return definitionSpan;
}

function annotateAge(text: string): string {
  const dob = getDob(text);
  if (!dob) {
    return text;
  }

  // Calculate age
  const { date, approx } = dob;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const month = today.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) {
    age--;
  }

  // Sanity check
  if (age < 1 || age > 150) {
    return text;
  }

  const ageString = approx
    ? browser.i18n.getMessage('content_names_age_approx', [String(age)])
    : browser.i18n.getMessage('content_names_age', [String(age)]);

  return `${text} (${ageString})`;
}

function getSelectedIndex(options: PopupOptions, numEntries: number) {
  return options.copyState.kind !== 'inactive' && numEntries
    ? options.copyState.index % numEntries
    : -1;
}

function renderKanjiEntry({
  entry,
  options,
}: {
  entry: KanjiResult;
  options: PopupOptions;
}): HTMLElement {
  // Main table
  const table = document.createElementNS(HTML_NS, 'div');
  table.classList.add('kanji-table');
  table.classList.add('entry-data');

  // Top part
  const topPart = document.createElementNS(HTML_NS, 'div');
  topPart.classList.add('top-part');
  table.append(topPart);

  // -- The kanji itself
  const kanjiDiv = document.createElementNS(HTML_NS, 'div');
  kanjiDiv.classList.add('kanji');
  kanjiDiv.lang = 'ja';
  kanjiDiv.append(entry.c);
  kanjiDiv.addEventListener('click', () => {
    options.onStartCopy?.(0);
  });
  topPart.append(kanjiDiv);

  // -- Top-right part
  const topRightPart = document.createElementNS(HTML_NS, 'div');
  topPart.append(topRightPart);

  // -- -- Readings
  topRightPart.append(renderReadings(entry));

  // -- -- Meta
  if (entry.misc.meta) {
    topRightPart.append(renderMeta(entry.misc.meta));
  }

  // -- -- Meanings
  const meaningsDiv = document.createElementNS(HTML_NS, 'div');
  meaningsDiv.classList.add('meanings');
  meaningsDiv.lang = entry.m_lang;
  meaningsDiv.append(entry.m.join(', '));
  topRightPart.append(meaningsDiv);

  // -- -- Misc info
  topRightPart.append(renderMiscRow(entry));

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
  const componentsDiv = document.createElementNS(HTML_NS, 'div');
  componentsDiv.classList.add('components');

  const componentsTable = document.createElementNS(HTML_NS, 'table');
  componentsDiv.append(componentsTable);

  // The radical row is special. It has special highlighting, we show all
  // readings and meanings (not just the first of each), and we also show
  // the base radical, if any.
  const addRadicalRow = () => {
    const { rad } = entry;

    const row = document.createElementNS(HTML_NS, 'tr');
    row.classList.add('-radical');
    componentsTable.append(row);

    const radicalCell = document.createElementNS(HTML_NS, 'td');
    row.append(radicalCell);
    radicalCell.classList.add('char');
    radicalCell.append((rad.b || rad.k)!);
    radicalCell.lang = 'ja';

    const readingCell = document.createElementNS(HTML_NS, 'td');
    row.append(readingCell);
    readingCell.classList.add('reading');
    readingCell.append(rad.na.join('、'));
    readingCell.lang = 'ja';

    const meaningCell = document.createElementNS(HTML_NS, 'td');
    row.append(meaningCell);
    meaningCell.classList.add('meaning');
    meaningCell.lang = rad.m_lang;
    meaningCell.append(rad.m.join(', '));

    if (rad.base) {
      const baseRow = document.createElementNS(HTML_NS, 'tr');
      baseRow.classList.add('-baseradical');
      baseRow.lang = getLangTag();
      componentsTable.append(baseRow);

      const baseChar = (rad.base.b || rad.base.k)!;
      const baseReadings = rad.base.na.join('、');
      const fromText = browser.i18n.getMessage('content_kanji_base_radical', [
        baseChar,
        baseReadings,
      ]);

      const baseCell = document.createElementNS(HTML_NS, 'td');
      baseCell.setAttribute('colspan', '3');
      baseCell.innerText = fromText;
      baseRow.append(baseCell);
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

    const row = document.createElementNS(HTML_NS, 'tr');
    componentsTable.append(row);

    const radicalCell = document.createElementNS(HTML_NS, 'td');
    row.append(radicalCell);
    radicalCell.classList.add('char');
    radicalCell.lang = 'ja';
    radicalCell.append(component.c);

    const readingCell = document.createElementNS(HTML_NS, 'td');
    row.append(readingCell);
    readingCell.classList.add('reading');
    readingCell.lang = 'ja';
    readingCell.append(component.na.length ? component.na[0] : '-');

    const meaningCell = document.createElementNS(HTML_NS, 'td');
    row.append(meaningCell);
    meaningCell.classList.add('meaning');
    meaningCell.lang = component.m_lang;
    meaningCell.append(component.m.length ? component.m[0] : '-');
  }

  return componentsDiv;
}

function renderReadings(entry: KanjiResult): HTMLElement {
  // Readings
  const readingsDiv = document.createElementNS(HTML_NS, 'div');
  readingsDiv.classList.add('readings');
  readingsDiv.lang = 'ja';

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
      const okuriganaSpan = document.createElementNS(HTML_NS, 'span');
      okuriganaSpan.classList.add('okurigana');
      okuriganaSpan.append(reading.substr(highlightIndex + 1));
      readingsDiv.append(okuriganaSpan);
    }

    hasPrecedingEntries = true;
  }

  // Name readings
  if (entry.r.na && entry.r.na.length) {
    const nanoriLabelSpan = document.createElementNS(HTML_NS, 'span');
    nanoriLabelSpan.classList.add('nanorilabel');
    nanoriLabelSpan.lang = getLangTag();
    nanoriLabelSpan.append(
      browser.i18n.getMessage('content_kanji_nanori_label')
    );
    readingsDiv.append(
      document.createElementNS(HTML_NS, 'br'),
      nanoriLabelSpan,
      ` ${entry.r.na.join('、')}`
    );
  }

  return readingsDiv;
}

function renderMeta(meta: Array<string>): HTMLElement {
  const metaDiv = document.createElementNS(HTML_NS, 'div');
  metaDiv.classList.add('meta');

  for (const tag of meta) {
    const span = document.createElementNS(HTML_NS, 'span');
    span.classList.add('tag');
    span.lang = getLangTag();
    span.textContent = browser.i18n.getMessage(
      `content_kanji_meta_${tag.replace(' ', '_')}`
    );
    metaDiv.append(span);
  }

  return metaDiv;
}

function renderMiscRow(entry: KanjiResult): HTMLElement {
  // Misc information row
  const miscInfoDiv = document.createElementNS(HTML_NS, 'div');
  miscInfoDiv.classList.add('misc');
  miscInfoDiv.lang = getLangTag();

  // Strokes
  const strokesDiv = document.createElementNS(HTML_NS, 'div');
  strokesDiv.classList.add('strokes');
  const pencilIcon = renderPencil();
  pencilIcon.classList.add('svgicon');
  pencilIcon.style.opacity = '0.5';
  strokesDiv.append(pencilIcon);
  const strokeCount = document.createElementNS(HTML_NS, 'span');
  strokeCount.textContent =
    entry.misc.sc === 1
      ? browser.i18n.getMessage('content_kanji_strokes_label_1')
      : browser.i18n.getMessage('content_kanji_strokes_label', [
          String(entry.misc.sc),
        ]);
  strokesDiv.append(strokeCount);
  miscInfoDiv.append(strokesDiv);

  // Frequency
  const frequencyDiv = document.createElementNS(HTML_NS, 'div');
  frequencyDiv.classList.add('freq');
  const frequencyIcon = renderFrequency(entry.misc.freq);
  frequencyIcon.classList.add('svgicon');
  frequencyDiv.append(frequencyIcon);
  const frequency = document.createElementNS(HTML_NS, 'span');
  if (entry.misc.freq) {
    frequency.textContent =
      browser.i18n.getMessage('content_kanji_frequency_label') +
      ` ${entry.misc.freq.toLocaleString()}`;
    const denominator = document.createElementNS(HTML_NS, 'span');
    denominator.classList.add('denom');
    denominator.append(` / ${Number(2500).toLocaleString()}`);
    frequency.append(denominator);
  } else {
    frequency.textContent = '-';
  }
  frequencyDiv.append(frequency);
  miscInfoDiv.append(frequencyDiv);

  // Grade
  const gradeDiv = document.createElementNS(HTML_NS, 'div');
  gradeDiv.classList.add('grade');
  const personIcon = renderPerson();
  personIcon.classList.add('svgicon');
  personIcon.style.opacity = '0.5';
  gradeDiv.append(personIcon);
  const grade = document.createElementNS(HTML_NS, 'span');
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
  const referenceTable = document.createElementNS(HTML_NS, 'div');
  referenceTable.classList.add('references');
  referenceTable.lang = getLangTag();

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

    const referenceCell = document.createElementNS(HTML_NS, 'div');
    referenceCell.classList.add('ref');
    referenceTable.append(referenceCell);

    const nameSpan = document.createElementNS(HTML_NS, 'span');
    nameSpan.classList.add('name');
    nameSpan.append(ref.short || ref.full);
    referenceCell.append(nameSpan);

    const value = getReferenceValue(entry, ref.ref) || '-';
    const valueSpan = document.createElementNS(HTML_NS, 'span');
    valueSpan.classList.add('value');
    if (ref.ref === 'radical' || ref.ref === 'nelson_r') {
      valueSpan.lang = 'ja';
    }
    valueSpan.append(value);
    referenceCell.append(valueSpan);
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

function renderMetadata({
  fxData,
  isCombinedResult,
  matchLen,
  meta,
}: {
  fxData: ContentConfig['fx'];
  isCombinedResult: boolean;
  matchLen: number;
  meta: SelectionMeta;
}): HTMLElement | null {
  switch (meta.type) {
    case 'era':
      {
        const eraInfo = getEraInfo(meta.era);
        if (eraInfo) {
          return renderEraInfo(meta, eraInfo);
        }
      }
      break;

    case 'measure':
      return renderMeasureInfo(meta);

    case 'currency':
      return fxData ? renderCurrencyInfo(meta, fxData) : null;

    case 'number':
      return meta.matchLen > matchLen
        ? renderNumberInfo(meta, { isCombinedResult })
        : null;
  }

  return null;
}

function renderCopyDetails({
  copyNextKey,
  copyState,
  series,
}: {
  copyNextKey: string;
  copyState: CopyState;
  series: MajorDataSeries;
}): HTMLElement | null {
  if (copyState.kind === 'inactive') {
    return null;
  }

  // In touch mode, only use the status bar to show the finished and error
  // states.
  if (copyState.mode === 'overlay' && copyState.kind === 'active') {
    return null;
  }

  const statusDiv = document.createElementNS(HTML_NS, 'div');
  statusDiv.classList.add('status-bar');
  statusDiv.classList.add('-stack');
  statusDiv.lang = getLangTag();

  if (copyState.mode === 'keyboard') {
    const keysDiv = document.createElementNS(HTML_NS, 'div');
    keysDiv.classList.add('keys');
    statusDiv.append(keysDiv);

    keysDiv.append(browser.i18n.getMessage('content_copy_keys_label') + ' ');

    const copyKeys: Array<{ key: string; l10nKey: string }> = CopyKeys.map(
      ({ key, type, popupString }) => {
        if (type === 'word' && series === 'kanji') {
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
      const keyElem = document.createElementNS(HTML_NS, 'kbd');
      keyElem.append(copyKey.key);
      keysDiv.append(keyElem, ' = ' + browser.i18n.getMessage(copyKey.l10nKey));
      if (copyKey.key !== copyNextKey) {
        keysDiv.append(', ');
      }
    }
  }

  if (copyState.kind === 'finished') {
    statusDiv.append(renderCopyStatus(getCopiedString(copyState.type)));
  } else if (copyState.kind === 'error') {
    statusDiv.append(
      renderCopyStatus(browser.i18n.getMessage('content_copy_error'))
    );
  }

  return statusDiv;
}

function getCopiedString(target: CopyType): string {
  switch (target) {
    case 'entry':
      return browser.i18n.getMessage('content_copied_entry');

    case 'tab':
      return browser.i18n.getMessage('content_copied_fields');

    case 'word':
      return browser.i18n.getMessage('content_copied_word');
  }
}

function renderCopyStatus(message: string): HTMLElement {
  const status = document.createElementNS(HTML_NS, 'div');
  status.classList.add('status');
  status.innerText = message;
  return status;
}

function renderUpdatingStatus(): HTMLElement {
  const statusDiv = document.createElementNS(HTML_NS, 'div');
  statusDiv.classList.add('status-bar');
  statusDiv.classList.add('-subdued');
  statusDiv.lang = getLangTag();

  const statusText = document.createElementNS(HTML_NS, 'div');
  statusText.classList.add('status');

  const spinner = renderSpinner();
  spinner.classList.add('spinner');
  statusText.append(spinner);

  statusText.append(browser.i18n.getMessage('content_database_updating'));
  statusDiv.append(statusText);

  return statusDiv;
}

function renderSpinner(): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('role', 'presentation');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    'M8.54,2.11l.66-.65A.78.78,0,0,0,9.2.38a.76.76,0,0,0-1.08,0L6.19,2.31A.81.81,0,0,0,6,2.55a.8.8,0,0,0-.06.3A.72.72,0,0,0,6,3.14a.74.74,0,0,0,.17.25L8.12,5.32a.73.73,0,0,0,.54.22.76.76,0,0,0,.54-.22.78.78,0,0,0,0-1.08l-.58-.58A4.38,4.38,0,1,1,3.68,8.82a.76.76,0,0,0-1.5.28,5.92,5.92,0,1,0,6.36-7Z'
  );
  svg.append(path);

  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '2.673');
  circle.setAttribute('cy', '6.71');
  circle.setAttribute('r', '0.965');
  svg.append(circle);

  return svg;
}

function renderSwitchDictionaryHint(
  keys: ReadonlyArray<string>
): HTMLElement | null {
  const hintDiv = document.createElementNS(HTML_NS, 'div');
  hintDiv.classList.add('status-bar');
  hintDiv.lang = getLangTag();

  const statusText = document.createElementNS(HTML_NS, 'div');
  statusText.classList.add('status');
  hintDiv.append(statusText);

  if (keys.length < 1 || keys.length > 3) {
    console.warn(`Unexpected number of keys ${keys.length}`);
    return null;
  }

  const label = browser.i18n.getMessage(
    `content_hint_switch_dict_keys_${keys.length}`
  );

  // Replace all the %KEY% placeholders with <kbd> elements.
  const keysCopy = keys.slice();
  const parts = label
    .split('%')
    .filter(Boolean)
    .map((part) => {
      if (part !== 'KEY') {
        return part;
      }

      const kbd = document.createElementNS(HTML_NS, 'kbd');
      kbd.textContent = keysCopy.shift() || '-';
      return kbd;
    });

  statusText.append(...parts);

  return hintDiv;
}
