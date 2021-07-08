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
import Browser, { browser } from 'webextension-polyfill-ts';

import TabManager from './all-tab-manager';
import { isBackgroundRequest, SearchRequest } from './background-request';
import { updateBrowserAction } from './browser-action';
import { startBugsnag } from './bugsnag';
import { Config } from './config';
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
  searchWords,
  translate,
} from './jpdict';
import { shouldRequestPersistentStorage } from './quota-management';
import {
  KanjiSearchResult,
  NameSearchResult,
  SearchResult,
} from './search-result';
import { stripFields } from './strip-fields';

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

  // Update browser action
  updateBrowserAction({ enabled, jpdictState, tabId });

  // Update context menu
  try {
    await config.ready;
  } catch (e) {
    Bugsnag.notify(e || '(No error)');
    return;
  }

  if (config.contextMenuEnable) {
    try {
      await browser.contextMenus.update('context-toggle', {
        checked: enabled,
      });
    } catch (_e) {
      // Ignore
    }
  }
});

//
// Setup config
//

const config = new Config();

config.addChangeListener((changes) => {
  // Add / remove context menu as needed
  if (changes.hasOwnProperty('contextMenuEnable')) {
    if ((changes as any).contextMenuEnable.newValue) {
      addContextMenu();
    } else {
      removeContextMenu();
    }
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
  // Initialize the tab manager first since we'll need its enabled state for
  // a number of other things.
  await tabManager.init(config.contentConfig);

  if (config.contextMenuEnable) {
    addContextMenu();
  }
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

      case 'reporterror':
        Bugsnag.notify(evt.message);
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
// Context menu
//

async function addContextMenu() {
  const contexts: Array<Browser.Menus.ContextType> = [
    'browser_action',
    'editable',
    'frame',
    'image',
    'link',
    'page',
    'selection',
    'video',
  ];

  // Safari throws if we try to include 'tab' in the set of contexts.
  // (Chrome just ignores it, despite not supporting it.)
  if (__SUPPORTS_TAB_CONTEXT_TYPE__) {
    contexts.push('tab');
  }

  // We need to know if the context menu should be initially checked or not.
  //
  // That's not necessarily straight forward, however, since different windows
  // can have different enabled states.
  //
  // So if we get multiple windows, we should try to find out which one is the
  // current window and use that.
  const enabledStates = await tabManager.getEnabledState();
  let enabled = false;
  if (enabledStates.length === 1) {
    enabled = enabledStates[0].enabled;
  } else if (enabledStates.length > 1) {
    try {
      const currentWindowTabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const match = currentWindowTabs.length
        ? enabledStates.find((s) => s.tabId === currentWindowTabs[0].id)
        : undefined;
      if (match) {
        enabled = match.enabled;
      }
    } catch (_e) {
      // Ignore
    }
  }

  try {
    // We'd like to use:
    //
    //   command: '_execute_browser_action'
    //
    // here instead of onclick but:
    //
    // a) Chrome etc. don't support that
    // b) Firefox passes the wrong tab ID to the callback when the command is
    //    activated from the context menu of a non-active tab.
    browser.contextMenus.create(
      {
        id: 'context-toggle',
        type: 'checkbox',
        title: browser.i18n.getMessage('menu_enable_extension'),
        onclick: (_info, tab) => toggle(tab),
        contexts,
        checked: enabled,
      },
      () => {
        // This is just to silence Safari which will complain if the menu already
        // exists.
        if (browser.runtime.lastError) {
          // Very interesting
        }
      }
    );
  } catch (_e) {
    // Give up. We're probably on a platform that doesn't support the
    // contextMenus API such as Firefox for Android.
  }
}

async function removeContextMenu() {
  try {
    await browser.contextMenus.remove('context-toggle');
  } catch (e) {
    // Ignore
  }
}

//
// Search
//

async function search({
  input,
  includeRomaji,
  abortSignal,
}: SearchRequest & { abortSignal: AbortSignal }): Promise<SearchResult | null> {
  // This is a bit funky because words can return a result AND a database status
  // (since we have a fallback database for the words database) but the kanji
  // and names databases return one or the other.
  //
  // Here we try and massage them into something simple with a single
  // database status so that the client doesn't need to worry about these
  // details so much.
  const wordsResult = await searchWords({ input, includeRomaji, abortSignal });
  const words = wordsResult ? stripFields(wordsResult, ['dbStatus']) : null;
  let dbStatus = wordsResult?.dbStatus;

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // Kanji
  const kanjiResult = await searchKanji([...input][0]);
  let kanji: KanjiSearchResult | null | undefined;
  if (typeof kanjiResult === 'string') {
    dbStatus = dbStatus || kanjiResult;
  } else {
    kanji = kanjiResult;
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // Names
  const nameResult = await searchNames({ input });
  let names: NameSearchResult | null | undefined;
  if (typeof nameResult === 'string') {
    dbStatus = dbStatus || nameResult;
  } else {
    names = nameResult;
  }

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  if (!words && !kanji && !names) {
    return null;
  }

  return { words, kanji, names, dbStatus };
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
let pendingSearchRequest: AbortController | undefined;

browser.runtime.onMessage.addListener(
  (request: object): void | Promise<any> => {
    if (!isBackgroundRequest(request)) {
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
      case 'search':
        if (pendingSearchRequest) {
          pendingSearchRequest.abort();
          pendingSearchRequest = undefined;
        }

        pendingSearchRequest = new AbortController();

        return search({ ...request, abortSignal: pendingSearchRequest.signal })
          .then((result) => {
            pendingSearchRequest = undefined;
            return result;
          })
          .catch((e) => {
            if (e.name !== 'AbortError') {
              Bugsnag.notify(e);
            }
            return null;
          });

      case 'translate':
        return translate({
          text: request.input,
          includeRomaji: request.includeRomaji,
        });

      case 'toggleDefinition':
        config.toggleReadingOnly();
        break;

      case 'reportWarning':
        console.assert(
          typeof request.message === 'string',
          '`message` should be a string'
        );
        Bugsnag.notify(request.message, (event) => {
          event.severity = 'warning';
        });
        break;
    }
  }
);

browser.runtime.onInstalled.addListener(async () => {
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
});

browser.runtime.onStartup.addListener(() => {
  Bugsnag.leaveBreadcrumb('Running initJpDict from onStartup...');
  initJpDict();
});
