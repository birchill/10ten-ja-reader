import { allMajorDataSeries } from '@birchill/jpdict-idb';
import { browser } from 'webextension-polyfill-ts';

import { JpdictStateWithFallback } from './jpdict';

interface BrowserActionState {
  enabled: boolean;
  jpdictState: JpdictStateWithFallback;
  tabId: number | undefined;
  toolbarIcon: 'default' | 'sky';
}

export function updateBrowserAction({
  enabled,
  jpdictState,
  tabId,
  toolbarIcon,
}: BrowserActionState) {
  let iconFilename = '10ten-disabled';
  let titleStringId = 'command_toggle_disabled';

  // First choose the base icon type / text
  if (enabled) {
    const jpdictWords = jpdictState.words.state;
    const fallbackWords = jpdictState.words.fallbackState;

    if (jpdictWords === 'ok' || fallbackWords === 'ok') {
      iconFilename = '10ten';
      titleStringId = 'command_toggle_enabled';
    } else if (jpdictWords === 'init' || fallbackWords === 'loading') {
      titleStringId = 'command_toggle_loading';
    } else if (fallbackWords === 'unloaded') {
      // If we get this far, we've either failed to load the jpdict database or
      // we simply haven't got around to populating it yet (e.g. we're still
      // downloading the other databases).
      //
      // However, we won't load the fallback database until the user actually
      // tries to look something up so we don't know if it's available yet or
      // not. For now, assume everything is ok.
      iconFilename = '10ten';
      titleStringId = 'command_toggle_enabled';
    } else {
      iconFilename = '10ten-error';
      titleStringId = 'error_loading_dictionary';
    }
  }

  // Next determine if we need to overlay any additional information.
  switch (jpdictState.updateState.type) {
    case 'checking':
      // Technically the '-indeterminate' icon would be more correct here but
      // using '-0' instead leads to less flicker.
      iconFilename += '-0';
      titleStringId = 'command_toggle_checking';
      break;

    case 'updating':
      // We only have progress variants for the regular and disabled styles.
      if (['10ten', '10ten-disabled'].includes(iconFilename)) {
        iconFilename +=
          '-' + Math.round(jpdictState.updateState.totalProgress * 5) * 20;
      }
      titleStringId = 'command_toggle_downloading';
      break;
  }

  // Apply the variant, if needed
  if (toolbarIcon === 'sky') {
    iconFilename += '-sky';
  }

  // Set the icon
  //
  // We'd like to feature-detect if SVG icons are supported but Safari will
  // just fail silently if we try.
  if (__SUPPORTS_SVG_ICONS__) {
    void browser.browserAction.setIcon({
      path: `images/${iconFilename}.svg`,
      tabId,
    });
  } else {
    void browser.browserAction.setIcon({
      path: {
        16: `images/${iconFilename}-16.png`,
        32: `images/${iconFilename}-32.png`,
        48: `images/${iconFilename}-48.png`,
      },
      tabId,
    });
  }

  // Add a warning overlay and update the string if there was a fatal
  // update error.
  const hasNotOkDatabase = allMajorDataSeries.some(
    (series) => jpdictState[series].state !== 'ok'
  );
  if (
    hasNotOkDatabase &&
    !!jpdictState.updateError &&
    jpdictState.updateError.name !== 'AbortError' &&
    // Don't show quota exceeded errors. If the quota is exceeded, there's not
    // a lot the user can do about it, and we don't want to bother them with
    // a constant error signal.
    jpdictState.updateError.name !== 'QuotaExceededError'
  ) {
    void browser.browserAction.setBadgeText({ text: '!', tabId });
    void browser.browserAction.setBadgeBackgroundColor({
      color: 'yellow',
      tabId,
    });
    titleStringId = 'command_toggle_update_error';
  } else {
    void browser.browserAction.setBadgeText({ text: '', tabId });
  }

  // Set the caption
  void browser.browserAction.setTitle({
    title: browser.i18n.getMessage(titleStringId),
    tabId,
  });
}

// This will clobber any existing icon settings so it is only intended
// to be used on startup (when no existing icon is already set) or when the icon
// setting is changed (in which case we will update the browser action for
// enabled tabs immediately afterwards anyway).
export function setDefaultToolbarIcon(toolbarIcon: 'default' | 'sky') {
  let iconFilename = '10ten-disabled';

  // Apply the variant, if needed
  if (toolbarIcon === 'sky') {
    iconFilename += '-sky';
  }

  // Set the icon
  //
  // We'd like to feature-detect if SVG icons are supported but Safari will
  // just fail silently if we try.
  if (__SUPPORTS_SVG_ICONS__) {
    void browser.browserAction.setIcon({ path: `images/${iconFilename}.svg` });
  } else {
    void browser.browserAction.setIcon({
      path: {
        16: `images/${iconFilename}-16.png`,
        32: `images/${iconFilename}-32.png`,
        48: `images/${iconFilename}-48.png`,
      },
    });
  }
}
