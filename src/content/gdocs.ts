import { Point, Rect } from '../utils/geometry';
import { CursorPosition } from './get-text';
import { SVG_NS } from './svg';

export function injectGdocsStyles() {
  removeGdocsStyles();

  const style = document.createElement('style');
  style.id = 'tenten-gdocs-styles';
  style.textContent = `.kix-canvas-tile-selection { pointer-events: none }
.kix-canvas-tile-content g rect[aria-label] { pointer-events: all }`;
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
}): {
  position: CursorPosition | null;
  text: string;
} {
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

  // Do a binary search to find the start of the string
  const xPos = point.x - elem.getBoundingClientRect().left;
  ctx.font = font;

  let start = 0;
  let end = text.length;
  while (start < end && Math.abs(end - start) > 1) {
    const mid = Math.floor((start + end) / 2);
    const width = ctx.measureText(text.substring(0, mid)).width;
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

  return {
    position: {
      offset: start,
      offsetNode: elem,
    },
    text,
  };
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

export function highlightRange({
  startSpan,
  offset,
  length,
}: {
  startSpan: SVGRectElement;
  offset: number;
  length: number;
}) {
  const boxes: Array<Rect> = [];

  const text = startSpan.getAttribute('aria-label');
  if (!text) {
    return;
  }

  const font = startSpan.getAttribute('data-font-css');
  if (!font) {
    return;
  }

  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) {
    return;
  }

  const { x, y: top, height } = startSpan.getBoundingClientRect();

  ctx.font = font;
  const leadingWidth = ctx.measureText(text.substring(0, offset)).width;
  const width = ctx.measureText(text.substring(offset, offset + length)).width;

  boxes.push({ left: x + leadingWidth, top, width, height });

  let highlight = document.getElementById('tenten-gdocs-highlight');
  if (!highlight) {
    highlight = document.createElement('div');
    highlight.id = 'tenten-gdocs-highlight';
    highlight.style.position = 'absolute';
    highlight.style.pointerEvents = 'none';
    highlight.style.backgroundColor = 'yellow';
    highlight.style.opacity = '0.3';
    highlight.style.zIndex = '100';
    document.body.append(highlight);
  }
  highlight.style.left = `${boxes[0].left}px`;
  highlight.style.top = `${boxes[0].top}px`;
  highlight.style.width = `${boxes[0].width}px`;
  highlight.style.height = `${boxes[0].height}px`;
}

export function clearHighlight() {
  document.getElementById('tenten-gdocs-highlight')?.remove();
}
