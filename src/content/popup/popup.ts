import { allMajorDataSeries, MajorDataSeries } from '@birchill/jpdict-idb';

import {
  AccentDisplay,
  ContentConfig,
  PartOfSpeechDisplay,
} from '../../common/content-config';
import { CopyType } from '../../common/copy-keys';
import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from '../content-container';
import { ReferenceAbbreviation } from '../../common/refs';
import { SelectionMeta } from '../meta';
import { LookupPuck } from '../puck';
import { QueryResult } from '../query';
import { html } from '../../utils/builder';
import { probablyHasPhysicalKeyboard } from '../../utils/device';
import { getThemeClass } from '../../utils/themes';

import { renderCloseButton } from './close';
import { renderCopyOverlay } from './copy-overlay';
import { CopyState } from './copy-state';
import { renderKanjiEntry } from './kanji';
import { renderMetadata } from './metadata';
import { renderNamesEntries } from './names';
import {
  renderCopyDetails,
  renderSwitchDictionaryHint,
  renderUpdatingStatus,
} from './status';
import { renderTabBar } from './tabs';
import { renderWordEntries } from './words';

import popupStyles from '../../../css/popup.css';
import { Point, Rect } from '../../utils/geometry';
import { renderArrow } from './arrow';

export interface PopupOptions {
  accentDisplay: AccentDisplay;
  container?: HTMLElement;
  copyNextKey: string;
  copyState: CopyState;
  dictToShow: MajorDataSeries;
  dictLang?: string;
  fxData: ContentConfig['fx'];
  hasSwitchedDictionary?: boolean;
  interactivity?: 'static' | 'ghost' | 'interactive';
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
  update?: boolean;
}

export function renderPopup(
  result: QueryResult | undefined,
  options: PopupOptions
): HTMLElement | null {
  const container = options.container || getDefaultContainer();
  const interactivity = options.interactivity || 'static';
  const windowElem = resetContainer({
    host: container,
    popupStyle: options.popupStyle,
    interactivity,
  });

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

  const contentContainer = html('div', { class: 'content' });

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
        contentContainer.lastElementChild as HTMLElement,
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
        renderCloseButton(options.onClosePopup)
      )
    );
  } else {
    windowElem.append(contentWrapper);
  }

  return container;
}

function getDefaultContainer(): HTMLElement {
  return getOrCreateEmptyContainer({
    id: 'tenten-ja-window',
    styles: popupStyles.toString(),
    // Make sure the popup container appears _before_ the puck container so that
    // we can assign them the same z-index and have the puck appear on top.
    before: LookupPuck.id,
    legacyIds: ['rikaichamp-window'],
  });
}

function resetContainer({
  host,
  interactivity,
  popupStyle,
}: {
  host: HTMLElement;
  interactivity: 'static' | 'ghost' | 'interactive';
  popupStyle: string;
}): HTMLElement {
  const container = html('div', { class: 'container' });
  const windowDiv = html('div', { class: 'window' });
  container.append(windowDiv);

  // Set initial and interactive status
  container.classList.toggle('ghost', interactivity === 'ghost');
  container.classList.toggle('interactive', interactivity !== 'static');

  // Set theme
  windowDiv.classList.add(getThemeClass(popupStyle));

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

export function showOverlay(copyState: CopyState): boolean {
  return (
    (copyState.kind === 'active' || copyState.kind === 'error') &&
    copyState.mode === 'overlay'
  );
}

export function renderPopupArrow(options: {
  cursorPos?: Point;
  direction: 'vertical' | 'horizontal';
  firstCharBbox?: Rect;
  popupPos: Point;
  popupSize: { width: number; height: number };
  scrollPos: Point;
  side: 'before' | 'after';
  theme: string;
}) {
  const popupContainer = getPopupContainer();
  if (!popupContainer) {
    return;
  }

  // Determine the reference point to align to
  let target: Point;
  const { cursorPos, firstCharBbox, popupSize } = options;
  if (firstCharBbox) {
    target = {
      x: firstCharBbox.left + firstCharBbox.width / 2,
      y: firstCharBbox.top + firstCharBbox.height / 2,
    };
  } else if (cursorPos) {
    target = cursorPos;
  } else {
    return;
  }

  // Convert the popup position from page coordinates to screen coordinates
  // since `cursorPos` and `firstCharBbox` are in screen coordinates.
  const {
    popupPos: { x: popupPageX, y: popupPageY },
    scrollPos: { x: scrollX, y: scrollY },
  } = options;
  const popupScreenPos = { x: popupPageX - scrollX, y: popupPageY - scrollY };

  // Check for cases where the popup overlaps the target element
  if (options.direction === 'vertical') {
    if (
      options.side === 'before' &&
      popupScreenPos.y + popupSize.height > target.y
    ) {
      return;
    } else if (options.side === 'after' && popupScreenPos.y < target.y) {
      return;
    }
  } else {
    if (
      options.side === 'before' &&
      popupScreenPos.x + popupSize.width > target.x
    ) {
      return;
    } else if (options.side === 'after' && popupScreenPos.x < target.x) {
      return;
    }
  }

  renderArrow({ ...options, popupContainer, popupPos: popupScreenPos, target });
}

function getPopupArrow(): HTMLElement | null {
  const hostElem = document.getElementById('tenten-ja-window');
  return hostElem && hostElem.shadowRoot
    ? hostElem.shadowRoot.querySelector('.arrow')
    : null;
}
