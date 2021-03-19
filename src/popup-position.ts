export function getPopupPosition({
  doc,
  mousePos,
  popupSize,
  targetElem,
}: {
  doc: Document;
  mousePos: { x: number; y: number } | null;
  popupSize: { width: number; height: number };
  targetElem: Element | null;
}): {
  x: number;
  y: number;
  constrainWidth: number | null;
  constrainHeight: number | null;
} {
  let x = mousePos?.x || 0;
  let y = mousePos?.y || 0;

  if (!targetElem) {
    return { x, y, constrainWidth: null, constrainHeight: null };
  }

  const {
    innerWidth: windowWidth,
    innerHeight: windowHeight,
    scrollX,
    scrollY,
  } = doc.defaultView!;

  // Check for vertical text
  const isVerticalText =
    targetElem &&
    doc
      .defaultView!.getComputedStyle(targetElem)
      .writingMode.startsWith('vertical');

  // Inline position: Go back (left or up) if necessary
  //
  // (We shouldn't need to check the opposite direction since the initial
  // position, if set to something non-zero, is coming from a mouse event which
  // should, I believe, be positive.)
  let inline = isVerticalText ? y : x;
  const inlinePopupSize = isVerticalText ? popupSize.height : popupSize.width;
  const inlineWindowSize = isVerticalText ? windowHeight : windowWidth;
  if (inline + inlinePopupSize > inlineWindowSize - 20) {
    inline = inlineWindowSize - inlinePopupSize - 20;
    if (inline < 0) {
      inline = 0;
    }
  }

  // Block position: Position "below" the mouse cursor
  let blockAdjust = 25;

  // If the element has a title, then there will probably be
  // a tooltip that we shouldn't cover up.
  if ((targetElem as HTMLElement).title) {
    blockAdjust += 20;
  }

  // Check if we are too close to the window edge (bottom / right)...
  let block = isVerticalText ? x : y;
  const blockPopupSize = isVerticalText ? popupSize.width : popupSize.height;
  const blockWindowSize = isVerticalText ? windowWidth : windowHeight;
  let constrainBlockSize: number | null = null;
  if (block + blockAdjust + blockPopupSize > blockWindowSize) {
    // ...we are. See if the other side has more room.
    const spaceOnThisSide = blockWindowSize - block;
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
