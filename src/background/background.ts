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

import Bugsnag from '@bugsnag/browser';
import { AbortError, DataSeriesState } from '@birchill/hikibiki-data';
import * as s from 'superstruct';
import Browser, { browser } from 'webextension-polyfill-ts';

import { Config } from '../common/config';
import {
  notifyDbStateUpdated,
  DbListenerMessage,
} from '../common/db-listener-messages';
import { startBugsnag } from '../utils/bugsnag';
import { stripFields } from '../utils/strip-fields';
import { Split } from '../utils/type-helpers';
import { isSafari } from '../utils/ua-utils';

import TabManager from './all-tab-manager';
import { ChildFramesMessage } from './background-message';
import { BackgroundRequestSchema, SearchRequest } from './background-request';
import { setDefaultToolbarIcon, updateBrowserAction } from './browser-action';
import { initContextMenus, updateContextMenus } from './context-menus';
import { FxFetcher } from './fx-fetcher';
import {
  JpdictStateWithFallback,
  cancelUpdateDb,
  deleteDb,
  initDb,
  updateDb,
  searchKanji,
  searchNames,
  searchWords as jpdictSearchWords,
  translate,
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
      initJpDict();
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
      fxFetcher.scheduleNextUpdate();
    } else {
      fxFetcher.cancelScheduledUpdate();
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
  let toggleMenuEnabled: boolean | undefined =
    changes.contextMenuEnable?.newValue;
  let showPuck: 'show' | 'hide' | undefined =
    changes['computed:showPuck']?.newValue;
  if (
    typeof toggleMenuEnabled !== 'undefined' ||
    typeof showPuck !== 'undefined'
  ) {
    updateContextMenus({
      toggleMenuEnabled:
        typeof toggleMenuEnabled === 'undefined'
          ? config.contextMenuEnable
          : toggleMenuEnabled,
      showPuck:
        typeof showPuck === 'undefined'
          ? config.contentConfig.showPuck === 'show'
          : showPuck === 'show',
    });
  }

  // Update dictionary language
  if (changes.hasOwnProperty('dictLang')) {
    const newLang = (changes as any).dictLang.newValue;
    Bugsnag.leaveBreadcrumb(`Changing language of database to ${newLang}.`);
    updateDb({ lang: newLang, force: true });
  }

  // Tell the content scripts about any changes
  tabManager.updateConfig(config.contentConfig);
});

config.ready.then(async () => {
  // If we have a non-default toolbar icon, set it for all tabs now so that
  // when we open a new tab, etc. it will be set correctly.
  if (config.toolbarIcon !== 'default') {
    setDefaultToolbarIcon(config.toolbarIcon);
  }

  // Initialize the tab manager first since we'll need its enabled state for
  // a number of other things.
  await tabManager.init(config.contentConfig);

  initContextMenus({
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
    state: DataSeriesState.Initializing,
    version: null,
    fallbackState: 'unloaded',
  },
  kanji: {
    state: DataSeriesState.Initializing,
    version: null,
  },
  radicals: {
    state: DataSeriesState.Initializing,
    version: null,
  },
  names: {
    state: DataSeriesState.Initializing,
    version: null,
  },
  updateState: { state: 'idle', lastCheck: null },
};

// Don't run initJpDict more that we need to
let dbInitialized = false;

async function initJpDict() {
  if (dbInitialized) {
    return;
  }
  dbInitialized = true;
  await config.ready;
  initDb({ lang: config.dictLang, onUpdate: onDbStatusUpdated });
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

function isDbListenerMessage(evt: unknown): evt is DbListenerMessage {
  return typeof evt === 'object' && typeof (evt as any).type === 'string';
}

browser.runtime.onConnect.addListener((port: Browser.Runtime.Port) => {
  if (port.name !== 'options') {
    return;
  }

  dbListeners.push(port);

  // Push initial state to new listener
  notifyDbListeners(port);

  port.onMessage.addListener(async (evt: unknown) => {
    if (!isDbListenerMessage(evt)) {
      return;
    }

    switch (evt.type) {
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

async function notifyDbListeners(specifiedListener?: Browser.Runtime.Port) {
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
  let kanji = typeof kanjiResult === 'string' ? null : kanjiResult;

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // Names
  const nameResult = await searchNames({ abortSignal, input });
  let names = typeof nameResult === 'string' ? null : nameResult;

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
  tabManager.toggleTab(tab, config.contentConfig);
}

browser.browserAction.onClicked.addListener(toggle);

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
      case 'forceGdocsHtmlMode':
        return (async () => {
          // Check if we are configured to force GDocs to HTML mode
          await config.ready;
          return config.forceGdocsHtmlMode;
        })();

      case 'options':
        return browser.runtime.openOptionsPage();

      case 'search':
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

        return (async () => {
          try {
            return await searchWords({
              ...request,
              abortSignal: pendingSearchWordsRequest.controller.signal,
            });
          } catch (e) {
            if (e.name === 'AbortError') {
              // Legacy content scripts (which use the request type 'search')
              // won't recognize the 'aborted' result value and expect null in
              // that case.
              return request.type === 'search' ? null : 'aborted';
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

      case 'switchedDictionary':
        config.setHasSwitchedDictionary();
        break;

      case 'translate':
        return translate({
          text: request.input,
          includeRomaji: request.includeRomaji,
        });

      case 'toggleDefinition':
        config.toggleReadingOnly();
        break;

      //
      // Forwarded messages
      //

      case 'frame:popupShown':
      case 'frame:highlightText':
      case 'frame:clearTextHighlight':
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
          const message: ChildFramesMessage = {
            type,
            frame: 'children',
          };
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
  initJpDict();

  if (details.reason === 'update' && details.previousVersion) {
    Bugsnag.leaveBreadcrumb(
      `Updated from version ${details.previousVersion} to ${
        browser.runtime.getManifest().version
      }`
    );

    // Safari doesn't appear to support displaying extension pages
    if (details.temporary || isSafari()) {
      return;
    }

    // Show update page when updating from Rikaichamp
    try {
      if (details.previousVersion.startsWith('0')) {
        const url = browser.runtime.getURL('docs/from-pre-1.0.html');
        await browser.tabs.create({ url });
      } else {
        const [major, minor] = details.previousVersion.split('.').map(Number);
        if (major === 1 && minor < 4) {
          const url = browser.runtime.getURL('docs/from-pre-1.4.html');
          await browser.tabs.create({ url });
        }
      }
    } catch (e) {
      Bugsnag.leaveBreadcrumb('Failed to show update page', { error: e });
    }
  }
});

browser.runtime.onStartup.addListener(() => {
  Bugsnag.leaveBreadcrumb('Running initJpDict from onStartup...');
  initJpDict();
});
