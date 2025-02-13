import { html } from '../utils/builder';
import {
  SVG_NS,
  isElement,
  isTextInputNode,
  isTextNode,
} from '../utils/dom-utils';
import {
  Point,
  Rect,
  bboxIncludesPoint,
  getBboxForNodeList,
} from '../utils/geometry';
import {
  getBboxForSingleCodepointRange,
  getRangeForSingleCodepoint,
} from '../utils/range';
import { isChromium } from '../utils/ua-utils';

import { isGdocsOverlayElem } from './gdocs-canvas';
import { isPopupWindowHostElem } from './popup/popup-container';
import { toPageCoords } from './scroll-offset';

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
  if (isTextInputPosition(position)) {
    // For a textarea we still need to check it overlaps since at least in
    // Firefox, if it is display: block, caretPositionFromPoint might return it
    // even when the point is outside the element.
    //
    // And although we've never encountered such a case, we should probably
    // check that the element is visible too.
    return positionIntersectsPoint(position, point) &&
      isVisible(position.offsetNode)
      ? position
      : null;
  }

  // For Google Docs, presumably the element is overlapping and visible.
  if (isGdocsOverlayPosition(position)) {
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
  if (typeof document.caretPositionFromPoint === 'function') {
    const shadowRoots = getDescendantShadowRoots(element);
    const position = document.caretPositionFromPoint(point.x, point.y, {
      shadowRoots,
    });
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

  const previousCharacterBbox = getBboxForSingleCodepointRange(range);
  return previousCharacterBbox &&
    bboxIncludesPoint({ bbox: previousCharacterBbox, point })
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
  const bbox = getBboxForPosition(position);
  return !bbox || bboxIncludesPoint({ bbox, margin: 5, point });
}

function getBboxForPosition(position: CursorPosition): Rect | null {
  const node = position.offsetNode;
  if (isTextNode(node)) {
    const range = new Range();
    range.selectNode(node);
    return range.getBoundingClientRect();
  }

  if (isElement(node)) {
    if (getComputedStyle(node).display === 'contents') {
      return getBboxForNodeList(node.childNodes);
    }
    return node.getBoundingClientRect();
  }

  return null;
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
  const bbox = getBboxForSingleCodepointRange(range);
  if (!bbox) {
    return null;
  }

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
  limitToDescendants = false,
}: {
  point: Point;
  element: Element;
  limitToDescendants?: boolean;
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

  if (
    !range ||
    // Normally we don't perform a lookup if we detect a pointermove event over
    // the popup window, but when using the puck we allow it as otherwise when
    // the puck pointer passes over the window, we'll fail to dismiss it.
    isPopupWindowHostElem(range.startContainer) ||
    (limitToDescendants && !element.contains(range.startContainer))
  ) {
    return null;
  }

  // Unlike `document.caretPositionFromPoint` in Gecko,
  // `document.caretRangeFromPoint` in Blink/WebKit doesn't dig into shadow DOM
  // so we need to do it manually.
  range = expandShadowDomInRange({ range, point });

  // Check if we are now pointing at an input text node.
  if (isTextInputNode(range.startContainer)) {
    return getCursorPositionFromTextInput({
      input: range!.startContainer,
      point,
    });
  }

  // Range adjustment for Safari
  range = adjustForRangeBoundary({ range, point });

  return range
    ? { offsetNode: range.startContainer, offset: range.startOffset }
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
  // Empty input elements
  if (!input.value.trim().length) {
    return null;
  }

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
  const mirrorElement = createMirrorElement(input, input.value);

  // Read the offset
  //
  // We need to be careful not to allow caretRangeFromPoint to visit elements
  // outside the mirror element or else we can end up in a case of infinite
  // recursion where we pick up the same input element all over again.
  //
  // We _could_ just call `document.caretRangeFromPoint` here which would avoid
  // recursion but then we'd miss out on the position adjustment we do in
  // `caretRangeFromPoint` (which maybe would be ok? It's what we do for shadow
  // DOM after all?).
  const result = caretRangeFromPoint({
    point,
    element: mirrorElement,
    limitToDescendants: true,
  });
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

function createMirrorElement(source: HTMLElement, text?: string): HTMLElement {
  // Create the element
  const mirrorElement = html('div');

  // Fill in the text/child content
  if (text !== undefined) {
    mirrorElement.append(text);
  } else {
    // If we don't have a specific string to use, we duplicate all the source
    // element's children.
    //
    // Often we'll know which `Text` child of the source element we're
    // interested in but unfortunately it's not enough to duplicate that one
    // `Text` child in isolation since it could appear amongst other inline
    // siblings and if we don't duplicate them, it won't get the correct
    // position.
    //
    // We _can_ get the position of the text node, but it might wrap over
    // several lines and we need to duplicate that wrapping too in order to get
    // the correct positioning.
    //
    // We can get the bbox for each line via getClientRects() but we don't know
    // what _characters_ are in each box.
    //
    // In order to do that we'd probably need to make up many ranges and bisect
    // them until we could assign characters to boxes but that's quite involved
    // so currently we just duplicate all the descendant elements.
    //
    // That has some limitations such as not being able to reproduce
    // pseudo-elements so in future we probably should attempt to get just the
    // text and bounding box for the range we're interested in and reproducing
    // that.
    //
    // For now, however, this approach of duplicating all the descendants works
    // for all the content we've encountered.
    const childNodes = source.shadowRoot
      ? source.shadowRoot.childNodes
      : source.childNodes;
    for (const child of childNodes) {
      mirrorElement.append(cloneNodeWithStyles(child));
    }
  }

  // Set its styles to be the same
  const cs = document.defaultView!.getComputedStyle(source);
  const stylesToSet: Record<string, string> = {};
  for (let i = 0; i < cs.length; i++) {
    const prop = cs.item(i);
    stylesToSet[prop] = cs.getPropertyValue(prop);
  }

  for (const [name, value] of Object.entries(stylesToSet)) {
    mirrorElement.style.setProperty(name, value);
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
      source.offsetWidth -
      parseFloat(paddingLeft) -
      parseFloat(paddingRight) -
      parseFloat(borderLeftWidth) -
      parseFloat(borderRightWidth);
    if (Number.isFinite(width)) {
      mirrorElement.style.width = `${width}px`;
    }

    const height =
      source.offsetHeight -
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
  const bbox = source.getBoundingClientRect();

  // Fetch the top/left coordinates, bearing in mind that the bbox returned by
  // getBoundingClientRect is the position exclusive of margins and is in screen
  // coordinates.
  const marginTop = parseFloat(cs.marginTop);
  const marginLeft = parseFloat(cs.marginLeft);
  const screenPoint = { x: bbox.left - marginLeft, y: bbox.top - marginTop };
  const { x: left, y: top } = toPageCoords(screenPoint);

  mirrorElement.style.top = top + 'px';
  mirrorElement.style.left = left + 'px';

  // Finally, make sure our element is on top
  mirrorElement.style.zIndex = '2147483647';

  // Append the element to the document. We need to do this before adjusting
  // the scroll offset or else it won't update.
  document.documentElement.appendChild(mirrorElement);

  // Match the scroll position
  const { scrollLeft, scrollTop } = source;
  mirrorElement.scrollTo(scrollLeft, scrollTop);

  return mirrorElement;
}

function cloneNodeWithStyles(node: Node): Node {
  if (
    !isElement(node) ||
    (!(node instanceof HTMLElement) && !(node instanceof SVGElement))
  ) {
    return node.cloneNode(true);
  }

  const clone = node.cloneNode(false) as HTMLElement | SVGElement;
  const cs = document.defaultView!.getComputedStyle(node);
  const stylesToSet: Record<string, string> = {};
  for (let i = 0; i < cs.length; i++) {
    const prop = cs.item(i);
    stylesToSet[prop] = cs.getPropertyValue(prop);
  }

  for (const [name, value] of Object.entries(stylesToSet)) {
    clone.style.setProperty(name, value);
  }

  for (const child of node.childNodes) {
    clone.appendChild(cloneNodeWithStyles(child));
  }

  return clone;
}

// --------------------------------------------------------------------------
//
// Shadow DOM helpers
//
// --------------------------------------------------------------------------

function expandShadowDomInRange({
  range,
  point,
}: {
  range: Range;
  point: Point;
}): Range {
  if (!isElement(range.startContainer)) {
    return range;
  }

  // Get the shadowRoot at the given point, if any.
  //
  // (This is complicated by the fact in Blink, `caretRangeFromPoint` seems to
  // return the _parent_ of elements with a shadow root.)
  const shadowRoot = getShadowRoot({ element: range.startContainer, point });
  if (!shadowRoot) {
    return range;
  }

  // See if we can find a shadow element at the given point
  const shadowNode = getShadowNodeAtPoint({ shadowRoot, point });
  if (!shadowNode || shadowNode === range.startContainer) {
    return range;
  }

  // If we got a text input element, return it as a range
  if (isTextInputNode(shadowNode)) {
    const range = new Range();
    range.setStart(shadowNode, 0);
    range.setEnd(shadowNode, 0);
    return range;
  }

  // Text nodes require special handling since we want to use the styles from
  // the host with the text from the shadow DOM.
  if (isTextNode(shadowNode)) {
    // We should only get a text node if it's the direct child of a shadow root
    // (but that might not be the same shadow root as `shadowRoot` above).
    const localShadowRoot = shadowNode.getRootNode();
    const host =
      localShadowRoot instanceof ShadowRoot ? localShadowRoot.host : null;
    if (!(host instanceof HTMLElement)) {
      return range;
    }

    const shadowRange = getRangeForShadowTextNode({
      shadowContainer: host,
      text: shadowNode,
      point,
    });
    return shadowRange || range;
  }

  const shadowRange = getRangeForShadowElement({
    shadowElement: shadowNode,
    point,
  });
  return shadowRange || range;
}

// In Chrome, `caretRangeFromPoint` will return the _parent_ element of a shadow
// DOM host so we need to dig down to find the _child_ node with the shadowRoot,
// if any.
function getShadowRoot({
  element,
  point,
}: {
  element: Element;
  point: Point;
}): ShadowRoot | null {
  if (element.shadowRoot) {
    return element.shadowRoot;
  }

  for (const child of element.children) {
    const { shadowRoot } = child;
    if (!shadowRoot) {
      continue;
    }

    // Get the bbox of the child to check that it overlaps the point but bear in
    // mind that custom elements are often marked as display: contents.
    const bbox = getBboxForShadowHost(child);
    if (!bbox) {
      continue;
    }

    // Only return a child shadowRoot if it actually overlaps the point
    if (shadowRoot && bboxIncludesPoint({ bbox, point })) {
      return shadowRoot;
    }
  }

  return null;
}

function getDescendantShadowRoots(root: Element): Array<ShadowRoot> {
  const shadowRoots: Array<ShadowRoot> = [];

  function traverse(element: Element) {
    if (element.shadowRoot) {
      shadowRoots.push(element.shadowRoot);

      for (const child of element.shadowRoot.children) {
        traverse(child);
      }
    }

    for (const child of element.children) {
      traverse(child);
    }
  }

  traverse(root);

  return shadowRoots;
}

function getBboxForShadowHost(element: Element): Rect | null {
  // For display: contents, `getBoundingClientRect()` will return an empty
  // bounding box so we need to return the contents of the shadow root instead.
  if (getComputedStyle(element).display === 'contents') {
    return getBboxForNodeList(element.shadowRoot!.childNodes);
  }

  return element.getBoundingClientRect();
}

function getShadowNodeAtPoint({
  shadowRoot,
  point,
}: {
  shadowRoot: ShadowRoot;
  point: Point;
}): Element | Text | null {
  // elementsFromPoint can only detect _elements_ but shadow roots can have Text
  // nodes as children so first look for any direct Text children whose tight
  // bounding box fits.
  const textChildren = [...shadowRoot.childNodes].filter(isTextNode);
  for (const child of textChildren) {
    const range = new Range();
    range.selectNode(child);
    const bboxes = range.getClientRects();
    if ([...bboxes].some((bbox) => bboxIncludesPoint({ bbox, point }))) {
      return child;
    }
  }

  // Find the first visible element in the shadow tree under the cursor
  const hitElements = shadowRoot.elementsFromPoint(point.x, point.y);
  const hitElement = hitElements.find(
    (elem) =>
      (getComputedStyle(elem).display === 'contents' || isVisible(elem)) &&
      shadowRoot.contains(elem)
  );

  // Recursively visit shadow roots
  const nestedShadowRoot = hitElement
    ? getShadowRoot({ element: hitElement, point })
    : null;
  if (nestedShadowRoot) {
    return getShadowNodeAtPoint({ shadowRoot: nestedShadowRoot, point });
  }

  return hitElement || null;
}

function getRangeForShadowTextNode({
  shadowContainer,
  text,
  point,
}: {
  shadowContainer: HTMLElement;
  text: Text;
  point: Point;
}): Range | null {
  if (!text.data.trim().length) {
    return null;
  }

  // Make up a mirror element in the light DOM that we can run
  // `document.caretRangeFromPoint` on.
  const mirrorElement = createMirrorElement(shadowContainer);
  const newRange = document.caretRangeFromPoint(point.x, point.y);
  if (!newRange || !mirrorElement.contains(newRange.startContainer)) {
    mirrorElement.remove();
    return null;
  }

  // We need to store the offset before removing the mirror element or else
  // the range will be updated
  const offset = newRange.startOffset;
  mirrorElement.remove();

  const shadowRange = new Range();
  shadowRange.setStart(text, offset);
  shadowRange.setEnd(text, offset);
  return shadowRange;
}

function getRangeForShadowElement({
  shadowElement,
  point,
}: {
  shadowElement: Element;
  point: Point;
}): Range | null {
  // Check if the element has text
  if (
    !(shadowElement instanceof HTMLElement) ||
    !(shadowElement.textContent || '').trim().length
  ) {
    return null;
  }

  // Get the block ancestor, since inline children might be split over several
  // lines.
  let blockAncestor = shadowElement;
  while (
    blockAncestor &&
    blockAncestor.parentElement &&
    ['inline', 'ruby', 'contents', 'inline flow'].includes(
      getComputedStyle(blockAncestor).display
    )
  ) {
    blockAncestor = blockAncestor.parentElement;
  }

  // Make up a mirror element in the light DOM that we can run
  // `document.caretRangeFromPoint` on.
  const mirrorElement = createMirrorElement(blockAncestor);
  const newRange = document.caretRangeFromPoint(point.x, point.y);
  if (!newRange || !mirrorElement.contains(newRange.startContainer)) {
    mirrorElement.remove();
    return null;
  }

  // Translate the range in the light DOM to the one in the shadow DOM
  const path: number[] = [];
  for (
    let node = newRange.startContainer, depth = 0;
    node.parentElement && node !== mirrorElement && depth < 10;
    node = node.parentElement, depth++
  ) {
    const index = [...node.parentElement.childNodes].indexOf(node as ChildNode);
    path.unshift(index);
  }

  // We need to store the offset before removing the mirror element or else
  // the range will be updated
  const offset = newRange.startOffset;
  mirrorElement.remove();

  let shadowTarget: Node | undefined = blockAncestor;
  while (shadowTarget && path.length) {
    shadowTarget = shadowTarget.childNodes[path.shift()!];
  }

  if (!isTextNode(shadowTarget)) {
    return null;
  }

  const shadowRange = new Range();
  shadowRange.setStart(shadowTarget, offset);
  shadowRange.setEnd(shadowTarget, offset);
  return shadowRange;
}

// --------------------------------------------------------------------------
//
// More caretRangeFromPoint helpers
//
// --------------------------------------------------------------------------

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

  const firstCharBbox = getBboxForSingleCodepointRange(firstCharRange);
  if (!firstCharBbox || !bboxIncludesPoint({ bbox: firstCharBbox, point })) {
    return range;
  }

  firstCharRange.setEnd(firstNonEmptyTextNode, 0);
  return firstCharRange;
}
