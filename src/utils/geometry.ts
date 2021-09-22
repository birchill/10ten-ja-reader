export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export type Box = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

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
    left: point.x - rect.left,
    top: point.y - rect.top,
    right: rect.left + rect.width - point.x,
    bottom: rect.top + rect.height - point.y,
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
  bbox: DOMRect;
  margin?: number;
  point: Point;
}): boolean {
  return (
    bbox.left - margin <= point.x &&
    bbox.right + margin >= point.x &&
    bbox.top - margin <= point.y &&
    bbox.bottom + margin >= point.y
  );
}
