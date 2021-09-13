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
  safeArea: initialSafeArea,
  pointerType,
}: {
  cursorClearance: MarginBox;
  doc: Document;
  isVerticalText: boolean;
  mousePos?: Point;
  popupSize: { width: number; height: number };
  positionMode: PopupPositionMode;
  safeArea: PaddingBox;
  pointerType: 'cursor' | 'puck';
}): PopupPosition {
  const { scrollX, scrollY } = doc.defaultView!;

  // Use the clientWidth (as opposed to doc.defaultView.innerWidth) since this
  // excludes the width of any scrollbars.
  const stageWidth = doc.documentElement.clientWidth;

  // For the height, we'd like to similarly use clientHeight...
  let stageHeight = doc.documentElement.clientHeight;

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
      safeArea,
      scrollX,
      scrollY,
      stageWidth,
      stageHeight,
      pointerType,
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
  safeArea,
  scrollX,
  scrollY,
  stageWidth,
  stageHeight,
  pointerType,
}: {
  cursorClearance: MarginBox;
  isVerticalText: boolean;
  mousePos?: Point;
  popupSize: { width: number; height: number };
  safeArea: PaddingBox;
  scrollX: number;
  scrollY: number;
  stageWidth: number;
  stageHeight: number;
  pointerType: 'cursor' | 'puck';
}): PopupPosition {
  const position = getAutoPositionWithoutScrollOffset({
    cursorClearance,
    isVerticalText,
    mousePos,
    popupSize,
    safeArea,
    stageWidth,
    stageHeight,
    pointerType,
  });

  return {
    ...position,
    x: position.x + scrollX,
    y: position.y + scrollY,
  };
}

function getAutoPositionWithoutScrollOffset({
  cursorClearance,
  isVerticalText,
  mousePos,
  popupSize,
  safeArea,
  stageWidth,
  stageHeight,
  pointerType,
}: {
  cursorClearance: MarginBox;
  isVerticalText: boolean;
  mousePos?: Point;
  popupSize: { width: number; height: number };
  safeArea: PaddingBox;
  stageWidth: number;
  stageHeight: number;
  pointerType: 'cursor' | 'puck';
}): PopupPosition {
  // Set up a few useful variables...
  const x = mousePos?.x || 0;
  const y = mousePos?.y || 0;

  const { left: safeLeft, top: safeTop } = safeArea;
  const safeRight = stageWidth - safeArea.right;
  const safeBottom = stageHeight - safeArea.bottom;
  const marginToPopup = 25;

  // Generate the possible position sizes in order of preference.
  //
  // We prefer positions in the block direction on the 'after' side unless we
  // are looking up horizontal text with the puck, in which case we prefer the
  // 'before' side (i.e. above the target text).

  // Prefer the block direction
  const axisOrder = isVerticalText
    ? (['horizontal', 'vertical'] as const)
    : (['vertical', 'horizontal'] as const);

  // Prefer the 'after' side
  const sides = ['after', 'before'] as const;

  // Store the possible layouts
  const candidates: Array<
    | {
        axis: 'horizontal' | 'vertical';
        position: PopupPosition;
        side: 'before' | 'after';
      }
    | undefined
  > = [];

  for (const axis of axisOrder) {
    // Prefer the 'before' side when we are looking up horizontal text with the
    // puck.
    const swapSides = pointerType === 'puck' && axis === 'vertical';
    for (const side of swapSides ? sides.slice().reverse() : sides) {
      const position = calculatePosition({
        axis,
        cursorClearance,
        marginToPopup,
        popupSize,
        safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
        target: { x, y },
        pointerType,
        side,
      });
      candidates.push(
        position
          ? {
              axis,
              side,
              position,
            }
          : undefined
      );
    }
  }

  // If our first preference fits in the screen, use that.
  if (
    candidates[0] &&
    positionFitsInViewport({
      isVerticalText,
      popupSize,
      position: candidates[0].position,
      safeExtent: { safeRight, safeBottom },
    })
  ) {
    return candidates[0].position;
  }

  // Beyond that, our behavior depends on the sort of screen we're dealing with.
  //
  // There are two modes:
  //
  // A) For most cases we simply want to find which side in the block direction
  //    has more room and use that.
  //
  // B) However, if the user is on a small screen which has more room in the
  //    inline direction (i.e. it's in "landscape mode" as far as the block
  //    direction is concerned) then putting the popup to the side could be
  //    quite helpful so we generate the other possible positions and try to
  //    find the best one.
  if (
    !isSmallLandscapeScreen({
      isVerticalText,
      safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
    })
  ) {
    if (candidates[0] && !candidates[1]) {
      return candidates[0].position;
    }

    if (!candidates[0] && candidates[1]) {
      return candidates[1].position;
    }

    if (candidates[0] && candidates[1]) {
      const [thisSideMin, thisSideMax] = getRangeForPopup({
        axis: candidates[0].axis,
        cursorClearance,
        marginToPopup,
        safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
        side: candidates[0].side,
        target: { x, y },
      });
      const [otherSideMin, otherSideMax] = getRangeForPopup({
        axis: candidates[1].axis,
        cursorClearance,
        marginToPopup,
        safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
        side: candidates[1].side,
        target: { x, y },
      });

      return otherSideMax - otherSideMin > thisSideMax - thisSideMin
        ? candidates[1].position
        : candidates[0].position;
    }
  }

  // Otherwise, find the best candidate from the set.

  // We generally prefer to use a position in the block direction so see if we
  // have an unconstrained position there.
  const blockPosition = candidates
    .slice(0, 2) // <-- Block direction positions
    .find(
      (l) =>
        l &&
        (isVerticalText
          ? l.position.constrainWidth
          : l.position.constrainHeight) === null
    );
  if (blockPosition) {
    return blockPosition.position;
  }

  // Otherwise, use the layout with the greatest width/area.
  const preferredLayout = candidates.sort(sizeComparator(popupSize))[0];

  return (
    preferredLayout?.position ?? {
      // This probably never happens but if we have no suitable layouts, just
      // put the popup in the top-left.
      x: safeLeft,
      y: safeTop,
      constrainWidth: null,
      constrainHeight: null,
    }
  );
}

function calculatePosition({
  axis,
  cursorClearance,
  marginToPopup,
  pointerType,
  popupSize,
  safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
  side,
  target,
}: {
  axis: 'vertical' | 'horizontal';
  cursorClearance: MarginBox;
  marginToPopup: number;
  pointerType: 'cursor' | 'puck';
  popupSize: { width: number; height: number };
  safeBoundaries: {
    safeLeft: number;
    safeRight: number;
    safeTop: number;
    safeBottom: number;
  };
  side: 'before' | 'after';
  target: Point;
}): PopupPosition | undefined {
  // Cross-axis position
  //
  // (e.g. horizontal position when we are laying the popup out on the vertical
  // axis).
  const idealCrossPos = axis === 'vertical' ? target.x : target.y;
  const crossPopupSize =
    axis === 'vertical' ? popupSize.width : popupSize.height;
  const maxCrossExtent = axis === 'vertical' ? safeRight : safeBottom;
  const minCrossExtent = axis === 'vertical' ? safeLeft : safeTop;
  const crossPos =
    idealCrossPos + crossPopupSize > maxCrossExtent
      ? Math.max(minCrossExtent, maxCrossExtent - crossPopupSize)
      : idealCrossPos;
  const constrainCrossExtent =
    crossPos + crossPopupSize > maxCrossExtent
      ? maxCrossExtent - crossPos
      : null;

  // Axis position
  //
  // (e.g. vertical position when we are laying the popup out on the vertical
  // axis).
  const [axisMin, axisMax] = getRangeForPopup({
    axis,
    cursorClearance,
    marginToPopup,
    side,
    safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
    target,
  });

  const axisPopupSize =
    axis === 'vertical' ? popupSize.height : popupSize.width;
  let axisPos;
  if (side === 'before') {
    axisPos = Math.max(axisMin, axisMax - axisPopupSize);
    if (axisPos >= axisMax) {
      return undefined;
    }
  } else {
    axisPos = axisMin;
    if (axisPos >= axisMax) {
      return undefined;
    }
  }
  const constrainAxisExtent =
    axisPos + axisPopupSize > axisMax ? axisMax - axisPos : null;

  return axis === 'vertical'
    ? {
        x: crossPos,
        y: axisPos,
        constrainWidth: constrainCrossExtent,
        // When using the cursor, the user can scroll the viewport without
        // dismissing the popup so we don't need to constrain it.
        //
        // However, if we're positioning the popup before the pointer, we don't want
        // it to cover the pointer so we should constrain it in that case.
        constrainHeight:
          side === 'after' && pointerType === 'cursor'
            ? null
            : constrainAxisExtent,
      }
    : {
        x: axisPos,
        y: crossPos,
        constrainWidth: constrainAxisExtent,
        // Similar to the above, when positioning on the sides we typically don't want to
        // constraint the height of the popup.
        constrainHeight: pointerType === 'cursor' ? null : constrainCrossExtent,
      };
}

function positionFitsInViewport({
  isVerticalText,
  popupSize,
  position,
  safeExtent: { safeRight, safeBottom },
}: {
  isVerticalText: boolean;
  popupSize: { width: number; height: number };
  position: PopupPosition;
  safeExtent: { safeRight: number; safeBottom: number };
}): boolean {
  // First check if it is constrained in the block direction. If it's
  // constrained then it doesn't fit.
  const isConstrained = isVerticalText
    ? position.constrainWidth !== null
    : position.constrainHeight !== null;
  if (isConstrained) {
    return false;
  }

  const blockEdge = isVerticalText ? safeRight : safeBottom;
  const popupExtent = isVerticalText
    ? position.x + popupSize.width
    : position.y + popupSize.height;

  return popupExtent <= blockEdge;
}

function getRangeForPopup({
  axis,
  cursorClearance,
  marginToPopup,
  side,
  safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
  target,
}: {
  axis: 'vertical' | 'horizontal';
  cursorClearance: MarginBox;
  marginToPopup: number;
  safeBoundaries: {
    safeLeft: number;
    safeRight: number;
    safeTop: number;
    safeBottom: number;
  };
  side: 'before' | 'after';
  target: Point;
}): [min: number, max: number] {
  const targetAxisPos = axis === 'vertical' ? target.y : target.x;

  let minAxisExtent;
  let maxAxisExtent;

  if (side === 'before') {
    minAxisExtent = axis === 'vertical' ? safeTop : safeLeft;

    const clearanceAtFarEdge =
      axis === 'vertical' ? cursorClearance.top : cursorClearance.left;
    const marginAtFarEdge = clearanceAtFarEdge + marginToPopup;
    maxAxisExtent = targetAxisPos - marginAtFarEdge;
  } else {
    const clearanceAtNearEdge =
      axis === 'vertical' ? cursorClearance.bottom : cursorClearance.right;
    const marginAtNearEdge = clearanceAtNearEdge + marginToPopup;
    minAxisExtent = targetAxisPos + marginAtNearEdge;

    maxAxisExtent = axis === 'vertical' ? safeBottom : safeRight;
  }

  return [minAxisExtent, maxAxisExtent];
}

function isSmallLandscapeScreen({
  isVerticalText,
  safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
}: {
  isVerticalText: boolean;
  safeBoundaries: {
    safeLeft: number;
    safeRight: number;
    safeTop: number;
    safeBottom: number;
  };
}): boolean {
  const verticalRange = safeBottom - safeTop;
  const horizontalRange = safeRight - safeLeft;
  const [blockRange, inlineRange] = isVerticalText
    ? [horizontalRange, verticalRange]
    : [verticalRange, horizontalRange];
  const isLandscape = inlineRange > blockRange;
  const isSmallScreen = blockRange < 500;

  return isLandscape && isSmallScreen;
}

function sizeComparator(popupSize: { width: number; height: number }) {
  return (
    a: { position: PopupPosition } | undefined,
    b: { position: PopupPosition } | undefined
  ): number => {
    // Sort undefined entries last
    if (!b) {
      return 0;
    }

    if (!a) {
      return 1;
    }

    const widthA = a.position.constrainWidth ?? popupSize.width;
    const heightA = a.position.constrainHeight ?? popupSize.height;
    const areaA = widthA * heightA;

    const widthB = b.position.constrainWidth ?? popupSize.width;
    const heightB = b.position.constrainHeight ?? popupSize.height;
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
