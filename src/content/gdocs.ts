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

export function getTextFromAnnotatedCanvas(point: Point): {
  position: CursorPosition | null;
  text: string;
} {
  // TODO: maxLength

  const elem = document.elementFromPoint(point.x, point.y);
  if (!elem || !isGdocsSpan(elem)) {
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

  return {
    position: {
      offset: start,
      offsetNode: elem,
    },
    text: line,
  };
}

export function isGdocsSpan(node: Node): node is SVGRectElement {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).namespaceURI === SVG_NS &&
    (node as SVGElement).tagName === 'rect' &&
    (node as SVGElement).hasAttribute('aria-label')
  );
}
