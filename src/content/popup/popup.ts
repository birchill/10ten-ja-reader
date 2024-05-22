import browser from 'webextension-polyfill';

import { AbortError } from '../../common/abort-error';
import { FontSize } from '../../common/content-config-params';
import { getThemeClass } from '../../utils/themes';

import { removeContentContainer } from '../content-container';
import type { QueryResult } from '../query';

import { getPopupContainer } from './popup-container';
import type {
  ShowPopupOptions,
  showPopup as showPopupSignature,
} from './show-popup';

export function isPopupVisible(): boolean {
  const popupContainer = getPopupContainer();
  return !!popupContainer && !popupContainer.classList.contains('hidden');
}

let showPopup: typeof showPopupSignature | undefined;
let showPopupGeneration = 0;

export async function lazyShowPopup(
  result: QueryResult | undefined,
  options: ShowPopupOptions
): Promise<ReturnType<typeof showPopupSignature>> {
  if (!showPopup) {
    const generation = ++showPopupGeneration;
    showPopup =
      // Webpack's chunk loading will create a script element with a relative
      // URL which isn't what we want so instead we opt-out of webpack's
      // chunk handling and export the popup code as a separate module.
      //
      // Once we switch to rspack, we might be able to try the
      // `experiments.outputModule` feature to generate real ESM
      // imports/exports.
      (
        await import(
          /* webpackIgnore: true */
          browser.runtime.getURL('10ten-ja-popup.js')
        )
      ).showPopup;

    // Check for overlapping requests
    if (generation !== showPopupGeneration) {
      throw new AbortError();
    }
  }

  return showPopup!(result, options);
}

export function hidePopup() {
  getPopupContainer()?.classList.add('hidden');
}

export function removePopup() {
  removeContentContainer(['rikaichamp-window', 'tenten-ja-window']);
  document.getElementById('tenten-doc-styles')?.remove();
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
