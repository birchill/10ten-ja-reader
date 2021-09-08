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

import '../manifest.json.src';

import Bugsnag from '@bugsnag/browser';
import { AbortError, DataSeriesState } from '@birchill/hikibiki-data';
import * as s from 'superstruct';
import Browser, { browser } from 'webextension-polyfill-ts';

import TabManager from './all-tab-manager';
import { BackgroundRequestSchema, SearchRequest } from './background-request';
import { setDefaultToolbarIcon, updateBrowserAction } from './browser-action';
import { startBugsnag } from './bugsnag';
import { Config } from './config';
import { initContextMenus, updateContextMenus } from './context-menus';
import {
  notifyDbStateUpdated,
  DbListenerMessage,
} from './db-listener-messages';
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

tabManager.addListener(async (enabled: boolean, tabId: number | undefined) => {
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
});

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
  async (
    request: unknown,
    sender: Browser.Runtime.MessageSender
  ): Promise<any> => {
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

      case 'searchOther':
        if (pendingSearchOtherRequest) {
          pendingSearchOtherRequest.controller.abort();
          pendingSearchOtherRequest = undefined;
        }

        pendingSearchOtherRequest = {
          input: request.input,
          controller: new AbortController(),
        };

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

      // Forwarded messages
      case 'frame:highlightText':
        if (sender.tab?.id) {
          browser.tabs.sendMessage(
            sender.tab?.id,
            { type: 'highlightText', length: request.length },
            { frameId: request.frameId }
          );
        }
        break;

      case 'frame:clearTextHighlight':
        if (sender.tab?.id) {
          browser.tabs.sendMessage(
            sender.tab?.id,
            { type: 'clearTextHighlight' },
            { frameId: request.frameId }
          );
        }
        break;

      case 'top:lookup':
        {
          if (!sender.tab?.id || typeof sender.frameId !== 'number') {
            break;
          }

          const topFrame = tabManager.getTopFrame({
            tabId: sender.tab?.id,
            frameId: sender.frameId,
            ...request.source,
          });
          if (!topFrame) {
            break;
          }

          const { frameId, source } = topFrame;
          browser.tabs.sendMessage(
            sender.tab?.id,
            { ...request, type: 'lookup', ...source },
            { frameId }
          );
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

    // Show update page when updating from Rikaichamp
    if (details.previousVersion.startsWith('0') && !details.temporary) {
      const url = browser.runtime.getURL('docs/from-0.x.html');
      await browser.tabs.create({ url });
    }
  }
});

browser.runtime.onStartup.addListener(() => {
  Bugsnag.leaveBreadcrumb('Running initJpDict from onStartup...');
  initJpDict();
});
