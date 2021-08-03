import { MarginBox, PaddingBox, Point } from './geometry';

export const enum PopupPositionMode {
  Start,
  TopLeft = Start,
  Auto,
  BottomRight,
  End = BottomRight,
}

// Minimum space to leave between the edge of the pop-up and the edge of the
// stage.
const GUTTER = 5;

export function getPopupPosition({
  cursorClearance,
  doc,
  isVerticalText,
  mousePos,
  popupSize,
  positionMode,
  preferredSide,
  safeArea: initialSafeArea,
}: {
  cursorClearance: MarginBox;
  doc: Document;
  isVerticalText: boolean;
  mousePos?: Point;
  popupSize: { width: number; height: number };
  positionMode: PopupPositionMode;
  preferredSide: 'above' | 'below';
  safeArea: PaddingBox;
}): PopupPosition {
  const { scrollX, scrollY } = doc.defaultView!;

  // Use the clientWidth (as opposed to doc.defaultView.innerWidth) since this
  // excludes the width of any scrollbars.
  const stageWidth = doc.documentElement.clientWidth;

  // For the height, we'd like to similarly use clientHeight...
  let stageHeight = document.documentElement.clientHeight;

  // ... but we need to be careful because:
  //
  // (a) in quirks mode, the body has the viewport height;
  if (doc.compatMode === 'BackCompat') {
    stageHeight = doc.body?.clientHeight || doc.defaultView!.innerHeight;
  }

  // (b) at least in iOS 15 Safari, the safe area appears to be measured from
  // the innerHeight so if we have a non-zero vertical safe area inset, we
  // should use the innerHeight instead.
  if (initialSafeArea.top !== 0 || initialSafeArea.bottom !== 0) {
    stageHeight = document.defaultView!.innerHeight;
  }

  // Now that we have finished detecting the absence/presence of a vertical safe
  // area, merge our gutter into the safe area.
  const safeArea = {
    left: initialSafeArea.left + GUTTER,
    right: initialSafeArea.right + GUTTER,
    top: initialSafeArea.top + GUTTER,
    bottom: initialSafeArea.bottom + GUTTER,
  };

  if (positionMode === PopupPositionMode.Auto) {
    return getAutoPosition({
      cursorClearance,
      isVerticalText,
      mousePos,
      popupSize,
      preferredSide,
      safeArea,
      scrollX,
      scrollY,
      stageWidth,
      stageHeight,
    });
  }

  const availableStageHeight = stageHeight - (safeArea.top + safeArea.bottom);

  const left = scrollX + safeArea.left;
  const top = scrollY + safeArea.top;
  const right = scrollX + stageWidth - popupSize.width - safeArea.right;
  const bottom =
    scrollY +
    stageHeight -
    Math.min(popupSize.height, availableStageHeight) -
    safeArea.bottom;

  // We could calculate a value for constrainHeight as something like:
  //
  //   constrainHeight = popupSize.height > availableWindowHeight
  //                     ? availableWindowHeight
  //                     : null;
  //
  // and we'd get the nice fade effect to show in that case, but it's probably
  // more useful to NOT constrain it and let the user scroll if the content
  // overflows the viewport.

  switch (positionMode) {
    case PopupPositionMode.TopLeft:
      return {
        x: left,
        y: top,
        constrainWidth: null,
        constrainHeight: null,
      };

    case PopupPositionMode.BottomRight:
      return {
        x: right,
        y: bottom,
        constrainWidth: null,
        constrainHeight: null,
      };
  }
}

interface PopupPosition {
  x: number;
  y: number;
  constrainWidth: number | null;
  constrainHeight: number | null;
}

function getAutoPosition({
  cursorClearance,
  isVerticalText,
  mousePos,
  popupSize,
  preferredSide,
  safeArea,
  scrollX,
  scrollY,
  stageWidth,
  stageHeight,
}: {
  cursorClearance: MarginBox;
  isVerticalText: boolean;
  mousePos?: Point;
  popupSize: { width: number; height: number };
  preferredSide: 'above' | 'below';
  safeArea: PaddingBox;
  scrollX: number;
  scrollY: number;
  stageWidth: number;
  stageHeight: number;
}): PopupPosition {
  const x = mousePos?.x || 0;
  const y = mousePos?.y || 0;

  const { left: safeLeft, top: safeTop } = safeArea;
  const safeRight = stageWidth - safeArea.right;
  const safeBottom = stageHeight - safeArea.bottom;

  const marginToPopup = 25;

  const popupAboveLayout = getAboveOrBelowPosition({
    cursorClearance,
    marginToPopup,
    popupSize,
    position: 'above',
    safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
    target: { x, y },
  });
  const popupRightLayout = getLeftOrRightPosition({
    cursorClearance,
    marginToPopup,
    popupSize,
    position: 'right',
    safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
    target: { x, y },
  });
  const popupLeftLayout = getLeftOrRightPosition({
    cursorClearance,
    marginToPopup,
    popupSize,
    position: 'left',
    safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
    target: { x, y },
  });
  const popupBelowLayout = getAboveOrBelowPosition({
    cursorClearance,
    marginToPopup,
    popupSize,
    position: 'below',
    safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
    target: { x, y },
  });

  // Build up preferred order for considering each layout
  const leftAndRightPreference = [popupRightLayout, popupLeftLayout];
  const belowAndAbovePreference =
    preferredSide === 'above'
      ? [popupAboveLayout, popupBelowLayout]
      : [popupBelowLayout, popupAboveLayout];
  const orderOfPreference = isVerticalText
    ? [...leftAndRightPreference, ...belowAndAbovePreference]
    : [...belowAndAbovePreference, ...leftAndRightPreference];

  // We generally prefer to use a layout in the block direction
  const orthogonalLayouts = orderOfPreference.slice(0, 2);
  const preferredLayoutWithoutBlockConstraint = orthogonalLayouts.find(
    (l) => l && (isVerticalText ? l.constrainWidth : l.constrainHeight) === null
  );

  // If we can't find an unconstrained layout in the block direction fall back
  // to the layout with the highest area.
  const preferredLayout =
    preferredLayoutWithoutBlockConstraint ??
    orderOfPreference.sort(sizeComparator(popupSize))[0];

  // This probably never happens but if we have no suitable layouts, just put
  // the popup in the top-left.
  if (!preferredLayout) {
    return {
      x: safeLeft,
      y: safeTop,
      constrainWidth: null,
      constrainHeight: null,
    };
  }

  return {
    ...preferredLayout,
    x: preferredLayout.x + scrollX,
    y: preferredLayout.y + scrollY,
  };
}

// TODO: Combine the below two functions into a more generic one.

function getAboveOrBelowPosition({
  cursorClearance,
  marginToPopup,
  position,
  popupSize,
  safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
  target,
}: {
  cursorClearance: MarginBox;
  marginToPopup: number;
  popupSize: { width: number; height: number };
  position: 'above' | 'below';
  safeBoundaries: {
    safeLeft: number;
    safeRight: number;
    safeTop: number;
    safeBottom: number;
  };
  target: Point;
}): PopupPosition | undefined {
  // Horizontal position
  const idealX = target.x;
  const x =
    idealX + popupSize.width > safeRight
      ? Math.max(safeLeft, safeRight - popupSize.width)
      : idealX;
  const constrainWidth = x + popupSize.width > safeRight ? safeRight - x : null;

  // Vertical position
  let y;
  let constrainHeight: number | null;
  if (position === 'above') {
    const marginBetweenMouseEventAndBottomOfPopup =
      marginToPopup + cursorClearance.top;
    const maxYExtent = target.y - marginBetweenMouseEventAndBottomOfPopup;

    y = Math.max(safeTop, maxYExtent - popupSize.height);
    if (y >= maxYExtent) {
      return undefined;
    }

    constrainHeight = y + popupSize.height > maxYExtent ? maxYExtent - y : null;
  } else {
    const marginBetweenMouseEventAndTopOfPopup =
      cursorClearance.bottom + marginToPopup;
    y = target.y + marginBetweenMouseEventAndTopOfPopup;

    if (y >= safeBottom) {
      return undefined;
    }

    constrainHeight = y + popupSize.height > safeBottom ? safeBottom - y : null;
  }

  return { x, y, constrainWidth, constrainHeight };
}

function getLeftOrRightPosition({
  cursorClearance,
  marginToPopup,
  position,
  popupSize,
  safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
  target,
}: {
  cursorClearance: MarginBox;
  marginToPopup: number;
  popupSize: { width: number; height: number };
  position: 'left' | 'right';
  safeBoundaries: {
    safeLeft: number;
    safeRight: number;
    safeTop: number;
    safeBottom: number;
  };
  target: Point;
}): PopupPosition | undefined {
  // Horizontal position
  let x;
  let constrainWidth: number | null;
  if (position === 'left') {
    const marginBetweenMouseEventAndRightOfPopup =
      cursorClearance.left + marginToPopup;
    const maxXExtent = target.x - marginBetweenMouseEventAndRightOfPopup;

    x = Math.max(safeLeft, maxXExtent - popupSize.width);
    if (x >= maxXExtent) {
      return undefined;
    }

    constrainWidth = x + popupSize.width > maxXExtent ? maxXExtent - x : null;
  } else {
    const marginBetweenMouseEventAndLeftOfPopup =
      cursorClearance.right + marginToPopup;

    x = target.x + marginBetweenMouseEventAndLeftOfPopup;
    if (x >= safeRight) {
      return undefined;
    }

    constrainWidth = x + popupSize.width > safeRight ? safeRight - x : null;
  }

  // Vertical position
  const idealY = target.y;
  const y =
    idealY + popupSize.height > safeBottom
      ? Math.max(safeTop, safeBottom - popupSize.height)
      : idealY;
  if (safeBottom - safeTop < 0) {
    return undefined;
  }
  const constrainHeight =
    y + popupSize.height > safeBottom ? safeBottom - safeTop : null;

  return { x, y, constrainWidth, constrainHeight };
}

function sizeComparator(popupSize: { width: number; height: number }) {
  return (
    a: PopupPosition | undefined,
    b: PopupPosition | undefined
  ): number => {
    // Sort undefined entries last
    if (!b) {
      return 0;
    }

    if (!a) {
      return 1;
    }

    const widthA = a.constrainWidth ?? popupSize.width;
    const heightA = a.constrainHeight ?? popupSize.height;
    const areaA = widthA * heightA;

    const widthB = b.constrainWidth ?? popupSize.width;
    const heightB = b.constrainHeight ?? popupSize.height;
    const areaB = widthB * heightB;

    if (widthA === widthB) {
      return areaB - areaA;
    }

    // Prefer wider results wherever possible, as it's okay to lose a few entries
    // from the bottom of the popup, but disastrous for all the entries to be
    // clipped off on the right.
    return widthB - widthA;
  };
}
