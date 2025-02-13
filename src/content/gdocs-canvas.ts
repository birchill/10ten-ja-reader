import { HighlightStyle } from '../common/content-config-params';
import { SVG_NS, empty } from '../utils/dom-utils';
import { Point, Rect } from '../utils/geometry';

import { CursorPosition } from './get-cursor-position';

export function injectGdocsStyles() {
  removeGdocsStyles();

  const style = document.createElement('style');
  style.id = 'tenten-gdocs-styles';
  style.textContent = `.kix-canvas-tile-selection { pointer-events: none }
.kix-canvas-tile-content g rect[aria-label] { pointer-events: all }
#tenten-gdocs-highlight {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 100;
  opacity: 0.3;
}
#tenten-gdocs-highlight .box {
  position: absolute;
  pointer-events: none;
  background-color: yellow;
}
#tenten-gdocs-highlight .box.blue {
  background-color: #2698fb;
}`;
  (document.head || document.documentElement).appendChild(style);
}

export function removeGdocsStyles() {
  document.getElementById('tenten-gdocs-styles')?.remove();
}

export function getTextFromAnnotatedCanvas({
  maxLength,
  point,
}: {
  maxLength?: number;
  point: Point;
}): { position: CursorPosition | null; text: string } {
  const elem = document.elementFromPoint(point.x, point.y);
  if (!elem || !isGdocsSpan(elem)) {
    return { position: null, text: '' };
  }

  let text = elem.getAttribute('aria-label');
  if (!text) {
    return { position: null, text: '' };
  }

  const font = elem.getAttribute('data-font-css');
  if (!font) {
    return { position: null, text: '' };
  }

  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) {
    return { position: null, text: '' };
  }

  const docScale = getDocScale(elem);

  // Do a binary search to find the start of the string
  const xPos = point.x - elem.getBoundingClientRect().left;
  ctx.font = font;

  let start = 0;
  let end = text.length;
  while (start < end && Math.abs(end - start) > 1) {
    const mid = Math.floor((start + end) / 2);
    const width = ctx.measureText(text.substring(0, mid)).width * docScale;
    if (width > xPos) {
      end = mid;
    } else if (width < xPos) {
      start = mid;
    } else {
      start = mid;
      break;
    }
  }

  // If maxLength is not set, we just stop at the end of the current span.
  //
  // If it _is_ set and we don't have enough characters, look up subsequent
  // spans.
  let currentSpan = elem;
  while (maxLength && text.substring(start).length < maxLength) {
    const nextSpan = currentSpan.nextSibling;
    if (!isGdocsSpan(nextSpan)) {
      break;
    }

    const remainingLength = maxLength - text.substring(start).length;
    text +=
      nextSpan.getAttribute('aria-label')?.substring(0, remainingLength) || '';
    currentSpan = nextSpan;
  }

  return { position: { offset: start, offsetNode: elem }, text };
}

function getDocScale(gdocsSpanElem: SVGElement) {
  const transform = gdocsSpanElem.getAttribute('transform');
  if (!transform) {
    return 1;
  }

  const matches = transform.match(/matrix\((.*)\)\s?/);
  if (!matches) {
    return 1;
  }

  const [, inner] = matches;
  const parts = inner.split(/\s*,\s*/);

  // We expect the document scale to be uniform (i.e. a =~ d) but we also happen
  // to know we only ever scale width (horizontal) values so we can just fetch
  // the horizontal scale value.
  if (!parts.length) {
    return 1;
  }
  const a = parseFloat(parts[0]);

  return a > 0 ? a : 1;
}

export function isGdocsSpan(node: Node | null): node is SVGRectElement {
  return (
    !!node &&
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).namespaceURI === SVG_NS &&
    (node as SVGElement).tagName === 'rect' &&
    (node as SVGElement).hasAttribute('aria-label')
  );
}

export function isGdocsOverlayElem(node: Node | null): node is SVGElement {
  return (
    !!node &&
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).namespaceURI === SVG_NS &&
    ((node as SVGElement).tagName === 'g' ||
      (node as SVGElement).tagName === 'rect')
  );
}

export function getGdocsRangeBboxes({
  startSpan,
  offset,
  length,
}: {
  startSpan: SVGRectElement;
  offset: number;
  length: number;
}): Array<Rect> {
  const boxes: Array<Rect> = [];

  const text = startSpan.getAttribute('aria-label');
  if (!text) {
    return boxes;
  }

  const font = startSpan.getAttribute('data-font-css');
  if (!font) {
    return boxes;
  }

  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) {
    return boxes;
  }

  const docScale = getDocScale(startSpan);

  const { x, y: top, height } = startSpan.getBoundingClientRect();

  ctx.font = font;
  const leadingWidth = offset
    ? ctx.measureText(text.substring(0, offset)).width * docScale
    : 0;
  const width =
    ctx.measureText(text.substring(offset, offset + length)).width * docScale;

  boxes.push({ left: x + leadingWidth, top, width, height });

  let currentSpan = startSpan;
  let accumulatedLength = text.length - offset;
  while (accumulatedLength < length) {
    if (!isGdocsSpan(currentSpan.nextSibling)) {
      break;
    }
    currentSpan = currentSpan.nextSibling;

    const text = currentSpan.getAttribute('aria-label');
    const font = currentSpan.getAttribute('data-font-css');
    if (!text || !font) {
      continue;
    }

    const lengthToMeasure = Math.min(length - accumulatedLength, text.length);
    accumulatedLength += lengthToMeasure;

    const { x: left, y: top, height } = currentSpan.getBoundingClientRect();
    ctx.font = font;
    const width =
      ctx.measureText(text.substring(0, lengthToMeasure)).width * docScale;

    boxes.push({ left, top, width, height });
  }

  return boxes;
}

export function highlightGdocsRange({
  startSpan,
  offset,
  length,
  style,
}: {
  startSpan: SVGRectElement;
  offset: number;
  length: number;
  style?: HighlightStyle;
}) {
  let highlightContainer = document.getElementById('tenten-gdocs-highlight');
  if (highlightContainer) {
    empty(highlightContainer);
  }

  const boxes = getGdocsRangeBboxes({ startSpan, offset, length });
  if (!boxes.length) {
    return;
  }

  if (!highlightContainer) {
    highlightContainer = document.createElement('div');
    highlightContainer.id = 'tenten-gdocs-highlight';
    const parent =
      document.querySelector('.kix-appview-editor') || document.body;
    parent.append(highlightContainer);
  }

  const containerBbox = highlightContainer.getBoundingClientRect();

  for (const box of boxes) {
    const boxElem = document.createElement('div');
    boxElem.classList.add('box');
    boxElem.classList.toggle('blue', style === 'blue');
    boxElem.style.left = `${box.left - containerBbox.left}px`;
    boxElem.style.top = `${box.top - containerBbox.top}px`;
    boxElem.style.width = `${box.width}px`;
    boxElem.style.height = `${box.height}px`;
    highlightContainer.append(boxElem);
  }
}

export function clearGdocsHighlight() {
  document.getElementById('tenten-gdocs-highlight')?.remove();
}
