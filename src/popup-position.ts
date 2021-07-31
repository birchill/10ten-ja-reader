import { Point } from './geometry';
import type { RikaiPuck } from './puck';

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
  doc,
  isVerticalText,
  puck,
  mousePos,
  popupSize,
  positionMode,
  targetHasTitle,
}: {
  doc: Document;
  isVerticalText: boolean;
  puck: RikaiPuck | null;
  mousePos?: Point;
  popupSize: { width: number; height: number };
  positionMode: PopupPositionMode;
  targetHasTitle: boolean;
}): {
  x: number;
  y: number;
  constrainWidth: number | null;
  constrainHeight: number | null;
} {
  const { scrollX, scrollY } = doc.defaultView!;
  // Use the clientWidth (as opposed to doc.defaultView.innerWidth) since this
  // excludes the width of any scrollbars.
  const stageWidth = doc.documentElement.clientWidth;

  // For the height, however, we need to be careful because:
  // - in quirks mode, the body has the viewport height;
  // - when the puck is in use, we must consider the safe area insets, and thus
  //   doc.defaultView.innerHeight must be used. See comments in puck.ts, in the
  //   getViewportDimensions() function, for more details.
  const stageHeight = puck
    ? doc.defaultView!.innerHeight
    : doc.compatMode === 'BackCompat'
    ? doc.body?.clientHeight || doc.defaultView!.innerHeight
    : doc.documentElement.clientHeight;

  if (positionMode === PopupPositionMode.Auto) {
    return getAutoPosition({
      isVerticalText,
      puck,
      mousePos,
      popupSize,
      scrollX,
      scrollY,
      targetHasTitle,
      stageWidth,
      stageHeight,
    });
  }

  const availableStageHeight = stageHeight - 2 * GUTTER;

  const left = scrollX + GUTTER;
  const top = scrollY + GUTTER;
  const right = scrollX + stageWidth - popupSize.width - GUTTER;
  const bottom =
    scrollY +
    stageHeight -
    Math.min(popupSize.height, availableStageHeight) -
    GUTTER;

  // We could calculate a value for constrainHeight as something like:
  //
  //   constrainHeight = popupSize.height > availableStageHeight
  //                     ? availableStageHeight
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

function getAutoPosition({
  isVerticalText,
  puck,
  mousePos,
  popupSize,
  scrollX,
  scrollY,
  targetHasTitle,
  stageWidth,
  stageHeight,
}: {
  isVerticalText: boolean;
  puck: RikaiPuck | null;
  mousePos?: Point;
  popupSize: { width: number; height: number };
  scrollX: number;
  scrollY: number;
  targetHasTitle: boolean;
  stageWidth: number;
  stageHeight: number;
}): {
  x: number;
  y: number;
  constrainWidth: number | null;
  constrainHeight: number | null;
} {
  let x = mousePos?.x || 0;
  let y = mousePos?.y || 0;

  // Inline position: Go back (left or up) if necessary
  //
  // (We shouldn't need to check the opposite direction since the initial
  // position, if set to something non-zero, is coming from a mouse event which
  // should, I believe, be positive.)
  let inline = isVerticalText ? y : x;
  const inlinePopupSize = isVerticalText ? popupSize.height : popupSize.width;
  const inlineStageSize = isVerticalText ? stageHeight : stageWidth;
  if (inline + inlinePopupSize > inlineStageSize - GUTTER) {
    inline = inlineStageSize - inlinePopupSize - GUTTER;
    if (inline < 0) {
      inline = 0;
    }
  }

  // Block position: Position "below" the mouse cursor
  let blockAdjust = 25;

  // If the element has a title, then there will probably be
  // a tooltip that we shouldn't cover up.
  if (targetHasTitle) {
    blockAdjust += 20;
  }

  // Check if we are too close to the stage edge (bottom / right)...
  let block = isVerticalText ? x : y;
  const blockPopupSize = isVerticalText ? popupSize.width : popupSize.height;
  const blockStageSize = isVerticalText ? stageWidth : stageHeight;
  let constrainBlockSize: number | null = null;
  if (block + blockAdjust + blockPopupSize > blockStageSize) {
    // ...we are. See if the other side has more room.
    const spaceOnThisSide = blockStageSize - block;
    const spaceOnOtherSide = block;
    if (spaceOnOtherSide > spaceOnThisSide) {
      blockAdjust = Math.max(-blockPopupSize - 25, -block);
      if (spaceOnOtherSide - 25 < blockPopupSize) {
        constrainBlockSize = spaceOnOtherSide - 25;
      }
    }
  }

  block += blockAdjust;

  // De-logicalize before we add the scroll position since that's phyiscal
  x = isVerticalText ? block : inline;
  y = isVerticalText ? inline : block;
  const constrainHeight = !isVerticalText ? constrainBlockSize : null;
  const constrainWidth = isVerticalText ? constrainBlockSize : null;

  // Adjust for scroll position
  x += scrollX;
  y += scrollY;

  return { x, y, constrainWidth, constrainHeight };
}
