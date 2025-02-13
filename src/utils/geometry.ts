import { isElement, isTextNode } from './dom-utils';

export type Rect = { left: number; top: number; width: number; height: number };

export type Point = { x: number; y: number };

export type Box = { top: number; right: number; bottom: number; left: number };

/// Measures from some box (or point) outwards
export type MarginBox = Box;

/// Measures from some box inwards
export type PaddingBox = Box;

// Conversion utilities

export function addMarginToPoint(margin: MarginBox, point: Point): Rect {
  return {
    left: point.x - margin.left,
    top: point.y - margin.top,
    width: margin.left + margin.right,
    height: margin.top + margin.bottom,
  };
}

export function getMarginAroundPoint(point: Point, rect: Rect): MarginBox {
  return {
    left: Math.max(0, point.x - rect.left),
    top: Math.max(0, point.y - rect.top),
    right: Math.max(0, rect.left + rect.width - point.x),
    bottom: Math.max(0, rect.top + rect.height - point.y),
  };
}

// Geometry utils

export function union(a: Rect, b: Rect): Rect {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    width:
      Math.max(a.left + a.width, b.left + b.width) - Math.min(a.left, b.left),
    height:
      Math.max(a.top + a.height, b.top + b.height) - Math.min(a.top, b.top),
  };
}

export function bboxIncludesPoint({
  bbox,
  margin = 0,
  point,
}: {
  bbox: Rect;
  margin?: number;
  point: Point;
}): boolean {
  return (
    bbox.left - margin <= point.x &&
    bbox.left + bbox.width + margin >= point.x &&
    bbox.top - margin <= point.y &&
    bbox.top + bbox.height + margin >= point.y
  );
}

// DOM geometry utils

export function getBboxForNodeList(nodes: NodeList): Rect | null {
  return [...nodes].reduce<Rect | null>((bbox, child) => {
    let thisBbox: Rect | null = null;
    if (isTextNode(child)) {
      const range = new Range();
      range.selectNode(child);
      thisBbox = range.getBoundingClientRect();
    } else if (isElement(child)) {
      if (getComputedStyle(child).display === 'none') {
        thisBbox = getBboxForNodeList(child.childNodes);
      } else {
        thisBbox = child.getBoundingClientRect();
      }
    }

    if (!thisBbox) {
      return bbox;
    }

    return bbox ? union(bbox, thisBbox) : thisBbox;
  }, null);
}
