export type Point = {
  x: number;
  y: number;
};

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
