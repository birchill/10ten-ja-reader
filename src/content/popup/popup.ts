/// <reference path="../../common/css.d.ts" />
import { MajorDataSeries } from '@birchill/jpdict-idb';

import {
  AccentDisplay,
  ContentConfigParams,
  FontSize,
  PartOfSpeechDisplay,
} from '../../common/content-config-params';
import { CopyType } from '../../common/copy-keys';
import { ReferenceAbbreviation } from '../../common/refs';

import { html } from '../../utils/builder';
import { Point } from '../../utils/geometry';
import { getThemeClass } from '../../utils/themes';

import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from '../content-container';
import { SelectionMeta } from '../meta';
import { DisplayMode } from '../popup-state';
import { LookupPuck } from '../puck';
import { QueryResult } from '../query';

import { renderArrow } from './arrow';
import { renderCloseButton } from './close';
import { renderCopyOverlay } from './copy-overlay';
import { CopyState } from './copy-state';
import { updateExpandable } from './expandable';
import { renderKanjiEntries } from './kanji';
import { renderMetadata } from './metadata';
import { renderNamesEntries } from './names';
import { renderCopyDetails, renderUpdatingStatus } from './status';
import { renderTabBar } from './tabs';
import { renderWordEntries } from './words';

import popupStyles from '../../../css/popup.css';

export type StartCopyCallback = (
  index: number,
  trigger: 'touch' | 'mouse'
) => void;

export interface PopupOptions {
  accentDisplay: AccentDisplay;
  bunproDisplay: boolean;
  closeShortcuts?: ReadonlyArray<string>;
  container?: HTMLElement;
  copyNextKey: string;
  copyState: CopyState;
  dictToShow: MajorDataSeries;
  dictLang?: string;
  displayMode: DisplayMode;
  fontSize?: FontSize;
  fxData: ContentConfigParams['fx'];
  expandShortcuts?: ReadonlyArray<string>;
  isExpanded: boolean;
  kanjiReferences: Array<ReferenceAbbreviation>;
  meta?: SelectionMeta;
  onCancelCopy?: () => void;
  onStartCopy?: StartCopyCallback;
  onCopy?: (copyType: CopyType) => void;
  onClosePopup?: () => void;
  onExpandPopup?: () => void;
  onShowSettings?: () => void;
  onSwitchDictionary?: (newDict: MajorDataSeries) => void;
  onTogglePin?: () => void;
  pinShortcuts?: ReadonlyArray<string>;
  posDisplay: PartOfSpeechDisplay;
  popupStyle: string;
  showDefinitions: boolean;
  showPriority: boolean;
  showKanjiComponents?: boolean;
  switchDictionaryKeys: ReadonlyArray<string>;
  tabDisplay: 'top' | 'left' | 'right' | 'none';
  waniKaniVocabDisplay: 'hide' | 'show-matches';
}

export function renderPopup(
  result: QueryResult | undefined,
  options: PopupOptions
): HTMLElement | null {
  const container = options.container || getDefaultContainer();
  const windowElem = resetContainer({
    host: container,
    displayMode: options.displayMode,
    fontSize: options.fontSize || 'normal',
    popupStyle: options.popupStyle,
  });

  const hasResult = result && (result.words || result.kanji || result.names);
  const showTabs =
    hasResult &&
    result.resultType !== 'db-unavailable' &&
    !result.title &&
    options.tabDisplay !== 'none';

  if (showTabs) {
    const enabledTabs = {
      words: !!result?.words || !!options.meta,
      kanji: !!result?.kanji,
      names: !!result?.names,
    };

    windowElem.append(
      renderTabBar({
        closeShortcuts: options.closeShortcuts,
        displayMode: options.displayMode,
        enabledTabs,
        onClosePopup: options.onClosePopup,
        onShowSettings: options.onShowSettings,
        onSwitchDictionary: options.onSwitchDictionary,
        onTogglePin: options.onTogglePin,
        pinShortcuts: options.pinShortcuts,
        selectedTab: options.dictToShow,
      })
    );

    windowElem.dataset.tabSide = options.tabDisplay || 'top';
  }

  const contentContainer = html('div', { class: 'content' });

  const resultToShow = result?.[options.dictToShow];

  switch (resultToShow?.type) {
    case 'kanji':
      contentContainer.append(
        html(
          'div',
          { class: 'expandable' },
          renderKanjiEntries({ entries: resultToShow.data, options })
        )
      );
      break;

    case 'names':
      contentContainer.append(
        renderNamesEntries({
          entries: resultToShow.data,
          matchLen: resultToShow.matchLen,
          more: resultToShow.more,
          options: {
            ...options,
            // Hide the meta if we have already shown it on the words tab
            meta: result?.words ? undefined : options.meta,
          },
        })
      );
      break;

    case 'words':
      {
        contentContainer.append(
          html(
            'div',
            { class: 'expandable' },
            renderWordEntries({
              entries: resultToShow.data,
              matchLen: resultToShow.matchLen,
              more: resultToShow.more,
              namePreview: result!.namePreview,
              options,
              title: result!.title,
            })
          )
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

        contentContainer.append(
          html('div', { class: 'wordlist entry-data' }, metadata)
        );
      }
      break;
  }

  // Render the copy overlay if needed
  if (showOverlay(options.copyState)) {
    contentContainer.append(
      html(
        'div',
        { class: 'grid-stack' },
        // Dictionary content
        html('div', {}, ...contentContainer.children),
        renderCopyOverlay({
          copyState: options.copyState,
          kanjiReferences: options.kanjiReferences,
          onCancelCopy: options.onCancelCopy,
          onCopy: options.onCopy,
          result: resultToShow ? result : undefined,
          series: options.dictToShow,
          showKanjiComponents: options.showKanjiComponents,
        })
      )
    );

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

  let statusBar: HTMLElement | null = null;
  if (copyDetails) {
    statusBar = copyDetails;
  } else if (hasResult && result?.resultType === 'db-updating') {
    statusBar = renderUpdatingStatus();
  }

  let contentWrapper = contentContainer;
  if (statusBar) {
    contentWrapper = html(
      'div',
      { class: 'status-bar-wrapper' },
      contentContainer,
      statusBar
    );
  }

  if (!showTabs && options.onClosePopup) {
    windowElem.append(
      html(
        'div',
        { class: 'close-button-wrapper' },
        contentWrapper,
        renderCloseButton(options.onClosePopup, options.closeShortcuts || [])
      )
    );
  } else {
    windowElem.append(contentWrapper);
  }

  // Collapse expandable containers
  for (const expandable of contentContainer.querySelectorAll<HTMLElement>(
    '.expandable'
  )) {
    updateExpandable(expandable, {
      ...options,
      showKeyboardShortcut: options.displayMode === 'static',
    });
  }

  // Scroll any selected items into view.
  //
  // We need to wait until after the popup has been positioned, however, as
  // otherwise we won't know if it's in view or not.
  requestAnimationFrame(() => {
    const selectedElem =
      contentContainer.querySelector('.expandable .-selected') ||
      contentContainer.querySelector('.-flash');
    selectedElem?.scrollIntoView({ block: 'nearest' });
  });

  return container;
}

function getDefaultContainer(): HTMLElement {
  const defaultContainer = getOrCreateEmptyContainer({
    id: 'tenten-ja-window',
    styles: popupStyles.toString(),
    // Make sure the popup container appears _before_ the puck container so that
    // we can assign them the same z-index and have the puck appear on top.
    before: LookupPuck.id,
    legacyIds: ['rikaichamp-window'],
  });

  // Make sure our popup doesn't get inverted by Wikipedia's (experimental) dark
  // mode.
  if (document.location.hostname.endsWith('wikipedia.org')) {
    defaultContainer.classList.add('mw-no-invert');
    defaultContainer.style.filter = 'inherit';
  }

  return defaultContainer;
}

function resetContainer({
  host,
  displayMode,
  fontSize,
  popupStyle,
}: {
  host: HTMLElement;
  displayMode: DisplayMode;
  fontSize: FontSize;
  popupStyle: string;
}): HTMLElement {
  const container = html('div', { class: 'container' });
  const windowDiv = html('div', { class: 'window' });
  container.append(windowDiv);

  // Set initial and interactive status
  container.classList.toggle('ghost', displayMode === 'ghost');
  container.classList.toggle('interactive', displayMode !== 'static');
  container.classList.toggle('pinned', displayMode === 'pinned');

  // Set theme
  windowDiv.classList.add(getThemeClass(popupStyle));

  // Font size
  if (fontSize !== 'normal') {
    windowDiv.classList.add(`font-${fontSize}`);
  }

  if (host.shadowRoot) {
    host.shadowRoot.append(container);
  } else {
    host.append(container);
  }

  // Reset the container position and size so that we can consistently measure
  // the size of the popup.
  host.style.removeProperty('--left');
  host.style.removeProperty('--top');
  host.style.removeProperty('--max-width');
  host.style.removeProperty('--max-height');

  return windowDiv;
}

export function isPopupVisible(): boolean {
  const popupContainer = getPopupContainer();
  return !!popupContainer && !popupContainer.classList.contains('hidden');
}

export function hidePopup() {
  getPopupContainer()?.classList.add('hidden');
}

function getPopupContainer(): HTMLElement | null {
  const hostElem = document.getElementById('tenten-ja-window');
  return hostElem && hostElem.shadowRoot
    ? hostElem.shadowRoot.querySelector('.container')
    : null;
}

export function removePopup() {
  removeContentContainer(['rikaichamp-window', 'tenten-ja-window']);
}

export function setFontSize(size: FontSize) {
  const popupWindow = getPopupWindow();
  if (!popupWindow) {
    return;
  }

  for (const className of popupWindow.classList.values()) {
    if (className.startsWith('font-')) {
      popupWindow.classList.remove(className);
    }
  }

  if (size !== 'normal') {
    popupWindow.classList.add(`font-${size}`);
  }
}

export function setPopupStyle(style: string) {
  const elems = [getPopupWindow(), getPopupArrow()];

  for (const elem of elems) {
    if (!elem) {
      continue;
    }

    for (const className of elem.classList.values()) {
      if (className.startsWith('theme-')) {
        elem.classList.remove(className);
      }
    }

    elem.classList.add(getThemeClass(style));
  }
}

function getPopupWindow(): HTMLElement | null {
  const hostElem = document.getElementById('tenten-ja-window');
  return hostElem && hostElem.shadowRoot
    ? hostElem.shadowRoot.querySelector('.window')
    : null;
}

export function getPopupDimensions(hostElem: HTMLElement): {
  width: number;
  height: number;
} {
  // Measure the size of the inner window so that we don't include the padding
  // for the shadow
  const windowElem = hostElem.shadowRoot?.querySelector('.window');
  const width =
    (windowElem instanceof HTMLElement ? windowElem.offsetWidth : 0) || 200;
  const height =
    windowElem instanceof HTMLElement ? windowElem.offsetHeight : 0;
  return { width, height };
}

export function isPopupWindowHostElem(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.id === 'tenten-ja-window';
}

function showOverlay(copyState: CopyState): boolean {
  return (
    (copyState.kind === 'active' || copyState.kind === 'error') &&
    (copyState.mode === 'touch' || copyState.mode === 'mouse')
  );
}

export function renderPopupArrow(options: {
  direction: 'vertical' | 'horizontal';
  popupPos: Point;
  popupSize: { width: number; height: number };
  side: 'before' | 'after';
  target: Point;
  theme: string;
}) {
  const popupContainer = getPopupContainer();
  if (!popupContainer) {
    return;
  }

  // Check for cases where the popup overlaps the target element
  const { popupPos, popupSize, target } = options;
  if (options.direction === 'vertical') {
    if (options.side === 'before' && popupPos.y + popupSize.height > target.y) {
      return;
    } else if (options.side === 'after' && popupPos.y < target.y) {
      return;
    }
  } else {
    if (options.side === 'before' && popupPos.x + popupSize.width > target.x) {
      return;
    } else if (options.side === 'after' && popupPos.x < target.x) {
      return;
    }
  }

  renderArrow({ ...options, popupContainer, target });
}

function getPopupArrow(): HTMLElement | null {
  const hostElem = document.getElementById('tenten-ja-window');
  return hostElem && hostElem.shadowRoot
    ? hostElem.shadowRoot.querySelector('.arrow')
    : null;
}
