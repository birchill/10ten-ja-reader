import type { MajorDataSeries } from '@birchill/jpdict-idb';

import type {
  AccentDisplay,
  ContentConfigParams,
  FontFace,
  FontSize,
  PartOfSpeechDisplay,
} from '../../common/content-config-params';
import type { CopyType } from '../../common/copy-keys';
import type { ReferenceAbbreviation } from '../../common/refs';
import type { Box, Point } from '../../utils/geometry';
import { stripFields } from '../../utils/strip-fields';

import type { SelectionMeta } from '../meta';
import type { DisplayMode } from '../popup-state';
import type { QueryResult } from '../query';
import { toScreenCoords } from '../scroll-offset';
import { isForeignObjectElement, isSvgDoc, isSvgSvgElement } from '../svg';

import type { CopyState } from './copy-state';
import {
  type PopupPosition,
  type PopupPositionConstraints,
  type PopupPositionMode,
  getPopupPosition,
} from './popup-position';
import { renderPopup, renderPopupArrow } from './render-popup';

// There are a _lot_ of options here. Once we've converted the popup to Preact
// we should be able to move some of this state into component state.
export type ShowPopupOptions = {
  allowOverlap?: boolean;
  accentDisplay: AccentDisplay;
  bunproDisplay: boolean;
  closeShortcuts?: ReadonlyArray<string>;
  container?: HTMLElement;
  copyNextKey: string;
  copyState: CopyState;
  copy?: {
    includeAllSenses: boolean;
    includeLessCommonHeadwords: boolean;
    includePartOfSpeech: boolean;
  };
  dictToShow: MajorDataSeries;
  dictLang?: string;
  displayMode: DisplayMode;
  fixedPosition?: PopupPositionConstraints;
  fixMinHeight?: boolean;
  fontFace?: FontFace;
  fontSize?: FontSize;
  fxData: ContentConfigParams['fx'];
  getCursorClearanceAndPos: () => { cursorClearance: Box; cursorPos?: Point };
  expandShortcuts?: ReadonlyArray<string>;
  interactive: boolean;
  isExpanded: boolean;
  isVerticalText: boolean;
  kanjiReferences: Array<ReferenceAbbreviation>;
  meta?: SelectionMeta;
  onCancelCopy?: () => void;
  onStartCopy?: StartCopyCallback;
  onCopy?: (copyType: CopyType) => void;
  onClosePopup?: () => void;
  onExpandPopup?: () => void;
  onShowSettings?: () => void;
  onSwitchDictionary?: (newDict: MajorDataSeries | 'next' | 'prev') => void;
  onTogglePin?: () => void;
  pinShortcuts?: ReadonlyArray<string>;
  pointerType: 'cursor' | 'puck';
  posDisplay: PartOfSpeechDisplay;
  positionMode: PopupPositionMode;
  popupStyle: string;
  preferredUnits: 'metric' | 'imperial';
  previousHeight?: number;
  safeArea: Box;
  showDefinitions: boolean;
  showPriority: boolean;
  showKanjiComponents?: boolean;
  switchDictionaryKeys: ReadonlyArray<string>;
  tabDisplay: 'top' | 'left' | 'right' | 'none';
  waniKaniVocabDisplay: 'hide' | 'show-matches';
};

export type StartCopyCallback = (
  index: number,
  trigger: 'touch' | 'mouse'
) => void;

export function showPopup(
  result: QueryResult | undefined,
  options: ShowPopupOptions
): {
  popup: HTMLElement;
  size: { width: number; height: number };
  pos: Omit<PopupPosition, 'constrainWidth' | 'constrainHeight'>;
} | null {
  const popup = renderPopup(result, options);
  if (!popup) {
    return null;
  }

  const { cursorClearance, cursorPos } = options.getCursorClearanceAndPos();

  // Get the initial popup size

  let popupSize = getPopupDimensions(popup);

  // Apply any min height to the popup

  let minHeight = 0;
  if (
    options.fixMinHeight &&
    options.previousHeight &&
    popupSize.height < options.previousHeight
  ) {
    minHeight = popupSize.height = options.previousHeight;
  }

  // Get the popup position

  const popupPos = getPopupPosition({
    allowVerticalOverlap: options.allowOverlap || !!options.fixMinHeight,
    cursorClearance,
    cursorPos,
    fixedPosition: options.fixedPosition,
    interactive: options.interactive,
    isVerticalText: options.isVerticalText,
    positionMode: options.positionMode,
    popupSize,
    safeArea: options.safeArea,
    pointerType: options.pointerType,
  });

  //
  // Apply the popup position
  //

  if (
    isSvgDoc(document) &&
    isSvgSvgElement(document.documentElement) &&
    isForeignObjectElement(popup.parentElement)
  ) {
    // Set the x/y attributes on the <foreignObject> wrapper after converting
    // to document space.
    const svg: SVGSVGElement = document.documentElement;
    const wrapper: SVGForeignObjectElement = popup.parentElement;
    wrapper.x.baseVal.value = popupPos.x;
    wrapper.y.baseVal.value = popupPos.y;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const transform = svg.createSVGTransformFromMatrix(ctm.inverse());
      wrapper.transform.baseVal.initialize(transform);
    }
  } else {
    popup.style.setProperty('--left', `${popupPos.x}px`);
    popup.style.setProperty('--top', `${popupPos.y}px`);

    if (popupPos.constrainWidth) {
      popup.style.setProperty('--max-width', `${popupPos.constrainWidth}px`);
    } else {
      popup.style.removeProperty('--max-width');
    }

    if (popupPos.constrainHeight) {
      popup.style.removeProperty('--min-height');
      popup.style.setProperty('--max-height', `${popupPos.constrainHeight}px`);
    } else if (minHeight) {
      popup.style.setProperty('--min-height', `${minHeight}px`);
      popup.style.removeProperty('--max-height');
    } else {
      popup.style.removeProperty('--min-height');
      popup.style.removeProperty('--max-height');
    }
  }

  //
  // Maybe add an arrow to it
  //
  // This needs to happen after positioning the popup so we can read back its
  // final size (after applying any edge case CSS rules) and determine if
  // there is room for the arrow or not.
  //

  if (
    cursorPos &&
    (options.displayMode === 'hover' || options.displayMode === 'pinned') &&
    popupPos.direction !== 'disjoint' &&
    popupPos.side !== 'disjoint'
  ) {
    // Update the popup size now that we have positioned it.
    popupSize = getPopupDimensions(popup);

    renderPopupArrow({
      direction: popupPos.direction,
      popupPos: toScreenCoords({ x: popupPos.x, y: popupPos.y }),
      popupSize,
      side: popupPos.side,
      target: cursorPos,
      theme: options.popupStyle,
    });
  }

  return {
    popup,
    size: {
      width: popupPos.constrainWidth ?? popupSize.width,
      height: popupPos.constrainHeight ?? popupSize.height,
    },
    pos: stripFields(popupPos, ['constrainWidth', 'constrainHeight']),
  };
}

function getPopupDimensions(hostElem: HTMLElement): {
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
