import { Point } from '../../utils/geometry';
import { getThemeClass } from '../../utils/themes';

const POPUP_ROUNDING = 5;

export function renderArrow({
  direction,
  popupContainer,
  popupPos: { x: popupX, y: popupY },
  popupSize,
  scrollPos: { x: scrollX, y: scrollY },
  side,
  target,
  theme,
}: {
  direction: 'vertical' | 'horizontal';
  popupContainer: HTMLElement;
  popupPos: Point;
  popupSize: { width: number; height: number };
  scrollPos: Point;
  side: 'before' | 'after';
  target: Point;
  theme: string;
}) {
  const arrow = document.createElement('div');
  arrow.classList.add('arrow');
  arrow.classList.add(getThemeClass(theme));
  popupContainer.append(arrow);

  const arrowWidth = parseFloat(getComputedStyle(arrow).width);
  const arrowHeight = parseFloat(getComputedStyle(arrow).height);

  // XXX Make the CSS rule that causes us to ignore the constrained width when
  // tabs are on top, _not_ apply when positioning the popup left/right of
  // vertical text.

  if (direction === 'vertical') {
    // `firstCharBbox`, `cursorPos` and `left` are all in screen co-ordinates
    // but `popupX` is in page coordinates so we first need to convert it to
    // screen co-ordinates.
    const screenPopupX = popupX - scrollX;
    let left = target.x - arrowWidth / 2 - screenPopupX;

    // Make sure the arrow does not overlap with the rounding of the popup
    left = Math.max(left, POPUP_ROUNDING);
    arrow.style.left = `${left}px`;

    if (side === 'before') {
      arrow.style.top = `${popupSize.height}px`;
      arrow.classList.add('-bottom');
    } else {
      arrow.style.top = `${-arrowHeight}px`;
      arrow.classList.add('-top');
    }
  } else {
    const screenPopupY = popupY - scrollY;
    let top = target.y - arrowWidth / 2 - screenPopupY;

    top = Math.max(top, POPUP_ROUNDING);
    arrow.style.top = `${top}px`;

    if (side === 'before') {
      arrow.style.left = `${popupSize.width}px`;
      arrow.classList.add('-right');
    } else {
      arrow.style.left = `${-arrowHeight}px`;
      arrow.classList.add('-left');
    }
  }
}

export function removeArrow() {
  const hostElem = document.getElementById('tenten-ja-window');
  hostElem?.shadowRoot?.querySelector('.arrow-container')?.remove();
}
