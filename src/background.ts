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
import { FullSearchResult, InitialSearchResult } from './search-result';

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

  // Update context menu
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
  // If we have a non-default toolbar icon, set it for all tabs now so that
  // when we open a new tab, etc. it will be set correctly.
  if (config.toolbarIcon !== 'default') {
    setDefaultToolbarIcon(config.toolbarIcon);
  }

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
  requestId,
  abortSignal,
}: SearchRequest & { abortSignal: AbortSignal }): Promise<
  [InitialSearchResult | null, Promise<FullSearchResult | null> | undefined]
> {
  const [initialWordSearchResult, usedSnapshotReason] = await searchWords({
    input,
    includeRomaji,
    abortSignal,
  });

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // If the words database was not available for some reason, then don't bother
  // scheduling a full search.
  //
  // If it was 'unavailable' we're probably in always-on private browsing mode
  // or something of the sort and hence none of the data series will be
  // available.
  //
  // If it was 'updating' then we will refuse to look up any other data series
  // since Chrome seems to block when we try.
  let fullSearch: Promise<FullSearchResult | null> | undefined;
  if (
    usedSnapshotReason !== 'unavailable' &&
    usedSnapshotReason !== 'updating'
  ) {
    fullSearch = (async () => {
      const words = initialWordSearchResult;

      // Kanji
      const kanjiResult = await searchKanji([...input][0]);
      let kanji = typeof kanjiResult === 'string' ? undefined : kanjiResult;

      if (abortSignal.aborted) {
        throw new AbortError();
      }

      // Names
      const nameResult = await searchNames({ input });
      let names = typeof nameResult === 'string' ? undefined : nameResult;

      if (abortSignal.aborted) {
        throw new AbortError();
      }

      if (!words && !kanji && !names) {
        return null;
      }

      return {
        words,
        kanji,
        names,
        request: { input, includeRomaji, requestId },
        resultType: 'full' as const,
      };
    })();
  }

  let resultType: InitialSearchResult['resultType'] = 'initial';
  if (usedSnapshotReason === 'unavailable') {
    resultType = 'db-unavailable';
  } else if (usedSnapshotReason === 'updating') {
    resultType = 'db-updating';
  }

  // If our initial search turned up no results but we are running a full
  // search, then we should still return an InitialSearchResult object with an
  // appropriate 'resultType' so the caller prepare to handle the follow-up
  // result from the up full search.
  //
  // If we're NOT running a full search (e.g. because the database is not
  // available) then we can just return null so the caller knows to give up on
  // this query.
  const initialResult =
    fullSearch || initialWordSearchResult
      ? { words: initialWordSearchResult, resultType }
      : null;

  return [initialResult, fullSearch];
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
        if (pendingSearchRequest) {
          pendingSearchRequest.abort();
          pendingSearchRequest = undefined;
        }

        pendingSearchRequest = new AbortController();

        try {
          const [result, fullResult] = await search({
            ...request,
            abortSignal: pendingSearchRequest.signal,
          });

          if (fullResult && sender.tab?.id) {
            const tabId = sender.tab.id;
            fullResult
              .then((result) => {
                browser.tabs.sendMessage(
                  tabId,
                  {
                    type: 'updateSearchResult',
                    result,
                  },
                  { frameId: sender.frameId }
                );
              })
              .catch((e) => {
                if (e.name !== 'AbortError') {
                  Bugsnag.notify(e);
                }

                browser.tabs.sendMessage(
                  tabId,
                  {
                    type: 'updateSearchResult',
                    result: null,
                  },
                  { frameId: sender.frameId }
                );
              })
              .finally(() => {
                pendingSearchRequest = undefined;
              });
          } else {
            pendingSearchRequest = undefined;
          }

          return result;
        } catch (e) {
          if (e.name !== 'AbortError') {
            Bugsnag.notify(e);
          }
          pendingSearchRequest = undefined;
          return null;
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
