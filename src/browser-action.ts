import { DataSeriesState } from '@birchill/hikibiki-data';

import { JpdictStateWithFallback } from './jpdict';

interface BrowserActionState {
  popupStyle: string;
  enabled: boolean;
  jpdictState: JpdictStateWithFallback;
}

export function updateBrowserAction({
  popupStyle,
  enabled,
  jpdictState,
}: BrowserActionState) {
  let iconFilename = 'disabled';
  let titleStringId = 'command_toggle_disabled';

  // First choose the base icon type / text
  if (enabled) {
    const jpdictWords = jpdictState.words.state;
    const fallbackWords = jpdictState.words.fallbackState;

    if (jpdictWords === DataSeriesState.Ok || fallbackWords === 'ok') {
      iconFilename = popupStyle;
      titleStringId = 'command_toggle_enabled';
    } else if (
      jpdictWords === DataSeriesState.Initializing ||
      fallbackWords === 'loading'
    ) {
      iconFilename = 'loading';
      titleStringId = 'command_toggle_loading';
    } else if (fallbackWords === 'unloaded') {
      // If we get this far, we've either failed to load the jpdict database or
      // we simply haven't got around to populating it yet (e.g. we're still
      // downloading the other databases).
      //
      // However, we won't load the fallback database until the user actually
      // tries to look something up so we don't know if it's available yet or
      // not. For now, assume everything is ok.
      iconFilename = popupStyle;
      titleStringId = 'command_toggle_enabled';
    } else {
      iconFilename = 'error';
      titleStringId = 'error_loading_dictionary';
    }
  }

  // Next determine if we need to overlay any additional information.
  switch (jpdictState.updateState.state) {
    case 'checking':
      // Technically the '-indeterminate' icon would be more correct here but
      // using '-0' instead leads to less flicker.
      iconFilename += '-0';
      titleStringId = 'command_toggle_checking';
      break;

    case 'downloading':
    case 'updatingdb':
      // We only have progress variants for the Ok, disabled, and loading styles.
      if ([popupStyle, 'disabled', 'loading'].includes(iconFilename)) {
        iconFilename +=
          '-' + Math.round(jpdictState.updateState.progress * 5) * 20;
      }
      titleStringId =
        jpdictState.updateState.state === 'downloading'
          ? 'command_toggle_downloading'
          : 'command_toggle_updating';
      break;
  }

  // Set the icon
  browser.browserAction
    .setIcon({
      path: `images/rikaichamp-${iconFilename}.svg`,
    })
    .catch(() => {
      // Assume we're on Chrome and it still can't handle SVGs
      //
      // If we're loading then, well, that's an animated file for which we only
      // have an SVG version so we should use the disabled variant instead.
      if (iconFilename.startsWith('loading')) {
        iconFilename = iconFilename.replace('loading', 'disabled');
      }
      browser.browserAction.setIcon({
        path: {
          16: `images/rikaichamp-${iconFilename}-16.png`,
          32: `images/rikaichamp-${iconFilename}-32.png`,
          48: `images/rikaichamp-${iconFilename}-48.png`,
        },
      });
    });

  // Add a warning overlay and update the string if there was a fatal
  // update error.
  //
  // TODO: Replace with allMajorDataSeries once we support words data
  const supportedMajorDataSeries: Array<'names' | 'kanji'> = ['names', 'kanji'];
  const hasNotOkDatabase = supportedMajorDataSeries.some(
    (series) => jpdictState[series].state !== DataSeriesState.Ok
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
    browser.browserAction.setBadgeText({ text: '!' });
    browser.browserAction.setBadgeBackgroundColor({ color: 'yellow' });
    titleStringId = 'command_toggle_update_error';
  } else {
    browser.browserAction.setBadgeText({ text: '' });
  }

  // Set the caption
  browser.browserAction.setTitle({
    title: browser.i18n.getMessage(titleStringId),
  });
}
