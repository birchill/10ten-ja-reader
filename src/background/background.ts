/// <reference path="../common/constants.d.ts" />
/// <reference path="./mail-extensions.d.ts" />
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
import Bugsnag from '@birchill/bugsnag-zero';
import { AbortError, allDataSeries } from '@birchill/jpdict-idb';
import * as s from 'superstruct';
import browser, { Runtime, Tabs } from 'webextension-polyfill';

import '../../manifest.json.src';

import { Config } from '../common/config';
import {
  DbListenerMessage,
  notifyDbStateUpdated,
} from '../common/db-listener-messages';
import { startBugsnag } from '../utils/bugsnag';
import { stripFields } from '../utils/strip-fields';
import { Split } from '../utils/type-helpers';

import TabManager from './all-tab-manager';
import {
  BackgroundRequestSchema,
  SearchOtherRequest,
  SearchRequest,
} from './background-request';
import { setDefaultToolbarIcon, updateBrowserAction } from './browser-action';
import { calculateEraDateTimeSpan } from './calculate-date';
import { registerMenuListeners, updateContextMenus } from './context-menus';
import { FxFetcher } from './fx-fetcher';
import { isCurrentTabEnabled } from './is-current-tab-enabled';
import {
  JpdictStateWithFallback,
  cancelUpdateDb,
  deleteDb,
  initDb,
  searchWords as jpdictSearchWords,
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
    try {
      await config.ready;
    } catch (e) {
      void Bugsnag.notify(e || '(No error)');
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
      showPuck: config.computedShowPuck === 'show',
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
  let showPuck: 'show' | 'hide' | undefined;
  if (
    changes.hasOwnProperty('showPuck') ||
    changes.hasOwnProperty('canHover')
  ) {
    showPuck = config.computedShowPuck;
  }

  if (
    typeof toggleMenuEnabled !== 'undefined' ||
    typeof showPuck !== 'undefined'
  ) {
    try {
      const tabEnabled = await isCurrentTabEnabled(tabManager);
      await updateContextMenus({
        tabEnabled,
        toggleMenuEnabled:
          typeof toggleMenuEnabled === 'undefined'
            ? config.contextMenuEnable
            : toggleMenuEnabled,
        showPuck:
          (typeof showPuck === 'undefined'
            ? config.computedShowPuck
            : showPuck) === 'show',
      });
    } catch (e) {
      void Bugsnag.notify(e);
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

  const tabEnabled = await isCurrentTabEnabled(tabManager);

  await updateContextMenus({
    tabEnabled,
    toggleMenuEnabled: config.contextMenuEnable,
    showPuck: config.computedShowPuck === 'show',
  });
});

//
// Jpdict database
//

let jpdictState: JpdictStateWithFallback = {
  words: { state: 'init', version: null, fallbackState: 'unloaded' },
  kanji: { state: 'init', version: null },
  radicals: { state: 'init', version: null },
  names: { state: 'init', version: null },
  updateState: { type: 'idle', lastCheck: null },
};

let dbInitialized = false;

const dbReady = (async () => {
  if (dbInitialized) {
    return true;
  }

  Bugsnag.leaveBreadcrumb('Initializing dictionary...');

  await config.ready;
  await initDb({ lang: config.dictLang, onUpdate: onDbStatusUpdated });

  dbInitialized = true;

  return true;
})().catch((e) => {
  console.error('Error initializing dictionary', e);
  void Bugsnag.notify(e);

  return false;
});

async function onDbStatusUpdated(state: JpdictStateWithFallback) {
  const dbWasUnavailable =
    jpdictState.words.state === 'empty' ||
    jpdictState.words.state === 'unavailable';
  const dbWasUpdating = jpdictState.updateState.type === 'updating';

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

  const dbIsAvailable = jpdictState.words.state === 'ok';
  const dbIsUpdating = jpdictState.updateState.type === 'updating';
  if ((dbWasUnavailable || dbWasUpdating) && dbIsAvailable && !dbIsUpdating) {
    await tabManager.notifyDbUpdated();
  }
}

function isDbUpdating() {
  if (!dbInitialized) {
    return true;
  }

  for (const series of allDataSeries) {
    if (jpdictState[series].state === 'init') {
      return true;
    }
  }

  return jpdictState.updateState.type !== 'idle';
}

//
// Database listeners
//

const dbListeners: Array<Runtime.Port> = [];

function isDbListenerMessage(event: unknown): event is DbListenerMessage {
  return typeof event === 'object' && typeof (event as any).type === 'string';
}

browser.runtime.onConnect.addListener((port: Runtime.Port) => {
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

function notifyDbListeners(specifiedListener?: Runtime.Port) {
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
      void Bugsnag.notify(e || '(Error posting message update message)');
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
  await dbReady;

  const [words, dbStatus] = await jpdictSearchWords({
    abortSignal,
    input,
    includeRomaji,
  });

  return { words, dbStatus };
}

async function searchOther({
  input,
  wordsMatchLen,
  abortSignal,
}: SearchOtherRequest & {
  abortSignal: AbortSignal;
}): Promise<SearchOtherResult | null> {
  await dbReady;

  // Names
  const nameResult = await searchNames({ abortSignal, input });
  const names = typeof nameResult === 'string' ? null : nameResult;

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  // Kanji
  const longestMatch = Math.max(wordsMatchLen, names?.matchLen ?? 0);
  const kanjiResult = await searchKanji(input.slice(0, longestMatch || 1));
  const kanji = typeof kanjiResult === 'string' ? null : kanjiResult;

  if (abortSignal.aborted) {
    throw new AbortError();
  }

  if (!kanji && !names) {
    return null;
  }

  return { kanji, names };
}

//
// Browser event handlers
//

async function toggle(tab?: Tabs.Tab) {
  await config.ready;
  await tabManager.toggleTab(tab, config.contentConfig);
}

if (__MV3__) {
  browser.action.onClicked.addListener(toggle);
} else {
  browser.browserAction.onClicked.addListener(toggle);
}
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
    sender: Runtime.MessageSender
  ): undefined | Promise<any> => {
    if (!s.is(request, BackgroundRequestSchema)) {
      // We can sometimes get requests here from other extensions?
      //
      // We've observed requests such as the following:
      //
      //   {"type":"cs-frame-forget"}
      //   {"action":"requestBackendReadySignal"}
      //   {"type":"cs-frame-connect","data":{"isDark":true}}
      //
      // Curiously in all cases the user agent was not identified so I'm not
      // sure if this can happen in all browsers or not.
      console.warn(`Unrecognized request: ${JSON.stringify(request)}`);
      return undefined;
    }

    switch (request.type) {
      case 'options':
        return browser.runtime.openOptionsPage();

      case 'searchWords':
        Bugsnag.leaveBreadcrumb('Searching for words', {
          ...request,
          input: 'x'.repeat(request.input.length),
        });
        if (pendingSearchWordsRequest) {
          Bugsnag.leaveBreadcrumb('Canceling previous search');
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
              return 'aborted';
            }
            void Bugsnag.notify(e);
            return null;
          } finally {
            if (pendingSearchWordsRequest?.input === request.input) {
              pendingSearchWordsRequest = undefined;
            }
          }
        })();

      case 'searchOther':
        Bugsnag.leaveBreadcrumb('Searching for non-words', {
          ...request,
          input: 'x'.repeat(request.input.length),
        });
        if (pendingSearchOtherRequest) {
          Bugsnag.leaveBreadcrumb('Canceling previous search');
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
            void Bugsnag.notify(e);
            return null;
          } finally {
            if (pendingSearchOtherRequest?.input === request.input) {
              pendingSearchOtherRequest = undefined;
            }
          }
        })();

      case 'calculateEraDateTimeSpan':
        Bugsnag.leaveBreadcrumb('Calculating era date time span', request);
        return Promise.resolve(calculateEraDateTimeSpan(request));

      case 'translate':
        Bugsnag.leaveBreadcrumb('Translating string', {
          ...request,
          input: 'x'.repeat(request.input.length),
        });
        return dbReady
          .then(() =>
            translate({
              text: request.input,
              includeRomaji: request.includeRomaji,
            })
          )
          .catch((e) => {
            if (e.name === 'AbortError') {
              return 'aborted';
            }
            void Bugsnag.notify(e);
            return null;
          });

      case 'toggleDefinition':
        Bugsnag.leaveBreadcrumb('Toggling definitions on/off');
        void config.ready.then(() => {
          config.toggleReadingOnly();
        });
        break;

      case 'disableMouseInteraction':
        Bugsnag.leaveBreadcrumb('Disabling mouse interaction');
        void config.ready.then(() => {
          config.popupInteractive = false;
        });
        break;

      case 'canHoverChanged':
        Bugsnag.leaveBreadcrumb('Changing hover ability setting', request);
        void config.ready.then(() => {
          config.canHover = request.value;
        });
        break;

      case 'puckStateChanged':
        void config.ready.then(() => {
          config.puckState = request.value;
        });
        break;

      case 'isDbUpdating':
        return Promise.resolve(isDbUpdating());

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
      case 'top:expandPopup':
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

    return undefined;
  }
);

browser.runtime.onInstalled.addListener(async (details) => {
  // Request persistent storage permission
  if (navigator.storage) {
    let persisted = await navigator.storage.persisted();
    if (
      !persisted &&
      // navigator.storage.persist is not available in ServiceWorker contexts
      'persist' in navigator.storage &&
      (await shouldRequestPersistentStorage())
    ) {
      persisted = await navigator.storage.persist();
      if (persisted) {
        Bugsnag.leaveBreadcrumb('Got persistent storage permission');
      } else {
        Bugsnag.leaveBreadcrumb('Failed to get persistent storage permission');
      }
    }
  }

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
  }
});

browser.runtime.onPerformanceWarning?.addListener(async (details) => {
  // We'd really like to know which site this is happening on so we can debug
  // and try to fix it.
  //
  // It's hard to be sure what is an acceptable amount of information to send,
  // however.
  //
  // We'd like to report the full URL but even after stripping query strings,
  // there's still the possibility of leaking private information such as with
  // capability URLs.
  //
  // The hostname is probably safe but ideally we'd add an opt-out before
  // sending that.
  //
  // Example code for fetching the hostname:
  //
  // let host: string | undefined;
  // if (typeof details.tabId === 'number' && details.tabId) {
  //   try {
  //     const rawUrl = (await browser.tabs.get(details.tabId)).url;
  //     if (rawUrl) {
  //       const urlObj = new URL(rawUrl);
  //       host = urlObj.hostname;
  //     }
  //   } catch {
  //     /* Ignore */
  //   }
  // }
  //
  // For now we'll just see if we get these reports at all and decide if we need
  // more information to fix them.
  void Bugsnag.notify(
    { name: 'PerformanceWarning', message: details.description },
    { metadata: { 'Performance warning': details } }
  );
});

registerMenuListeners({
  onToggleMenu: toggle,
  onTogglePuck: (enabled: boolean) => {
    config.showPuck = enabled ? 'show' : 'hide';
  },
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
      void Bugsnag.notify(e);
    }
  }
})();
