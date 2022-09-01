import { MajorDataSeries } from '@birchill/jpdict-idb';
import { browser } from 'webextension-polyfill-ts';

import { QueryResult } from '../query';
import { html } from '../../utils/builder';

import { renderCloseButton } from './close';
import {
  renderBook,
  renderCog,
  renderKanjiIcon,
  renderPerson,
  renderPin,
} from './icons';
import { getLangTag } from './lang-tag';

export function renderTabBar({
  onClosePopup,
  onShowSettings,
  onSwitchDictionary,
  queryResult,
  selectedTab,
}: {
  onClosePopup?: () => void;
  onShowSettings?: () => void;
  onSwitchDictionary?: (newDict: MajorDataSeries) => void;
  queryResult?: QueryResult;
  selectedTab: MajorDataSeries;
}): HTMLElement {
  const tabBar = html('div', { class: 'tab-bar', lang: getLangTag() });

  tabBar.addEventListener('pointerup', () => {
    // Dummy event to make Safari not eat clicks on the child links / buttons.
  });

  const list = html('ul', { class: 'tabs' });

  const sections: Array<{
    series: MajorDataSeries;
    renderIcon: () => SVGElement;
  }> = [
    { series: 'words', renderIcon: renderBook },
    { series: 'kanji', renderIcon: renderKanjiIcon },
    { series: 'names', renderIcon: renderPerson },
  ];
  for (const { series, renderIcon } of sections) {
    const li = html('li', { class: 'tab', role: 'presentation' });

    if (series === selectedTab) {
      li.setAttribute('aria-selected', 'true');
    } else if (!queryResult || !queryResult[series]) {
      li.classList.add('disabled');
    }

    const a = html('a', {});
    if (series !== selectedTab && onSwitchDictionary) {
      a.href = '#';
      a.onclick = (event: Event) => {
        event.preventDefault();
        onSwitchDictionary(series);
      };
    }
    li.append(a);

    const icon = renderIcon();
    icon.classList.add('icon');
    a.append(icon);

    a.append(html('span', {}, browser.i18n.getMessage(`tabs_${series}_label`)));

    list.append(li);
  }
  tabBar.append(list);

  tabBar.append(renderPinButton());

  if (onShowSettings) {
    tabBar.append(renderSettingsButton(onShowSettings));
  }

  if (onClosePopup) {
    tabBar.append(renderCloseButton(onClosePopup));
  }

  return tabBar;
}

function renderPinButton(): HTMLElement {
  const pinButton = html(
    'button',
    {
      'aria-label': browser.i18n.getMessage('popup_pin_label'),
      title: browser.i18n.getMessage('popup_pin_label'),
      class: 'pin-button',
      type: 'button',
    },
    renderPin()
  );
  // TODO: Add an event listener to this

  return html('div', { class: 'pin' }, pinButton);
}

function renderSettingsButton(onShowSettings: () => void): HTMLElement {
  const settingsButton = html(
    'button',
    {
      'aria-label': browser.i18n.getMessage('popup_settings_label'),
      title: browser.i18n.getMessage('popup_settings_label'),
      class: 'settings-button',
      type: 'button',
    },
    renderCog()
  );
  settingsButton.onclick = onShowSettings;

  return html('div', { class: 'settings' }, settingsButton);
}
