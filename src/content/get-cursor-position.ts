import { html } from '../utils/builder';
import { isTextInputNode, isTextNode, SVG_NS } from '../utils/dom-utils';
import { bboxIncludesPoint, Point } from '../utils/geometry';
import { getRangeForSingleCodepoint } from '../utils/range';
import { isChromium } from '../utils/ua-utils';

import { isGdocsOverlayElem } from './gdocs-canvas';

declare global {
  // The following definitions were dropped from lib.dom.d.ts in TypeScript 4.4
  // since only Firefox supports them.
  interface CaretPosition {
    readonly offsetNode: Node;
    readonly offset: number;
    getClientRect(): DOMRect | null;
  }

  interface Document {
    caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null;
  }
}

export type CursorPosition<T extends Node = Node> = {
  offset: number;
  offsetNode: T;
};

/**
 * Wrapper around document.caretPositionFromPoint / document.caretRangeFromPoint
 * that works around browser inconsistencies and bugs and digs into elements
 * that otherwise would be hidden or unselectable.
 */
export function getCursorPosition({
  point,
  elements: initialElements,
}: {
  point: Point;
  elements: readonly Element[];
}): CursorPosition | null {
  if (!initialElements.length) {
    return null;
  }

  // Do an initial lookup
  const initialResult = getCursorPositionForElement({
    point,
    element: initialElements[0],
  });

  // Check if our initial result is good enough
  if (
    isTextNodePosition(initialResult) ||
    isTextInputPosition(initialResult) ||
    isGdocsOverlayPosition(initialResult)
  ) {
    return initialResult;
  }

  // Otherwise see if we can get a better result by disabling pointer-events on
  // any transparent elements from the hit list and checking again.
  const stylesToRestore = new Map<Element, string | null>();

  try {
    const elements = [...initialElements];
    let firstElement = true;

    for (
      let element = elements.shift();
      element;
      element = elements.shift(), firstElement = false
    ) {
      // Skip elements without a style attribute (since we have no easy way to
      // toggle their pointer-events state).
      if (
        !(element instanceof HTMLElement) &&
        !(element instanceof SVGElement)
      ) {
        continue;
      }

      // Skip elements that are already visible
      //
      // We need special handling here to account for "covering links".
      //
      // Normally we can just check if the current element is invisible or not
      // but for asahi.com we have a special case where it effectively makes the
      // covering content invisible by setting the dimensions of a _child_
      // element to 1x1.
      //
      // To detect that case we check for a non-auto z-index since that has
      // proven to be the most reliable indicator of this pattern. If we simply
      // decide to treat the element as invisible whenever its bounding box
      // doesn't line up, we'll run this too often and cause a performance
      // regression when the the cursor is moving around empty space on the Web
      // page.
      //
      // We only do this for the initial lookup for now because so far that's
      // proved sufficient (and is probably cheaper than trying to perform this
      // check on every element in the hit list).
      const treatElementAsInvisible =
        firstElement && getComputedStyle(element).zIndex !== 'auto';
      if (!treatElementAsInvisible && isVisible(element)) {
        continue;
      }

      // Temporarily turn off pointer-events on the (invisible) element
      stylesToRestore.set(element, element.getAttribute('style'));
      element.style.setProperty('pointer-events', 'none', 'important');

      // See if we get a better result now
      const result = getCursorPositionForElement({ point, element });
      if (isTextNodePosition(result) || isTextInputPosition(result)) {
        return result;
      }
    }
  } finally {
    restoreStyles(stylesToRestore);
  }

  // We didn't find anything better by toggling pointer-events, so use the
  // original result.
  return initialResult;
}

export function isTextNodePosition(
  position: CursorPosition | null | undefined
): position is CursorPosition<Text> {
  return !!position && isTextNode(position.offsetNode);
}

export function isTextInputPosition(
  position: CursorPosition | null | undefined
): position is CursorPosition<HTMLInputElement | HTMLTextAreaElement> {
  return !!position && isTextInputNode(position.offsetNode);
}

export function isGdocsOverlayPosition(
  position: CursorPosition | null | undefined
): position is CursorPosition<SVGElement> {
  return (
    !!position &&
    document.location.host === 'docs.google.com' &&
    isGdocsOverlayElem(position.offsetNode)
  );
}

function getElementForPosition(
  position: CursorPosition | null | undefined
): Element | null {
  return position?.offsetNode?.nodeType === Node.ELEMENT_NODE
    ? (position.offsetNode as Element)
    : position?.offsetNode?.parentElement || null;
}

function getCursorPositionForElement({
  point,
  element,
}: {
  point: Point;
  element: Element;
}): CursorPosition | null {
  // Lookup point
  let position = lookupPoint({ point, element });

  // If the position is in a text input element or Google Docs element return it
  // immediately.
  if (isTextInputPosition(position) || isGdocsOverlayPosition(position)) {
    return position;
  }

  // If we have any other kind of node, see if we need to override the
  // user-select style to get a better result.
  //
  // This addresses two issues:
  //
  // 1. In Firefox, content with `user-select: all` will cause
  //    caretPositionFromPoint to return the parent element.
  //
  // 2. In Safari, content with `-webkit-user-select: none` will not be found by
  //    caretRangeFromPoint.
  //
  if (!isTextNodePosition(position)) {
    const userSelectResult = lookupPointWithNormalizedUserSelect({
      point,
      element,
    });

    // If we got back a text node, prefer it to our previous result
    if (isTextNodePosition(userSelectResult)) {
      position = userSelectResult;
    }
  }

  // Check that the element intersects the point
  //
  // This can happen when the Web page sets the geometry of the element we
  // picked up in a way that hides it (see the extended comment before
  // `positionIntersectsPoint` for details).
  if (position && !positionIntersectsPoint(position, point)) {
    return null;
  }

  // Check that the position is close to the lookup point since sometimes
  // due to line-wrapping etc. caretPositionFromPoint can return a point far
  // away from the cursor.
  if (isTextNodePosition(position) && !isResultCloseToPoint(position, point)) {
    return null;
  }

  // Check that the element is visible
  const positionElement = getElementForPosition(position);
  if (positionElement && !isVisible(positionElement)) {
    return null;
  }

  return position;
}

function isVisible(element: Element) {
  // Use the checkVisibility API when available
  if ('checkVisibility' in element) {
    return element.checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true,
    });
  }

  const { opacity, visibility } = getComputedStyle(element);
  return opacity !== '0' && visibility !== 'hidden';
}

function lookupPoint({
  point,
  element,
}: {
  point: Point;
  element: Element;
}): CursorPosition | null {
  const position = getCaretPosition({ point, element });
  if (!position) {
    return null;
  }

  if (isTextNodePosition(position) && position.offset) {
    position.offset = getVisualOffset({ position, point });
  }

  return position;
}

function getCaretPosition({
  point,
  element,
}: {
  point: Point;
  element: Element;
}): CursorPosition | null {
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(point.x, point.y);
    return position?.offsetNode
      ? { offset: position.offset, offsetNode: position.offsetNode }
      : null;
  }

  return caretRangeFromPoint({ point, element });
}

// If the cursor is more than half way across a character,
// caretPositionFromPoint will choose the _next_ character since that's where
// the cursor would be placed if you clicked there and started editing the
// text.
//
// (Or something like that, it looks like when editing it's more like if the
// character is 70% or so of the way across the character it inserts before
// the next character. In any case, caretPositionFromPoint et. al appear to
// consistently choose the next character after about the 50% mark in at least
// Firefox and Chromium.)
//
// For _looking up_ text, however, it's more intuitive if we look up starting
// from the character you're pointing at.
//
// Here we see if the point is within the bounding box of the _previous_
// character in the inline direction and, if it is, start from there instead.
function getVisualOffset({
  position,
  point,
}: {
  position: CursorPosition<Text>;
  point: Point;
}): number {
  const range = getRangeForSingleCodepoint({
    source: position.offsetNode,
    offset: position.offset,
    direction: 'backwards',
  });

  const previousCharacterBbox = range.getBoundingClientRect();
  return bboxIncludesPoint({ bbox: previousCharacterBbox, point })
    ? range.startOffset
    : position.offset;
}

function lookupPointWithNormalizedUserSelect({
  point,
  element,
}: {
  point: Point;
  element: Element;
}): CursorPosition | null {
  const stylesToRestore = new Map<Element, string | null>();
  let currentElem: Element | null = element;
  while (currentElem) {
    // If the element doesn't have a style attribute we can't override it
    if (
      !(currentElem instanceof HTMLElement) &&
      !(currentElem instanceof SVGElement)
    ) {
      currentElem = currentElem.parentElement;
      continue;
    }

    const { userSelect, webkitUserSelect } = getComputedStyle(currentElem);
    const ok = ['auto', 'text', ''];
    if (!ok.includes(userSelect) || !ok.includes(webkitUserSelect)) {
      stylesToRestore.set(currentElem, currentElem.getAttribute('style'));
      // We set the styles directly on the element (as opposed to temporarily
      // installing a stylesheet) since this should work better on shadow DOM
      // elements.
      currentElem.style.setProperty('user-select', 'text', 'important');
      currentElem.style.setProperty('-webkit-user-select', 'text', 'important');
    }

    currentElem = currentElem.parentElement;
  }

  if (!stylesToRestore.size) {
    return null;
  }

  // Look up again
  const result = lookupPoint({ point, element });

  restoreStyles(stylesToRestore);

  return result;
}

function restoreStyles(styles: Map<Element, string | null>) {
  for (const [elem, style] of styles) {
    if (style) {
      elem.setAttribute('style', style);
    } else {
      elem.removeAttribute('style');
    }
  }
}

// --------------------------------------------------------------------------
//
// Intersection checking
//
// --------------------------------------------------------------------------

// Check that the element's bounding box encapsulates the point, roughly.
//
// This is needed for at least two cases:
//
// 1) When the cursor is between two paragraphs. In that case the distance
//    check below is not sufficient since we'll still be fairly close to the
//    text we picked up (perhaps we should make the distance check based on
//    the writing mode?).
//
// 2) For the "covering link" case found on sites like asahi.com which have
//    a structure like the following:
//
//    <div>
//      <a href="/articles/" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; z-index: 1">
//        <span aria-hidden="true" style="display: block; width: 1px; height: 1px; overflow: hidden">
//          あいうえお
//        </span>
//      </a>
//    </div>
//    <div>
//      <div style="position: relative; width: 100%">
//        <h2 style="z-index: auto">
//          <a href="/articles/" id="innerLink">
//            あいうえお
//          </a>
//        </h2>
//      </div>
//    </div>
//
//    In this case caretPositionFromPoint will return a position inside the
//    first <span> (inside the "covering link") but that span is effectively
//    made invisible by giving it a width and height of 1px.
//
//    We need to reject that result so we have a chance to look for the text
//    in the covered <div> (the second <a> element).
function positionIntersectsPoint(
  position: CursorPosition,
  point: Point
): boolean {
  const positionElement = getElementForPosition(position);

  return (
    !!positionElement &&
    (getComputedStyle(positionElement).display === 'contents' ||
      bboxIncludesPoint({
        bbox: positionElement.getBoundingClientRect(),
        margin: 5,
        point,
      }))
  );
}

// --------------------------------------------------------------------------
//
// Distance checking
//
// --------------------------------------------------------------------------

function isResultCloseToPoint(
  position: { offsetNode: Text; offset: number },
  point: Point
): boolean {
  const distanceResult = getDistanceFromTextNode(position, point);

  // We should be within the space of about three characters
  return (
    !distanceResult || distanceResult.distance <= distanceResult.glyphExtent * 3
  );
}

function getDistanceFromTextNode(
  position: { offsetNode: Text; offset: number },
  point: Point
): { distance: number; glyphExtent: number } | null {
  const { offsetNode: node, offset } = position;

  if (!node.parentElement) {
    return null;
  }

  // Ignore SVG content (it doesn't normally need distance checking).
  if (node.parentElement.namespaceURI === SVG_NS) {
    return null;
  }

  // Get bbox of first character in range (since that's where we select from).
  const range = getRangeForSingleCodepoint({ source: node, offset });
  const bbox = range.getBoundingClientRect();

  // Find the distance from the cursor to the closest edge of that character
  // since if we have a large font size the two distances could be quite
  // different.
  const xDist = Math.min(
    Math.abs(point.x - bbox.left),
    Math.abs(point.x - bbox.right)
  );
  const yDist = Math.min(
    Math.abs(point.y - bbox.top),
    Math.abs(point.y - bbox.bottom)
  );

  const distance = Math.sqrt(xDist * xDist + yDist * yDist);
  const glyphExtent = Math.sqrt(
    bbox.width * bbox.width + bbox.height * bbox.height
  );

  return { distance, glyphExtent };
}

// --------------------------------------------------------------------------
//
// caretRangeFromPoint helpers
//
// --------------------------------------------------------------------------

/**
 * Wrapper for document.caretRangeFromPoint that fixes some deficiencies when
 * compared with caretPositionFromPoint (at least with regards to the Firefox
 * implementation of caretPositionFromPoint).
 */
function caretRangeFromPoint({
  point,
  element,
}: {
  point: Point;
  element: Element;
}): CursorPosition | null {
  // Special handling for text boxes.
  //
  // 1. In Chromium, caretRangeFromPoint doesn't return text input elements.
  //    Instead it returns one of their ancestors.
  //
  // 2. In WebKit, caretRangeFromPoint returns text input elements, but always
  //    sets the offset to 0.
  if (isTextInputNode(element)) {
    return getCursorPositionFromTextInput({ input: element, point });
  }

  let range = document.caretRangeFromPoint(point.x, point.y);

  // TODO: Shadow DOM handling

  // Range adjustment for Safari
  range = adjustForRangeBoundary({ range, point });

  return range
    ? {
        offsetNode: range.startContainer,
        offset: range.startOffset,
      }
    : null;
}

/**
 * Helper for caretRangeFromPoint to look up text input elements.
 */
function getCursorPositionFromTextInput({
  input,
  point,
}: {
  input: HTMLInputElement | HTMLTextAreaElement;
  point: Point;
}): CursorPosition | null {
  // This is only called when the platform APIs failed to give us the correct
  // result so we need to synthesize an element with the same layout as the
  // text area, read the text position, then drop it.
  //
  // We currently only expect to use it together with caretRangeFromPoint since
  // caretPositionFromPoint should look up text inputs correctly.
  if (!('caretRangeFromPoint' in document)) {
    throw new Error('caretRangeFromPoint not available');
  }

  // Create the element
  const mirrorElement = html('div', {}, input.value);

  // Set its styles to be the same
  const cs = document.defaultView!.getComputedStyle(input);
  for (let i = 0; i < cs.length; i++) {
    const prop = cs.item(i);
    mirrorElement.style.setProperty(prop, cs.getPropertyValue(prop));
  }

  // Special handling for Chromium which does _not_ include the scrollbars in
  // the width/height when box-sizing is 'content-box'.
  if (isChromium() && cs.boxSizing === 'content-box') {
    const { paddingLeft, paddingRight, paddingTop, paddingBottom } = cs;
    const {
      borderLeftWidth,
      borderRightWidth,
      borderTopWidth,
      borderBottomWidth,
    } = cs;

    const width =
      input.offsetWidth -
      parseFloat(paddingLeft) -
      parseFloat(paddingRight) -
      parseFloat(borderLeftWidth) -
      parseFloat(borderRightWidth);
    if (Number.isFinite(width)) {
      mirrorElement.style.width = `${width}px`;
    }

    const height =
      input.offsetHeight -
      parseFloat(paddingTop) -
      parseFloat(paddingBottom) -
      parseFloat(borderTopWidth) -
      parseFloat(borderBottomWidth);
    if (Number.isFinite(height)) {
      mirrorElement.style.height = `${height}px`;
    }
  }

  // Set its position in the document to be to be the same
  mirrorElement.style.position = 'absolute';
  const bbox = input.getBoundingClientRect();

  // We need to factor in the document scroll position too
  const top = bbox.top + document.documentElement.scrollTop;
  const left = bbox.left + document.documentElement.scrollLeft;

  mirrorElement.style.top = top + 'px';
  mirrorElement.style.left = left + 'px';

  // Finally, make sure it is on top
  mirrorElement.style.zIndex = '10000';

  // Append the element to the document. We need to do this before adjusting
  // the scroll offset or else it won't update.
  document.documentElement.appendChild(mirrorElement);

  // Match the scroll position
  const { scrollLeft, scrollTop } = input;
  mirrorElement.scrollTo(scrollLeft, scrollTop);

  // Read the offset
  const result = caretRangeFromPoint({ point, element: mirrorElement });
  if (result) {
    // Adjust the offset before we drop the mirror element
    if (isTextNodePosition(result)) {
      result.offset = getVisualOffset({ position: result, point });
    }

    result.offsetNode = input;
  }

  // Drop the element
  mirrorElement.remove();

  return result;
}

// On Safari, if you pass a point into caretRangeFromPoint that is less than
// about 60~70% of the way across the first character in a text node it will
// return the previous text node instead.
//
// Here we try to detect that situation and return the "next" text node instead.
function adjustForRangeBoundary({
  range,
  point,
}: {
  range: Range | null;
  point: Point;
}): Range | null {
  // Check we got a range with the offset set to the end of a text node
  if (
    !range ||
    !range.startOffset ||
    range.startContainer.nodeType !== Node.TEXT_NODE ||
    range.startOffset !== range.startContainer.textContent?.length
  ) {
    return range;
  }

  // Check there is a _different_ text node under the cursor
  const elemFromPoint = document.elementFromPoint(point.x, point.y);
  if (
    !(elemFromPoint instanceof HTMLElement) ||
    elemFromPoint === range.startContainer ||
    !elemFromPoint.innerText.length
  ) {
    return range;
  }

  // Check the first character in the new element is actually the one under the
  // cursor.
  const firstNonEmptyTextNode = Array.from(elemFromPoint.childNodes).find(
    (elem): elem is Text =>
      elem.nodeType === Node.TEXT_NODE && !!(elem as Text).length
  );
  if (!firstNonEmptyTextNode) {
    return range;
  }

  const firstCharRange = getRangeForSingleCodepoint({
    source: firstNonEmptyTextNode,
    offset: 0,
  });

  const firstCharBbox = firstCharRange.getBoundingClientRect();
  if (!bboxIncludesPoint({ bbox: firstCharBbox, point })) {
    return range;
  }

  firstCharRange.setEnd(firstNonEmptyTextNode, 0);
  return firstCharRange;
}
