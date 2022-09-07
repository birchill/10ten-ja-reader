/*

  10ten Japanese Reader
  by Brian Birtles
  https://github.com/birchill/10ten-ja-reader

  ---

  Originally based on Rikaikun
  by Erek Speed
  http://code.google.com/p/rikaikun/

  ---

  Originally based on Rikaichan 1.07
  by Jonathan Zarate
  http://www.polarcloud.com/

  ---

  Originally based on RikaiXUL 0.4 by Todd Rudick
  http://www.rikai.com/
  http://rikaixul.mozdev.org/

  ---

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.

  ---

  Please do not change or remove any of the copyrights or links to web pages
  when modifying any of the files. - Jon

*/

import '../../manifest.json.src';

import { AbortError } from '@birchill/jpdict-idb';
import Bugsnag from '@bugsnag/browser';
import * as s from 'superstruct';
import Browser, { browser } from 'webextension-polyfill-ts';

import { Config } from '../common/config';
import {
  DbListenerMessage,
  notifyDbStateUpdated,
} from '../common/db-listener-messages';
import { startBugsnag } from '../utils/bugsnag';
import { stripFields } from '../utils/strip-fields';
import { Split } from '../utils/type-helpers';

import TabManager from './all-tab-manager';
import { BackgroundRequestSchema, SearchRequest } from './background-request';
import { setDefaultToolbarIcon, updateBrowserAction } from './browser-action';
import { initContextMenus, updateContextMenus } from './context-menus';
import { FxFetcher } from './fx-fetcher';
import {
  cancelUpdateDb,
  deleteDb,
  initDb,
  searchWords as jpdictSearchWords,
  JpdictStateWithFallback,
  searchKanji,
  searchNames,
  translate,
  updateDb,
} from './jpdict';
import { shouldRequestPersistentStorage } from './quota-management';
import { SearchOtherResult, SearchWordsResult } from './search-result';

//
// Setup bugsnag
//

startBugsnag();

//
// Setup tab manager
//

const tabManager = new TabManager();
const fxFetcher = new FxFetcher();

tabManager.addListener(
  async ({
    enabled,
    tabId,
    anyEnabled,
  }: {
    enabled: boolean;
    tabId?: number | undefined;
    anyEnabled: boolean;
  }) => {
    // Typically we will run initJpDict from onStartup or onInstalled but if we
    // are in development mode and reloading the extension neither of those
    // callbacks will be called so make sure the database is initialized here.
    if (enabled) {
      Bugsnag.leaveBreadcrumb('Triggering database update from enableTab...');
      initJpDict().catch((e) => Bugsnag.notify(e));
    }

    try {
      await config.ready;
    } catch (e) {
      Bugsnag.notify(e || '(No error)');
      return;
    }

    // Update browser action with enabled state
    updateBrowserAction({
      enabled,
      jpdictState,
      tabId,
      toolbarIcon: config.toolbarIcon,
    });

    // Update context menus
    await updateContextMenus({
      tabEnabled: enabled,
      toggleMenuEnabled: config.contextMenuEnable,
      showPuck: config.contentConfig.showPuck === 'show',
    });

    // If we have enabled a tab, make sure we update our FX data.
    //
    // We don't do this unless a tab is enabled because some users may have the
    // add-on installed but never enabled and we shouldn't download FX data each
    // day in that case.
    if (anyEnabled) {
      await fxFetcher.scheduleNextUpdate();
    } else {
      await fxFetcher.cancelScheduledUpdate();
    }
  }
);

//
// Setup config
//

const config = new Config();

config.addChangeListener(async (changes) => {
  // Update toolbar icon as needed
  if (changes.hasOwnProperty('toolbarIcon')) {
    const toolbarIcon = changes.toolbarIcon.newValue as 'default' | 'sky';

    // Update all the different windows separately since they may have differing
    // enabled states.
    const enabledStates = await tabManager.getEnabledState();

    // If we are targetting individual tabs, however, first update the default
    // icon for all tabs.
    if (
      !enabledStates.length ||
      typeof enabledStates[0].tabId !== 'undefined'
    ) {
      setDefaultToolbarIcon(config.toolbarIcon);
    }

    for (const tabState of enabledStates) {
      updateBrowserAction({
        enabled: tabState.enabled,
        jpdictState,
        tabId: tabState.tabId,
        toolbarIcon,
      });
    }
  }

  // Update context menus as needed
  const toggleMenuEnabled: boolean | undefined =
    changes.contextMenuEnable?.newValue;
  const showPuck: 'show' | 'hide' | undefined =
    changes['computed:showPuck']?.newValue;
  if (
    typeof toggleMenuEnabled !== 'undefined' ||
    typeof showPuck !== 'undefined'
  ) {
    try {
      await updateContextMenus({
        toggleMenuEnabled:
          typeof toggleMenuEnabled === 'undefined'
            ? config.contextMenuEnable
            : toggleMenuEnabled,
        showPuck:
          typeof showPuck === 'undefined'
            ? config.contentConfig.showPuck === 'show'
            : showPuck === 'show',
      });
    } catch (e) {
      Bugsnag.notify(e);
    }
  }

  // Update dictionary language
  if (changes.hasOwnProperty('dictLang')) {
    const newLang = (changes as any).dictLang.newValue;
    Bugsnag.leaveBreadcrumb(`Changing language of database to ${newLang}.`);
    updateDb({ lang: newLang, force: true });
  }

  // Tell the content scripts about any changes
  await tabManager.updateConfig(config.contentConfig);
});

void config.ready.then(async () => {
  // If we have a non-default toolbar icon, set it for all tabs now so that
  // when we open a new tab, etc. it will be set correctly.
  if (config.toolbarIcon !== 'default') {
    setDefaultToolbarIcon(config.toolbarIcon);
  }

  // Initialize the tab manager first since we'll need its enabled state for
  // a number of other things.
  await tabManager.init(config.contentConfig);

  await initContextMenus({
    onToggleMenu: toggle,
    onTogglePuck: (enabled: boolean) => {
      config.showPuck = enabled ? 'show' : 'hide';
    },
    tabManager,
    toggleMenuEnabled: config.contextMenuEnable,
    showPuck: config.contentConfig.showPuck === 'show',
  });
});

//
// Jpdict database
//

let jpdictState: JpdictStateWithFallback = {
  words: {
    state: 'init',
    version: null,
    fallbackState: 'unloaded',
  },
  kanji: {
    state: 'init',
    version: null,
  },
  radicals: {
    state: 'init',
    version: null,
  },
  names: {
    state: 'init',
    version: null,
  },
  updateState: { type: 'idle', lastCheck: null },
};

// Don't run initJpDict more that we need to
let dbInitialized = false;

async function initJpDict() {
  if (dbInitialized) {
    return;
  }
  dbInitialized = true;
  await config.ready;
  await initDb({ lang: config.dictLang, onUpdate: onDbStatusUpdated });
}

async function onDbStatusUpdated(state: JpdictStateWithFallback) {
  jpdictState = state;

  // Update all the different windows separately since they may have differing
  // enabled states.
  const enabledStates = await tabManager.getEnabledState();
  for (const tabState of enabledStates) {
    updateBrowserAction({
      enabled: tabState.enabled,
      jpdictState: state,
      tabId: tabState.tabId,
      toolbarIcon: config.toolbarIcon,
    });
  }

  notifyDbListeners();
}

//
// Database listeners
//

const dbListeners: Array<Browser.Runtime.Port> = [];

function isDbListenerMessage(event: unknown): event is DbListenerMessage {
  return typeof event === 'object' && typeof (event as any).type === 'string';
}

browser.runtime.onConnect.addListener((port: Browser.Runtime.Port) => {
  if (port.name !== 'options') {
    return;
  }

  dbListeners.push(port);

  // Push initial state to new listener
  notifyDbListeners(port);

  port.onMessage.addListener(async (event: unknown) => {
    if (!isDbListenerMessage(event)) {
      return;
    }

    switch (event.type) {
      case 'updatedb':
        await config.ready;

        Bugsnag.leaveBreadcrumb('Manually triggering database update');
        updateDb({ lang: config.dictLang, force: true });
        break;

      case 'cancelupdatedb':
        Bugsnag.leaveBreadcrumb('Manually canceling database update');
        cancelUpdateDb();
        break;

      case 'deletedb':
        Bugsnag.leaveBreadcrumb('Manually deleting database');
        deleteDb();
        break;
    }
  });

  port.onDisconnect.addListener(() => {
    const index = dbListeners.indexOf(port);
    if (index !== -1) {
      dbListeners.splice(index, 1);
    }
  });
});

function notifyDbListeners(specifiedListener?: Browser.Runtime.Port) {
  if (!dbListeners.length) {
    return;
  }

  const message = notifyDbStateUpdated(jpdictState);

  for (const listener of dbListeners) {
    if (specifiedListener && listener !== specifiedListener) {
      continue;
    }

    try {
      listener.postMessage(message);
    } catch (e) {
      console.error('Error posting message', e);
      Bugsnag.notify(e || '(Error posting message update message)');
    }
  }
}

//
// Search
//

async function searchWords({
  input,
  includeRomaji,
  abortSignal,
}: SearchRequest & {
  abortSignal: AbortSignal;
}): Promise<SearchWordsResult | null> {
  const [words, dbStatus] = await jpdictSearchWords({
    abortSignal,
    input,
    includeRomaji,
  });

  return {
    words,
    dbStatus,
  };
}

async function searchOther({
  input,
  abortSignal,
}: SearchRequest & {
  abortSignal: AbortSignal;
}): Promise<SearchOtherResult | null> {
  // Kanji
  const kanjiResult = await searchKanji([...input][0]);
  const kanji = typeof kanjiResult === 'string' ? null : kanjiResult;

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // Names
  const nameResult = await searchNames({ abortSignal, input });
  const names = typeof nameResult === 'string' ? null : nameResult;

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  if (!kanji && !names) {
    return null;
  }

  return {
    kanji,
    names,
  };
}

//
// Browser event handlers
//

async function toggle(tab: Browser.Tabs.Tab) {
  await config.ready;
  await tabManager.toggleTab(tab, config.contentConfig);
}

browser.browserAction.onClicked.addListener(toggle);
browser.composeAction?.onClicked.addListener(toggle);

// We can sometimes find ourselves in a situation where we have a backlog of
// search requests. To avoid that, we simply cancel any previous request.
let pendingSearchWordsRequest:
  | { input: string; controller: AbortController }
  | undefined;
let pendingSearchOtherRequest:
  | { input: string; controller: AbortController }
  | undefined;

browser.runtime.onMessage.addListener(
  (
    request: unknown,
    sender: Browser.Runtime.MessageSender
  ): void | Promise<any> => {
    if (!s.is(request, BackgroundRequestSchema)) {
      console.warn(`Unrecognized request: ${JSON.stringify(request)}`);
      Bugsnag.notify(
        `Unrecognized request: ${JSON.stringify(request)}`,
        (event) => {
          event.severity = 'warning';
        }
      );
      return;
    }

    switch (request.type) {
      case 'options':
        return browser.runtime.openOptionsPage();

      case 'searchWords':
        if (pendingSearchWordsRequest) {
          pendingSearchWordsRequest.controller.abort();
          pendingSearchWordsRequest = undefined;
        }

        // Go ahead and stop any searches of other dictionaries too since they
        // are no longer relevant and will only make this search take longer.
        if (pendingSearchOtherRequest) {
          pendingSearchOtherRequest.controller.abort();
          pendingSearchOtherRequest = undefined;
        }

        pendingSearchWordsRequest = {
          input: request.input,
          controller: new AbortController(),
        };

        // Detect if this was likely a lookup that resulted in the mouse
        // onboarding being shown so we can set a hard limit on how many times
        // we show it.
        //
        // Specifically, if the user has done over a thousand lookups on this
        // device and _still_ hasn't dismissed the onboarding, they're probably
        // never going to (or have hit some snag where they _can't_).
        // In that case, we should dismiss it for them instead of continuing to
        // bother them.
        //
        // The following logic roughly mimicks the conditions used in the content
        // script to determine if we should show the onboarding but doesn't
        // account for whether or not the user is looking up using the puck or
        // touch. As a result, if the user is consistently using the puck/touch,
        // we may decide we no longer need to show the onboarding and, if the
        // user later decides to try using the mouse, they'll miss our beautiful
        // onboarding notice.
        //
        // That's probably ok, however, and saves us having to thread the "was
        // a mouse lookup?" state all the way from the content thread.
        if (
          config.popupInteractive &&
          !config.hasDismissedMouseOnboarding &&
          config.hasUpgradedFromPreMouse
        ) {
          config.incrementNumLookupsWithMouseOnboarding();

          if (config.numLookupsWithMouseOnboarding > 1000) {
            config.setHasDismissedMouseOnboarding();
          }
        }

        return (async () => {
          try {
            return await searchWords({
              ...request,
              abortSignal: pendingSearchWordsRequest.controller.signal,
            });
          } catch (e) {
            if (e.name === 'AbortError') {
              return 'aborted';
            }
            Bugsnag.notify(e);
            return null;
          } finally {
            if (pendingSearchWordsRequest?.input === request.input) {
              pendingSearchWordsRequest = undefined;
            }
          }
        })();

      case 'searchOther':
        if (pendingSearchOtherRequest) {
          pendingSearchOtherRequest.controller.abort();
          pendingSearchOtherRequest = undefined;
        }

        pendingSearchOtherRequest = {
          input: request.input,
          controller: new AbortController(),
        };

        return (async () => {
          try {
            return await searchOther({
              ...request,
              abortSignal: pendingSearchOtherRequest.controller.signal,
            });
          } catch (e) {
            if (e.name === 'AbortError') {
              return 'aborted';
            }
            Bugsnag.notify(e);
            return null;
          } finally {
            if (pendingSearchOtherRequest?.input === request.input) {
              pendingSearchOtherRequest = undefined;
            }
          }
        })();

      case 'translate':
        return translate({
          text: request.input,
          includeRomaji: request.includeRomaji,
        });

      case 'toggleDefinition':
        config.toggleReadingOnly();
        break;

      case 'disableMouseInteraction':
        config.popupInteractive = false;
        break;

      case 'dismissedMouseOnboarding':
        config.setHasDismissedMouseOnboarding();
        break;

      //
      // Forwarded messages
      //

      case 'frame:popupShown':
      case 'frame:highlightText':
      case 'frame:clearTextHighlight':
        {
          const [, type] = request.type.split(':') as Split<
            typeof request.type,
            ':'
          >;
          if (sender.tab?.id) {
            tabManager.sendMessageToFrame({
              tabId: sender.tab.id,
              message: { ...stripFields(request, ['frameId']), type },
              frameId: request.frameId,
            });
          }
        }
        break;

      case 'children:popupHidden':
      case 'children:popupShown':
        {
          if (!sender.tab?.id) {
            break;
          }

          const [, type] = request.type.split(':') as Split<
            typeof request.type,
            ':'
          >;
          const message = { ...request, type, frame: 'children' };
          browser.tabs.sendMessage(sender.tab.id, message).catch(() => {
            // Ignore, possibly a tab that has gone away.
          });
        }
        break;

      case 'top:lookup':
        {
          if (!sender.tab?.id || typeof sender.frameId !== 'number') {
            break;
          }

          const initialSrc = tabManager.getInitialFrameSrc({
            tabId: sender.tab.id,
            frameId: sender.frameId,
          });

          tabManager.sendMessageToTopFrame({
            tabId: sender.tab.id,
            message: {
              ...request,
              type: 'lookup',
              source: {
                frameId: sender.frameId,
                initialSrc,
                currentSrc: request.source.src,
                dimensions: request.source.dimensions,
              },
            },
          });
        }
        break;

      case 'top:isPopupShowing':
      case 'top:pinPopup':
      case 'top:unpinPopup':
      case 'top:commitPopup':
      case 'top:clearResult':
      case 'top:nextDictionary':
      case 'top:toggleDefinition':
      case 'top:movePopup':
      case 'top:enterCopyMode':
      case 'top:exitCopyMode':
      case 'top:nextCopyEntry':
      case 'top:copyCurrentEntry':
        {
          if (!sender.tab?.id) {
            break;
          }

          const [, type] = request.type.split(':') as Split<
            typeof request.type,
            ':'
          >;
          tabManager.sendMessageToTopFrame({
            tabId: sender.tab.id,
            message: { ...request, type },
          });
        }
        break;
    }
  }
);

browser.runtime.onInstalled.addListener(async (details) => {
  // Request persistent storage permission
  if (navigator.storage) {
    let persisted = await navigator.storage.persisted();
    if (!persisted && (await shouldRequestPersistentStorage())) {
      persisted = await navigator.storage.persist();
      if (persisted) {
        Bugsnag.leaveBreadcrumb('Got persistent storage permission');
      } else {
        Bugsnag.leaveBreadcrumb('Failed to get persistent storage permission');
      }
    }
  }

  Bugsnag.leaveBreadcrumb('Running initJpDict from onInstalled...');
  initJpDict().catch((e) => Bugsnag.notify(e));

  if (
    details.reason === 'update' &&
    details.previousVersion &&
    !details.temporary
  ) {
    Bugsnag.leaveBreadcrumb(
      `Updated from version ${details.previousVersion} to ${
        browser.runtime.getManifest().version
      }`
    );

    const [major, minor] = details.previousVersion.split('.').map(Number);
    if (major === 1 && minor < 12) {
      // Wait for config to load before trying to update it or else we'll
      // clobber the other local settings.
      void config.ready.then(() => {
        config.setHasUpgradedFromPreMouse();
      });
    }
  }

  // If we are still developing pre-1.12, act like we are upgrading so we can
  // test the onboarding banner.
  if (details.temporary && __VERSION__ === '1.11.0') {
    void config.ready.then(() => {
      config.setHasUpgradedFromPreMouse();
    });
  }
});

browser.runtime.onStartup.addListener(async () => {
  Bugsnag.leaveBreadcrumb('Running initJpDict from onStartup...');
  initJpDict().catch((e) => Bugsnag.notify(e));
});

// Mail extension steps

void (async () => {
  if (browser.messageDisplayScripts || browser.composeScripts) {
    try {
      await browser.messageDisplayScripts?.register({
        js: [{ file: '/10ten-ja-content.js' }],
      });
      await browser.composeScripts?.register({
        js: [{ file: '/10ten-ja-content.js' }],
      });
    } catch (e) {
      console.error('Failed to register message display or compose scripts', e);
      Bugsnag.notify(e);
    }
  }
})();
