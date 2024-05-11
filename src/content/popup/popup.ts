import { FontSize } from '../../common/content-config-params';
import { getThemeClass } from '../../utils/themes';

import { removeContentContainer } from '../content-container';

import { getPopupContainer } from './popup-container';

export function isPopupVisible(): boolean {
  const popupContainer = getPopupContainer();
  return !!popupContainer && !popupContainer.classList.contains('hidden');
}

export function hidePopup() {
  getPopupContainer()?.classList.add('hidden');
}

export function removePopup() {
  removeContentContainer(['rikaichamp-window', 'tenten-ja-window']);
  document.getElementById('tenten-doc-styles')?.remove();
}

export function getPopupDimensions(hostElem: HTMLElement): {
  width: number;
  height: number;
} {
  // Measure the size of the inner window so that we don't include the padding
  // for the shadow
  const windowElem = hostElem.shadowRoot?.querySelector('.window');
  const width =
    (windowElem instanceof HTMLElement ? windowElem.offsetWidth : 0) || 200;
  const height =
    windowElem instanceof HTMLElement ? windowElem.offsetHeight : 0;
  return { width, height };
}

export function isPopupWindowHostElem(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.id === 'tenten-ja-window';
}

export function setFontSize(size: FontSize) {
  const popupWindow = getPopupWindow();
  if (!popupWindow) {
    return;
  }

  for (const className of popupWindow.classList.values()) {
    if (className.startsWith('font-')) {
      popupWindow.classList.remove(className);
    }
  }

  if (size !== 'normal') {
    popupWindow.classList.add(`font-${size}`);
  }
}

export function setPopupStyle(style: string) {
  const elems = [getPopupWindow(), getPopupArrow()];

  for (const elem of elems) {
    if (!elem) {
      continue;
    }

    for (const className of elem.classList.values()) {
      if (className.startsWith('theme-')) {
        elem.classList.remove(className);
      }
    }

    elem.classList.add(getThemeClass(style));
  }
}

function getPopupWindow(): HTMLElement | null {
  const hostElem = document.getElementById('tenten-ja-window');
  return hostElem && hostElem.shadowRoot
    ? hostElem.shadowRoot.querySelector('.window')
    : null;
}

function getPopupArrow(): HTMLElement | null {
  const hostElem = document.getElementById('tenten-ja-window');
  return hostElem && hostElem.shadowRoot
    ? hostElem.shadowRoot.querySelector('.arrow')
    : null;
}
