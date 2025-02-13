import { MarginBox, PaddingBox, Point } from '../../utils/geometry';

import { getScrollOffset } from '../scroll-offset';

export const enum PopupPositionMode {
  Start,
  TopLeft = Start,
  Auto,
  BottomRight,
  End = BottomRight,
}

export interface PopupPosition {
  x: number;
  y: number;
  constrainWidth: number | null;
  constrainHeight: number | null;
  direction: 'vertical' | 'horizontal' | 'disjoint';
  side: 'before' | 'after' | 'disjoint';
}

// We have three (ok, two) possible situations:
//
// A) Tab bar is on the top -- we want to fix the top and left position.
// B) Tab bar is on the left -- we want to fix the top and left position.
//    i.e. as with A
// C) Tab bar is on the right -- we want to fix the top and right position.
//
export type PopupPositionConstraints = {
  // Note that the 'x' position here should correspond to the _right_ edge of
  // the popup when `anchor` is `'right'`.
  x: number;
  y: number;
  anchor: 'top' | 'left' | 'right';
  direction: 'vertical' | 'horizontal' | 'disjoint';
  side: 'before' | 'after' | 'disjoint';
};

// Minimum space to leave between the edge of the pop-up and the edge of the
// stage.
const GUTTER = 5;

// Minimum space to leave between the edge of the pop-up and the cursor when in
// interactive mode.
//
// We don't want this value to be too large or else it becomes too hard to move
// the mouse over the popup.
const INTERACTIVE_MARGIN_TO_POPUP = 10;

// Minimum space to leave between the edge of the pop-up and the cursor when we
// are NOT in interactive mode. In future we'd probably like to make this the
// same value as INTERACTIVE_MARGIN_TO_POPUP but for now it's safest to keep
// things as they are.
const NON_INTERACTIVE_MARGIN_TO_POPUP = 25;

export function getPopupPosition({
  allowVerticalOverlap,
  cursorClearance,
  cursorPos,
  fixedPosition,
  interactive,
  isVerticalText,
  popupSize,
  positionMode,
  safeArea: initialSafeArea,
  pointerType,
}: {
  // Allow overlapping with the cursor position in order to avoid constraining
  // the height
  allowVerticalOverlap: boolean;
  cursorClearance: MarginBox;
  cursorPos?: Point;
  fixedPosition?: PopupPositionConstraints;
  interactive: boolean;
  isVerticalText: boolean;
  popupSize: { width: number; height: number };
  positionMode: PopupPositionMode;
  safeArea: PaddingBox;
  pointerType: 'cursor' | 'puck';
}): PopupPosition {
  const { scrollX, scrollY } = getScrollOffset();

  // Use the clientWidth (as opposed to doc.defaultView.innerWidth) since this
  // excludes the width of any scrollbars.
  const stageWidth = document.documentElement.clientWidth;

  // For the height, we'd like to similarly use clientHeight...
  let stageHeight = document.documentElement.clientHeight;

  // ... but we need to be careful because:
  //
  // (a) in quirks mode, the body has the viewport height;
  if (document.compatMode === 'BackCompat') {
    stageHeight =
      document.body?.clientHeight || document.defaultView!.innerHeight;
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

  if (fixedPosition) {
    return getFixedPosition({
      allowVerticalOverlap,
      cursorClearance,
      cursorPos,
      fixedPosition,
      interactive,
      popupSize,
      safeArea,
      scrollX,
      scrollY,
      stageWidth,
      stageHeight,
    });
  }

  if (positionMode === PopupPositionMode.Auto) {
    return getAutoPosition({
      allowVerticalOverlap,
      cursorClearance,
      cursorPos,
      interactive,
      isVerticalText,
      popupSize,
      safeArea,
      scrollX,
      scrollY,
      stageWidth,
      stageHeight,
      pointerType,
    });
  }

  //
  // Manual positioning
  //

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
        direction: 'disjoint',
        side: 'disjoint',
      };

    case PopupPositionMode.BottomRight:
      return {
        x: right,
        y: bottom,
        constrainWidth: null,
        constrainHeight: null,
        direction: 'disjoint',
        side: 'disjoint',
      };
  }
}

function getFixedPosition({
  allowVerticalOverlap,
  cursorClearance,
  cursorPos,
  fixedPosition,
  interactive,
  popupSize,
  safeArea,
  scrollX,
  scrollY,
  stageWidth,
  stageHeight,
}: {
  allowVerticalOverlap: boolean;
  cursorClearance: MarginBox;
  cursorPos?: Point;
  fixedPosition: PopupPositionConstraints;
  interactive: boolean;
  popupSize: { width: number; height: number };
  safeArea: PaddingBox;
  scrollX: number;
  scrollY: number;
  stageWidth: number;
  stageHeight: number;
}): PopupPosition {
  // Work out our safe area in screen coordinates (as opposed to an inset).
  let { left: safeLeft, top: safeTop } = safeArea;
  let safeRight = stageWidth - safeArea.right;
  const stageBottom = stageHeight - safeArea.bottom;
  let safeBottom = stageBottom;

  // Convert inputs to screen coordinates
  let screenY = fixedPosition.y - scrollY;
  let screenX = fixedPosition.x - scrollX;

  // See if we can further constrain the area to place the popup in based on
  // the text being highlighted.
  const { direction, anchor, side } = fixedPosition;
  if (direction !== 'disjoint' && side !== 'disjoint' && cursorPos) {
    const [min, max] = getRangeForPopup({
      axis: direction,
      cursorClearance,
      interactive,
      side,
      safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
      target: cursorPos,
    });

    if (direction === 'vertical') {
      safeBottom = max;
    } else {
      safeLeft = min;
      safeRight = max;
    }
  }

  // Height constraints
  let constrainHeight = null;
  let verticalOverflow = Math.max(screenY + popupSize.height - safeBottom, 0);

  // See if we can unconstrain the height by overlapping the cursor.
  if (verticalOverflow && allowVerticalOverlap) {
    const nudgeAmount = Math.min(verticalOverflow, screenY - safeTop);
    screenY -= nudgeAmount;
    verticalOverflow = Math.max(screenY + popupSize.height - stageBottom, 0);
  }

  if (
    verticalOverflow &&
    shouldConstrainHeight({ interactive, direction, side })
  ) {
    constrainHeight = popupSize.height - verticalOverflow;
  }

  // The x position and width will depend on if we are anchoring to the left or
  // right.
  let constrainWidth: number | null;
  if (anchor !== 'right') {
    constrainWidth =
      screenX + popupSize.width > safeRight ? safeRight - screenX : null;
  } else {
    constrainWidth =
      screenX - popupSize.width < safeLeft ? screenX - safeLeft : null;
    screenX =
      constrainWidth !== null
        ? screenX - constrainWidth
        : screenX - popupSize.width;
  }

  return {
    x: screenX + scrollX,
    y: screenY + scrollY,
    constrainWidth,
    constrainHeight,
    direction,
    side,
  };
}

function shouldConstrainHeight(options: {
  interactive: boolean;
  direction: 'vertical' | 'horizontal' | 'disjoint';
  side: 'before' | 'after' | 'disjoint';
}) {
  // If we're not interactive, we don't want to constrain the height because
  // the user can't scroll the popup to see the rest of the content (but they
  // _can_ scroll the page).
  //
  // However, if the popup is positioned above the cursor, we need to constrain
  // the height otherwise it will cover up the cursor.
  return (
    options.interactive ||
    (options.direction === 'vertical' && options.side === 'before')
  );
}

function getAutoPosition({
  allowVerticalOverlap,
  cursorClearance,
  cursorPos,
  interactive,
  isVerticalText,
  popupSize,
  safeArea,
  scrollX,
  scrollY,
  stageWidth,
  stageHeight,
  pointerType,
}: {
  allowVerticalOverlap: boolean;
  cursorClearance: MarginBox;
  cursorPos?: Point;
  interactive: boolean;
  isVerticalText: boolean;
  popupSize: { width: number; height: number };
  safeArea: PaddingBox;
  scrollX: number;
  scrollY: number;
  stageWidth: number;
  stageHeight: number;
  pointerType: 'cursor' | 'puck';
}): PopupPosition {
  const extendedPosition = getScreenAutoPosition({
    allowVerticalOverlap,
    cursorClearance,
    cursorPos,
    interactive,
    isVerticalText,
    popupSize,
    safeArea,
    stageWidth,
    stageHeight,
    pointerType,
  });

  return extendedPosition
    ? {
        ...extendedPosition.position,
        x: extendedPosition.position.x + scrollX,
        y: extendedPosition.position.y + scrollY,
        constrainHeight: shouldConstrainHeight({
          interactive,
          direction: extendedPosition.axis,
          side: extendedPosition.side,
        })
          ? extendedPosition.position.constrainHeight
          : null,
      }
    : {
        x: scrollX,
        y: scrollY,
        constrainWidth: null,
        constrainHeight: null,
        direction: 'disjoint',
        side: 'disjoint',
      };
}

type ExtendedPopupPosition = {
  axis: 'vertical' | 'horizontal';
  side: 'before' | 'after';
  position: PopupPosition;
};

function getScreenAutoPosition({
  allowVerticalOverlap,
  cursorClearance,
  cursorPos,
  interactive,
  isVerticalText,
  popupSize,
  safeArea,
  stageWidth,
  stageHeight,
  pointerType,
}: {
  allowVerticalOverlap: boolean;
  cursorClearance: MarginBox;
  cursorPos?: Point;
  interactive: boolean;
  isVerticalText: boolean;
  popupSize: { width: number; height: number };
  safeArea: PaddingBox;
  stageWidth: number;
  stageHeight: number;
  pointerType: 'cursor' | 'puck';
}): ExtendedPopupPosition | undefined {
  // Set up a few useful variables...
  const x = cursorPos?.x || 0;
  const y = cursorPos?.y || 0;

  const { left: safeLeft, top: safeTop } = safeArea;
  const safeRight = stageWidth - safeArea.right;
  const safeBottom = stageHeight - safeArea.bottom;

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
  const candidates: Array<ExtendedPopupPosition | undefined> = [];

  for (const axis of axisOrder) {
    // Prefer the 'before' side when we are looking up horizontal text with the
    // puck.
    const swapSides = pointerType === 'puck' && axis === 'vertical';
    for (const side of swapSides ? sides.slice().reverse() : sides) {
      const position = calculatePosition({
        axis,
        cursorClearance,
        interactive,
        popupSize,
        safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
        target: { x, y },
        side,
      });
      candidates.push(position ? { axis, side, position } : undefined);
    }
  }

  // See if we have an unconstrained position in the block direction, and if so,
  // use that.
  const blockCandidates = candidates.slice(0, 2);
  const blockPosition = blockCandidates.find(
    (candidate) =>
      candidate &&
      (isVerticalText
        ? candidate.position.constrainWidth
        : candidate.position.constrainHeight) === null
  );
  if (blockPosition) {
    return blockPosition;
  }

  // Beyond that, our behavior depends on the sort of screen we're dealing with.
  //
  // There are two modes:
  //
  // A) In the general case, we want to stick to one of the block direction
  //    positions so we need to work out which direction is _less_ constrained.
  //
  // B) However, if the user is on a small screen which has more room in the
  //    inline direction (i.e. it's in "landscape mode" as far as the block
  //    direction is concerned) then putting the popup to the side could be
  //    quite helpful so we should check all the possible positions.
  let bestPosition: ExtendedPopupPosition | undefined;
  if (
    !isSmallLandscapeScreen({
      isVerticalText,
      safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
    })
  ) {
    bestPosition = blockCandidates.sort(sizeComparator(popupSize))[0];
  }

  // Otherwise, use the layout with the greatest width/area.
  if (!bestPosition) {
    bestPosition = candidates.sort(sizeComparator(popupSize))[0];
  }
  if (!bestPosition) {
    return undefined;
  }

  // Now that we have our best position, see if we can unconstrain it by
  // allowing overlap.
  if (
    allowVerticalOverlap &&
    bestPosition.axis === 'vertical' &&
    bestPosition.position.constrainHeight
  ) {
    const { position } = bestPosition;

    // Nudge up the top
    const nudgeAmount = Math.min(
      popupSize.height - position.constrainHeight!,
      position.y - safeTop
    );
    position.y -= nudgeAmount;

    // See if we are still constrained
    if (position.y + popupSize.height > safeBottom) {
      position.constrainHeight = safeBottom - position.y;
    } else {
      position.constrainHeight = null;
    }
  }

  return bestPosition;
}

function calculatePosition({
  axis,
  cursorClearance,
  interactive,
  popupSize,
  safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
  side,
  target,
}: {
  axis: 'vertical' | 'horizontal';
  cursorClearance: MarginBox;
  interactive: boolean;
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

  // We want the popup to be positioned slightly "before" the target position so
  // that if we are showing an arrow from the popup to the target position there
  // is enough slack to position the arrow inside the popup and still have it
  // line up with the target.
  //
  // Graphically,
  //
  //    x <-- target
  //  ╭^─────╮
  //   ⏟
  //   Cross offset
  //
  // At minimum we want to push the popup "back" by the width of the popup
  // rounding and half the width of the arrow.
  //
  // We _could_ fetch those values from computed style but we'd rather avoid
  // adding even more layout flushes so we just fudge it.
  //
  // At the time of writing the rounding is 5px and the arrow width is 20px, or
  // actually 28px if you add in the margin we allow for the shadow.
  //
  // That would give us an offset of 5px + 28px / 2 = 19px so we just use 20px
  // to allow us some leeway if those values change marginally.
  const CROSS_OFFSET = 20;
  const idealCrossPos =
    axis === 'vertical' ? target.x - CROSS_OFFSET : target.y - CROSS_OFFSET;
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
    interactive,
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
        constrainHeight: constrainAxisExtent,
        direction: axis,
        side,
      }
    : {
        x: axisPos,
        y: crossPos,
        constrainWidth: constrainAxisExtent,
        constrainHeight: constrainCrossExtent,
        direction: axis,
        side,
      };
}

function getRangeForPopup({
  axis,
  cursorClearance,
  interactive,
  side,
  safeBoundaries: { safeLeft, safeRight, safeTop, safeBottom },
  target,
}: {
  axis: 'vertical' | 'horizontal';
  cursorClearance: MarginBox;
  interactive: boolean;
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
  const marginToPopup = interactive
    ? INTERACTIVE_MARGIN_TO_POPUP
    : NON_INTERACTIVE_MARGIN_TO_POPUP;

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
