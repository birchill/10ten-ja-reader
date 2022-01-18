import { allMajorDataSeries, MajorDataSeries } from '@birchill/hikibiki-data';
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
import { ReferenceAbbreviation } from '../common/refs';
import { probablyHasPhysicalKeyboard } from '../utils/device';
import { HTML_NS } from '../utils/dom-utils';
import { NameResult } from '../background/search-result';
import { getThemeClass } from '../utils/themes';

import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from './content-container';
import { SelectionMeta } from './meta';
import { QueryResult } from './query';

import { html } from './popup/builder';
import { renderCopyOverlay } from './popup/copy-overlay';
import {
  renderBook,
  renderCog,
  renderCross,
  renderKanjiIcon,
  renderPerson,
  renderSpinner,
} from './popup/icons';
import { getLangTag } from './popup/lang-tag';
import { renderMetadata } from './popup/metadata';
import { renderName } from './popup/names';
import { getSelectedIndex } from './popup/selected-index';
import { renderWordEntries } from './popup/words';
import { renderKanjiEntry } from './popup/kanji';

import popupStyles from '../../css/popup.css';

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
