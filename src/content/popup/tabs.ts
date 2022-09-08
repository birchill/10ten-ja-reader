import { MajorDataSeries } from '@birchill/jpdict-idb';
import { browser } from 'webextension-polyfill-ts';

import { QueryResult } from '../query';
import { DisplayMode } from '../popup-state';
import { html } from '../../utils/builder';
import { getMouseCapabilityMql } from '../../utils/device';

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
  closeShortcuts,
  displayMode,
  onClosePopup,
  onShowSettings,
  onSwitchDictionary,
  onTogglePin,
  pinShortcuts,
  queryResult,
  selectedTab,
}: {
  closeShortcuts?: ReadonlyArray<string>;
  displayMode: DisplayMode;
  onClosePopup?: () => void;
  onShowSettings?: () => void;
  onSwitchDictionary?: (newDict: MajorDataSeries) => void;
  onTogglePin?: () => void;
  pinShortcuts?: ReadonlyArray<string>;
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

    // We use a button because if it's a link there will be a little tooltip
    // show in the corner of the browser when the user hovers over the tab.
    const button = html('button', {});
    if (series !== selectedTab && onSwitchDictionary) {
      button.onclick = (event: Event) => {
        event.preventDefault();
        onSwitchDictionary(series);
      };
    }
    li.append(button);

    const icon = renderIcon();
    icon.classList.add('icon');
    button.append(icon);

    button.append(
      html('span', {}, browser.i18n.getMessage(`tabs_${series}_label`))
    );

    list.append(li);
  }
  tabBar.append(list);

  // We don't want to show the pin on devices that don't have a mouse since it's
  // generally not useful there (and just takes up room).
  //
  // If, however, the user somehow managed to get the popup into a pinned state,
  // we should show the icon just so they don't get confused (and can get out of
  // that state).
  const showPin =
    onTogglePin &&
    (getMouseCapabilityMql()?.matches !== false || displayMode === 'pinned');
  if (showPin) {
    tabBar.append(renderPinButton(onTogglePin, pinShortcuts || []));
  }

  if (onShowSettings) {
    tabBar.append(renderSettingsButton(onShowSettings));
  }

  if (onClosePopup) {
    tabBar.append(renderCloseButton(onClosePopup, closeShortcuts || []));
  }

  return tabBar;
}

function renderPinButton(
  onTogglePin: () => void,
  pinShortcuts: ReadonlyArray<string>
): HTMLElement {
  const label = browser.i18n.getMessage('popup_pin_label');
  const title = pinShortcuts.length
    ? `${label} (${pinShortcuts.join(' / ')})`
    : label;
  const pinButton = html(
    'button',
    {
      'aria-label': label,
      title,
      class: 'pin-button',
      type: 'button',
    },
    renderPin()
  );
  pinButton.onclick = onTogglePin;

  return html('div', { class: 'pin' }, pinButton);
}

function renderSettingsButton(onShowSettings: () => void): HTMLElement {
  const label = browser.i18n.getMessage('popup_settings_label');
  const settingsButton = html(
    'button',
    {
      'aria-label': label,
      title: label,
      class: 'settings-button',
      type: 'button',
    },
    renderCog()
  );
  settingsButton.onclick = onShowSettings;

  return html('div', { class: 'settings' }, settingsButton);
}
