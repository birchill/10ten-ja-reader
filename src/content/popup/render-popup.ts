/// <reference path="../../common/css.d.ts" />
import type { FontFace, FontSize } from '../../common/content-config-params';
import { html } from '../../utils/builder';
import { classes } from '../../utils/classes';
import type { Point } from '../../utils/geometry';
import { getThemeClass } from '../../utils/themes';

import { getOrCreateEmptyContainer } from '../content-container';
import type { DisplayMode } from '../popup-state';
import { LookupPuckId } from '../puck';
import type { QueryResult } from '../query';

import { renderArrow } from './arrow';
import { renderCloseButton } from './close';
import { renderCopyOverlay } from './copy-overlay';
import type { CopyState } from './copy-state';
import { updateExpandable } from './expandable';
import { addFontStyles, removeFontStyles } from './font-styles';
import { renderKanjiEntries } from './kanji';
import { renderMetadata } from './metadata';
import { renderNamesEntries } from './names';
import { getPopupContainer } from './popup-container';
import popupStyles from './popup.css?inline';
import type { ShowPopupOptions } from './show-popup';
import { renderCopyDetails, renderUpdatingStatus } from './status';
import { onHorizontalSwipe } from './swipe';
import { renderTabBar, showWordsTab } from './tabs';
import { renderWordEntries } from './words';

export function renderPopup(
  result: QueryResult | undefined,
  options: ShowPopupOptions
): HTMLElement | null {
  // We add most styles to the shadow DOM but it turns out that browsers don't
  // load @font-face fonts from the shadow DOM [1], so we need to add @font-face
  // definitions to the main document.
  //
  // [1] e.g see https://issues.chromium.org/issues/41085401
  if (!options.fontFace || options.fontFace === 'bundled') {
    addFontStyles();
  } else {
    removeFontStyles();
  }

  const host = options.container || getDefaultContainer();
  const windowElem = resetContainer({
    host,
    displayMode: options.displayMode,
    fontFace: options.fontFace || 'bundled',
    fontSize: options.fontSize || 'normal',
    popupStyle: options.popupStyle,
  });

  const contentContainer = html('div', { class: 'content' });

  const hasResult = result && (result.words || result.kanji || result.names);
  const showTabs =
    hasResult &&
    result.resultType !== 'db-unavailable' &&
    !result.title &&
    options.tabDisplay !== 'none';

  if (showTabs) {
    const enabledTabs = {
      words: showWordsTab(result, !!options.meta),
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

    onHorizontalSwipe(contentContainer, (direction) => {
      options.onSwitchDictionary?.(direction === 'left' ? 'prev' : 'next');
    });
  }

  const overlayContainer = html('div', {
    class: classes(
      'tp:stacked tp:grow',
      'tp:has-overlay:[&>:first-child]:pointer-events-none',
      'tp:has-overlay:[&>:first-child]:starting:blur-none',
      'tp:has-overlay:[&>:first-child]:blur-[20px]',
      'tp:has-overlay:[&>:first-child]:[transition:filter_0.3s_ease-in-out]'
    ),
    'data-type': 'overlay-container',
  });
  windowElem.append(overlayContainer);

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
          preferredUnits: options.preferredUnits,
          isCombinedResult: false,
          matchLen: 0,
          meta: options.meta,
          metaonly: true,
        });
        if (!metadata) {
          return null;
        }

        contentContainer.append(
          html('div', { class: 'wordlist entry-data' }, metadata)
        );
      }
      break;
  }

  // Render the copy overlay if needed
  if (showOverlay(options.copyState)) {
    overlayContainer.append(
      renderCopyOverlay({
        copyState: options.copyState,
        includeAllSenses: options.copy?.includeAllSenses !== false,
        includeLessCommonHeadwords:
          options.copy?.includeLessCommonHeadwords !== false,
        includePartOfSpeech: options.copy?.includePartOfSpeech !== false,
        kanjiReferences: options.kanjiReferences,
        onCancelCopy: options.onCancelCopy,
        onCopy: options.onCopy,
        result: resultToShow ? result : undefined,
        series: options.dictToShow,
        showKanjiComponents: options.showKanjiComponents,
      })
    );

    windowElem.dataset.hasOverlay = 'true';
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
        overlayContainer,
        renderCloseButton(options.onClosePopup, options.closeShortcuts || [])
      )
    );
  }

  overlayContainer.insertBefore(contentWrapper, overlayContainer.firstChild);

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

  return host;
}

function getDefaultContainer(): HTMLElement {
  const defaultContainer = getOrCreateEmptyContainer({
    id: 'tenten-ja-window',
    styles: popupStyles.toString(),
    // Make sure the popup container appears _before_ the puck container so that
    // we can assign them the same z-index and have the puck appear on top.
    before: LookupPuckId,
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
  fontFace,
  fontSize,
  popupStyle,
}: {
  host: HTMLElement;
  displayMode: DisplayMode;
  fontFace: FontFace;
  fontSize: FontSize;
  popupStyle: string;
}): HTMLElement {
  const container = html('div', { class: 'container' });
  const windowDiv = html('div', {
    class: classes(
      'window',
      // If the overlay is showing, don't constrain the window height since it
      // might mean that the buttons on the overlay get cut off.
      'tp:has-overlay:max-h-none',
      // Let the size of the overlay determine the overall size of the popup
      // contents.
      //
      // This prevents the window from suddenly getting very large when we drop
      // the max-height definition above.
      //
      // Ideally we'd only do this if we were actually going to constrain the
      // height anyway, but that's hard to detect so we just do this
      // unconditionally and so far it seems to work ok.
      'tp:has-overlay:[&.entry-data]:absolute',
      'tp:has-overlay:[&.entry-data]:w-full'
    ),
    'data-type': 'window',
  });
  container.append(windowDiv);

  // Set initial and interactive status
  container.classList.toggle('ghost', displayMode === 'ghost');
  container.classList.toggle('interactive', displayMode !== 'static');
  container.classList.toggle('pinned', displayMode === 'pinned');

  // Set theme
  windowDiv.classList.add(getThemeClass(popupStyle));

  // Font face
  if (fontFace === 'bundled') {
    windowDiv.classList.add('bundled-fonts');
  } else {
    windowDiv.classList.add('system-fonts');
  }

  // Font size
  windowDiv.classList.add(`font-${fontSize}`);

  if (host.shadowRoot) {
    host.shadowRoot.append(container);
  } else {
    host.append(container);
  }

  // Reset the container position and size so that we can consistently measure
  // the size of the popup.
  host.style.removeProperty('--tenten-left');
  host.style.removeProperty('--tenten-top');
  host.style.removeProperty('--tenten-max-width');
  host.style.removeProperty('--tenten-max-height');

  return windowDiv;
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
