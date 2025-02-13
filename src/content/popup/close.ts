import browser from 'webextension-polyfill';

import { html } from '../../utils/builder';

import { renderCross } from './icons';

export function renderCloseButton(
  onClosePopup: () => void,
  closeShortcuts: ReadonlyArray<string>
): HTMLElement {
  const label = browser.i18n.getMessage('popup_close_label');
  const title = closeShortcuts.length
    ? `${label} (${closeShortcuts.join(' / ')})`
    : label;
  const closeButton = html(
    'button',
    { 'aria-label': label, title, class: 'close-button', type: 'button' },
    renderCross()
  );
  closeButton.onclick = (event: MouseEvent) => {
    event.preventDefault();
    onClosePopup();
  };

  return html('div', { class: 'close' }, closeButton);
}
