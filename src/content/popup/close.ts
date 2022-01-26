import { browser } from 'webextension-polyfill-ts';

import { html } from './builder';
import { renderCross } from './icons';

export function renderCloseButton(onClosePopup: () => void): HTMLElement {
  const closeButton = html(
    'button',
    {
      'aria-label': browser.i18n.getMessage('popup_close_label'),
      class: 'close-button',
      type: 'button',
    },
    renderCross()
  );
  closeButton.onclick = (event: MouseEvent) => {
    event.preventDefault();
    onClosePopup();
  };

  return html('div', { class: 'close' }, closeButton);
}
