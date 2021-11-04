import { Point } from '../utils/geometry';
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
  if (!elem || !isGdocsLine(elem)) {
    return { position: null, text: '' };
  }

  const line = elem.getAttribute('aria-label');
  if (!line) {
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
  let end = line.length;
  while (start < end && Math.abs(end - start) > 1) {
    const mid = Math.floor((start + end) / 2);
    const width = ctx.measureText(line.substring(0, mid)).width;
    if (width > xPos) {
      end = mid;
    } else if (width < xPos) {
      start = mid;
    } else {
      start = mid;
      break;
    }
  }

  // If maxLength is not set, we just stop at the end of the current line.
  //
  // If it _is_ set and we don't have enough characters, look up the next line
  // too.
  let text = line;
  const selectedText = text.substring(start);
  if (maxLength && selectedText.length < maxLength) {
    const nextLine = elem.nextSibling;
    if (nextLine && isGdocsLine(nextLine)) {
      text +=
        nextLine
          .getAttribute('aria-label')
          ?.substring(0, Math.max(maxLength - selectedText.length, 0)) || '';
    }
  }

  return {
    position: {
      offset: start,
      offsetNode: elem,
    },
    text,
  };
}

export function isGdocsLine(node: Node): node is SVGRectElement {
  return (
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
