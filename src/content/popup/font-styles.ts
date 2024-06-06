import browser from 'webextension-polyfill';

import { html } from '../../utils/builder';

export function addFontStyles() {
  if (document.getElementById('tenten-font-styles')) {
    return;
  }

  (document.head || document.documentElement).append(
    html('link', {
      id: 'tenten-font-styles',
      rel: 'stylesheet',
      href: browser.runtime.getURL('css/popup-fonts.css'),
    })
  );
}

export function removeFontStyles() {
  document.getElementById('tenten-font-styles')?.remove();
}
