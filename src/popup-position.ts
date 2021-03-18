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
}): { x: number; y: number } {
  let x = mousePos?.x || 0;
  let y = mousePos?.y || 0;

  if (!targetElem) {
    return { x, y };
  }

  const {
    innerWidth: windowWidth,
    innerHeight: windowHeight,
    scrollX,
    scrollY,
  } = doc.defaultView!;

  // Horizontal position: Go left if necessary
  //
  // (We should never be too far left since popupX, if set to
  // something non-zero, is coming from a mouse event which should
  // be positive.)
  if (x + popupSize.width > windowWidth - 20) {
    x = windowWidth - popupSize.width - 20;
    if (x < 0) {
      x = 0;
    }
  }

  // Vertical position: Position below the mouse cursor
  let verticalAdjust = 25;

  // If the element has a title, then there will probably be
  // a tooltip that we shouldn't cover up.
  if ((targetElem as HTMLElement).title) {
    verticalAdjust += 20;
  }

  // Check if we are too close to the bottom...
  if (y + verticalAdjust + popupSize.height > windowHeight) {
    // ...we are, try going up instead.
    const topIfWeGoUp = y - popupSize.height - 30;
    if (topIfWeGoUp >= 0) {
      verticalAdjust = topIfWeGoUp - y;
    }
    // If we can't go up, we should still go down to prevent blocking
    // the cursor.
  }

  y += verticalAdjust;

  // Adjust for scroll position
  x += scrollX;
  y += scrollY;

  return { x, y };
}
