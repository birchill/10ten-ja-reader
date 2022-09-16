import { Point, Rect } from '../utils/geometry';

export type ScrollOffset = { scrollX: number; scrollY: number };

export function getScrollOffset(): ScrollOffset {
  // If we're in full screen mode, we should use the scroll position of the
  // full-screen element (which is always zero?).
  if (document.fullscreenElement) {
    return {
      scrollX: document.fullscreenElement.scrollLeft,
      scrollY: document.fullscreenElement.scrollTop,
    };
  }

  const { scrollX, scrollY } = document.defaultView!;
  return { scrollX, scrollY };
}

export function toPageCoords(
  screen: Readonly<Point>,
  scrollOffset?: ScrollOffset
): Point;
export function toPageCoords(
  screen: Readonly<Rect>,
  scrollOffset?: ScrollOffset
): Rect;

export function toPageCoords<T extends Point | Rect>(
  screen: Readonly<T>,
  scrollOffset?: ScrollOffset
): T {
  const { scrollX, scrollY } = scrollOffset || getScrollOffset();

  // The following is a mess because Typescript doesn't do narrow for generics
  // yet: https://github.com/microsoft/TypeScript/issues/33014
  if (isPoint(screen)) {
    return {
      x: screen.x + scrollX,
      y: screen.y + scrollY,
    } as unknown as Readonly<T>;
  } else {
    return {
      left: (screen as Readonly<Rect>).left + scrollX,
      top: (screen as Readonly<Rect>).top + scrollY,
      width: (screen as Readonly<Rect>).width,
      height: (screen as Readonly<Rect>).height,
    } as unknown as Readonly<T>;
  }
}

export function toScreenCoords(
  page: Readonly<Point>,
  scrollOffset?: ScrollOffset
): Point;
export function toScreenCoords(
  page: Readonly<Rect>,
  scrollOffset?: ScrollOffset
): Rect;

export function toScreenCoords<T extends Point | Rect>(
  page: Readonly<T>,
  scrollOffset?: ScrollOffset
): T {
  const { scrollX, scrollY } = scrollOffset || getScrollOffset();

  if (isPoint(page)) {
    return {
      x: page.x - scrollX,
      y: page.y - scrollY,
    } as unknown as Readonly<T>;
  } else {
    return {
      left: (page as Readonly<Rect>).left - scrollX,
      top: (page as Readonly<Rect>).top - scrollY,
      width: (page as Readonly<Rect>).width,
      height: (page as Readonly<Rect>).height,
    } as unknown as Readonly<T>;
  }
}

function isPoint(
  pointOrRect: Readonly<Point | Rect>
): pointOrRect is Readonly<Point> {
  // Sometimes we get Rect-like things that have an 'x' and 'y' member on them
  // so it's better to test the input is _not_ a rect.
  return typeof (pointOrRect as Readonly<Rect>).width !== 'number';
}
