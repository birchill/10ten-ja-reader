/*

  Rikaichamp
  by Brian Birtles
  https://github.com/birtles/rikaichamp

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

  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 2 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

  ---

  Please do not change or remove any of the copyrights or links to web pages
  when modifying any of the files. - Jon

*/

import '../manifest.json.src';
import '../html/background.html.src';

import bugsnag from '@bugsnag/js';
import { DatabaseState, KanjiDatabase } from '@birchill/hikibiki-sync';

import { updateBrowserAction, FlatFileDictState } from './browser-action';
import { Config } from './config';
import { Dictionary } from './data';

//
// Minimum amount of time to wait before checking for database updates.
//

const UPDATE_THRESHOLD_MS = 12 * 60 * 60 * 1000;

//
// Setup bugsnag
//

const bugsnagClient = bugsnag({
  apiKey: 'e707c9ae84265d122b019103641e6462',
  autoBreadcrumbs: false,
  autoCaptureSessions: false,
  collectUserIp: false,
  consoleBreadcrumbsEnabled: true,
  logger: null,
});

browser.management.getSelf().then(info => {
  // bugsnag-ts typings don't seem to help here
  (bugsnagClient.app as any).version = info.version;
});

export class RikaiBackground {
  private config: Config;
  private kanjiDb: KanjiDatabase;

  private flatFileDict?: Dictionary;
  // TODO: This is temporary until we move the other databases to IDB
  private flatFileDictState: FlatFileDictState = FlatFileDictState.Ok;

  private dictCount: number = 3;
  private enabled: boolean = false;
  private menuId: number | string | null = null;

  private kanjiDictIndex: number = 1;
  private nameDictIndex: number = 2;
  private showMode: number = 0;

  constructor() {
    this.config = new Config();
    this.kanjiDb = new KanjiDatabase();

    this.kanjiDb.onChange = () => {
      updateBrowserAction({
        popupStyle: this.config.popupStyle,
        enabled: this.enabled,
        flatFileDictState: this.flatFileDictState,
        kanjiDb: this.kanjiDb,
      });
    };

    this.config.addChangeListener(changes => {
      if (changes.hasOwnProperty('contextMenuEnable')) {
        if ((changes as any).contextMenuEnable.newValue) {
          this.addContextMenu();
        } else {
          this.removeContextMenu();
        }
      }

      if (this.enabled && changes.hasOwnProperty('popupStyle')) {
        const popupStyle = (changes as any).popupStyle.newValue;
        updateBrowserAction({
          popupStyle,
          enabled: true,
          flatFileDictState: this.flatFileDictState,
          kanjiDb: this.kanjiDb,
        });
      }

      if (
        changes.hasOwnProperty('toggleKey') &&
        typeof (browser.commands as any).update === 'function'
      ) {
        try {
          (browser.commands as any).update({
            name: '_execute_browser_action',
            shortcut: (changes as any).toggleKey.newValue,
          });
        } catch (e) {
          const message = `Failed to update toggle key to ${
            (changes as any).toggleKey.newValue
          }`;
          console.error(message);
          bugsnagClient.notify(message, { severity: 'warning' });
        }
      }

      // TODO: Ignore changes that aren't part of contentConfig
      this.updateConfig(this.config.contentConfig);
    });

    browser.tabs.onActivated.addListener(activeInfo => {
      this.onTabSelect(activeInfo.tabId);
    });

    browser.browserAction.onClicked.addListener(tab => {
      this.toggle(tab);
    });

    browser.runtime.onMessage.addListener(
      (
        request: any,
        sender: browser.runtime.MessageSender
      ): void | Promise<any> => {
        if (typeof request.type !== 'string') {
          return;
        }

        switch (request.type) {
          case 'enable?':
            if (sender.tab && typeof sender.tab.id === 'number') {
              this.onTabSelect(sender.tab.id);
            } else {
              console.error('No sender tab in enable? request');
              bugsnagClient.leaveBreadcrumb('No sender tab in enable? request');
            }
            break;

          case 'xsearch':
            if (
              typeof request.text === 'string' &&
              typeof request.dictOption === 'number'
            ) {
              return this.search(
                request.text as string,
                request.dictOption as DictMode
              );
            }
            console.error(
              `Unrecognized xsearch request: ${JSON.stringify(request)}`
            );
            bugsnagClient.notify(
              `Unrecognized xsearch request: ${JSON.stringify(request)}`,
              {
                severity: 'warning',
              }
            );
            break;

          case 'translate':
            if (this.flatFileDict) {
              return this.flatFileDict.translate({
                text: request.title,
                includeRomaji: this.config.showRomaji,
              });
            }
            console.error('Dictionary not initialized in translate request');
            bugsnagClient.notify(
              'Dictionary not initialized in translate request',
              {
                severity: 'warning',
              }
            );
            break;

          case 'toggleDefinition':
            this.config.toggleReadingOnly();
            break;

          case 'reportWarning':
            console.assert(
              typeof request.message === 'string',
              '`message` should be a string'
            );
            bugsnagClient.notify(request.message, { severity: 'warning' });
            break;
        }
      }
    );

    this.config.ready.then(() => {
      if (this.config.contextMenuEnable) {
        this.addContextMenu();
      }

      // I'm not sure if this can actually happen, but just in case, update the
      // toggleKey command if it differs from what is currently set.
      if (typeof (browser.commands as any).update === 'function') {
        const getToggleCommand = async (): Promise<browser.commands.Command | null> => {
          const commands = await browser.commands.getAll();
          for (const command of commands) {
            if (command.name === '_execute_browser_action') {
              return command;
            }
          }
          return null;
        };

        getToggleCommand().then((command: browser.commands.Command | null) => {
          if (command && command.shortcut !== this.config.toggleKey) {
            try {
              (browser.commands as any).update({
                name: '_execute_browser_action',
                shortcut: this.config.toggleKey,
              });
            } catch (e) {
              const message = `On startup, failed to update toggle key to ${this.config.toggleKey}`;
              console.error(message);
              bugsnagClient.notify(message, { severity: 'warning' });
            }
          }
        });
      }
    });

    // See if we were enabled on the last run
    browser.storage.local
      .get('enabled')
      .then(getResult => {
        return getResult &&
          getResult.hasOwnProperty('enabled') &&
          getResult.enabled
          ? browser.tabs.query({ currentWindow: true, active: true })
          : [];
      })
      .then(tabs => {
        if (tabs && tabs.length) {
          bugsnagClient.leaveBreadcrumb(
            'Loading because we were enabled on the previous run'
          );
          this.enableTab(tabs[0]);
        }
      })
      .catch(err => {
        // Ignore
      });
  }

  async loadDictionary(): Promise<void> {
    if (!this.flatFileDict) {
      this.flatFileDict = new Dictionary({ bugsnag: bugsnagClient });
    }

    try {
      this.flatFileDictState = FlatFileDictState.Loading;
      await this.flatFileDict.loaded;
    } catch (e) {
      this.flatFileDictState = FlatFileDictState.Error;
      // If we fail loading the dictionary, make sure to reset it so we can try
      // again!
      this.flatFileDict = undefined;
      throw e;
    }
    this.flatFileDictState = FlatFileDictState.Ok;

    bugsnagClient.leaveBreadcrumb('Loaded dictionary successfully');
  }

  async maybeDownloadData() {
    await this.kanjiDb.ready;

    // Even if the database is not empty, check if it needs an update.
    if (this.kanjiDb.state === DatabaseState.Ok) {
      let lastUpdateKanjiDb: number | null = null;
      try {
        const getResult = await browser.storage.local.get('lastUpdateKanjiDb');
        lastUpdateKanjiDb =
          typeof getResult.lastUpdateKanjiDb === 'number'
            ? getResult.lastUpdateKanjiDb
            : null;
      } catch (e) {
        // Ignore
      }
      bugsnagClient.leaveBreadcrumb(
        `Got last update time of ${lastUpdateKanjiDb}`
      );

      // If we updated within the minimum window then we're done.
      if (
        lastUpdateKanjiDb &&
        Date.now() - lastUpdateKanjiDb < UPDATE_THRESHOLD_MS
      ) {
        bugsnagClient.leaveBreadcrumb('Downloaded data is up-to-date');
        return;
      }
    }

    try {
      await this.kanjiDb.update();
      await browser.storage.local.set({
        lastUpdateKanjiDb: new Date().getTime(),
      });
      bugsnagClient.leaveBreadcrumb('Successfully updated kanji database');
    } catch (e) {
      bugsnagClient.notify(e || '(Error updating kanji database)', {
        severity: 'error',
      });
      console.log(e);
    }
  }

  onTabSelect(tabId: number) {
    if (!this.enabled) {
      return;
    }

    this.config.ready.then(() => {
      browser.tabs
        .sendMessage(tabId, {
          type: 'enable',
          config: this.config.contentConfig,
        })
        .catch(() => {
          /* Some tabs don't have the content script so just ignore
           * connection failures here. */
        });
    });
  }

  async enableTab(tab: browser.tabs.Tab) {
    console.assert(typeof tab.id === 'number', `Unexpected tab ID: ${tab.id}`);

    updateBrowserAction({
      popupStyle: this.config.popupStyle,
      enabled: true,
      flatFileDictState: FlatFileDictState.Loading,
      kanjiDb: this.kanjiDb,
    });

    if (this.menuId) {
      browser.contextMenus.update(this.menuId, { checked: true });
    }

    try {
      await Promise.all([this.loadDictionary(), this.config.ready]);

      // Trigger download but don't wait on it. We don't block on this because
      // we currently only download the kanji data and we don't need it to be
      // downloaded before we can do something useful.
      this.maybeDownloadData();

      // Send message to current tab to add listeners and create stuff
      browser.tabs
        .sendMessage(tab.id!, {
          type: 'enable',
          config: this.config.contentConfig,
        })
        .catch(() => {
          /* Some tabs don't have the content script so just ignore
           * connection failures here. */
        });
      this.enabled = true;
      browser.storage.local.set({ enabled: true });

      updateBrowserAction({
        popupStyle: this.config.popupStyle,
        enabled: true,
        flatFileDictState: this.flatFileDictState,
        kanjiDb: this.kanjiDb,
      });
    } catch (e) {
      bugsnagClient.notify(e || '(No error)', { severity: 'error' });

      updateBrowserAction({
        popupStyle: this.config.popupStyle,
        enabled: true,
        flatFileDictState: this.flatFileDictState,
        kanjiDb: this.kanjiDb,
      });

      // Reset internal state so we can try again
      this.flatFileDict = undefined;

      if (this.menuId) {
        browser.contextMenus.update(this.menuId, { checked: false });
      }
    }
  }

  updateConfig(config: ContentConfig) {
    if (!this.enabled) {
      return;
    }

    browser.windows
      .getAll({ populate: true, windowTypes: ['normal'] })
      .then(windows => {
        for (const win of windows) {
          console.assert(typeof win.tabs !== 'undefined');
          for (const tab of win.tabs!) {
            console.assert(
              typeof tab.id === 'number',
              `Unexpected tab id: ${tab.id}`
            );
            browser.tabs
              .sendMessage(tab.id!, { type: 'enable', config })
              .catch(() => {
                /* Some tabs don't have the content script so just ignore
                 * connection failures here. */
              });
          }
        }
      });
  }

  disableAll() {
    this.enabled = false;

    browser.storage.local.remove('enabled').catch(() => {
      /* Ignore */
    });

    browser.browserAction.setTitle({
      title: browser.i18n.getMessage('command_toggle_disabled'),
    });

    browser.browserAction
      .setIcon({
        path: `images/rikaichamp-disabled.svg`,
      })
      .catch(() => {
        // Assume we're on Chrome and it still can't handle SVGs
        browser.browserAction.setIcon({
          path: {
            16: `images/rikaichamp-disabled-16.png`,
            32: `images/rikaichamp-disabled-32.png`,
            48: `images/rikaichamp-disabled-48.png`,
          },
        });
      });

    if (this.menuId) {
      browser.contextMenus.update(this.menuId, { checked: false });
    }

    browser.windows
      .getAll({ populate: true, windowTypes: ['normal'] })
      .then(windows => {
        for (const win of windows) {
          console.assert(typeof win.tabs !== 'undefined');
          for (const tab of win.tabs!) {
            console.assert(
              typeof tab.id === 'number',
              `Unexpected tab id: ${tab.id}`
            );
            browser.tabs.sendMessage(tab.id!, { type: 'disable' }).catch(() => {
              /* Some tabs don't have the content script so just ignore
               * connection failures here. */
            });
          }
        }
      });
  }

  toggle(tab: browser.tabs.Tab) {
    if (this.enabled) {
      this.disableAll();
    } else {
      bugsnagClient.leaveBreadcrumb('Enabling tab from toggle');
      this.enableTab(tab);
    }
  }

  addContextMenu() {
    if (this.menuId) {
      return;
    }

    try {
      this.menuId = browser.contextMenus.create({
        id: 'context-toggle',
        type: 'checkbox',
        title: browser.i18n.getMessage('menu_enable_extension'),
        command: '_execute_browser_action',
        contexts: ['all'],
        checked: this.enabled,
      });
    } catch (e) {
      // TODO: Chrome doesn't support the 'command' member so if we got an
      // exception, assume that's it and try the old-fashioned way.
    }
  }

  async removeContextMenu() {
    if (!this.menuId) {
      return;
    }

    try {
      await browser.contextMenus.remove(this.menuId);
    } catch (e) {
      console.error(`Failed to remove context menu: ${e}`);
      bugsnagClient.notify(`Failed to remove context menu: ${e}`, {
        severity: 'warning',
      });
    }

    this.menuId = null;
  }

  search(text: string, dictOption: DictMode) {
    if (!this.flatFileDict) {
      console.error('Dictionary not initialized in search');
      bugsnagClient.notify('Dictionary not initialized in search', {
        severity: 'warning',
      });
      return;
    }

    const kanjiReferences = new Set(
      Object.entries(this.config.kanjiReferences)
        .filter(([, /*abbrev*/ setting]) => setting)
        .map(([abbrev /*setting*/]) => abbrev)
    );
    const kanjiSearchOptions = {
      includedReferences: kanjiReferences,
      includeKanjiComponents: this.config.showKanjiComponents,
    };

    switch (dictOption) {
      case DictMode.ForceKanji:
        return Promise.resolve(
          this.flatFileDict.kanjiSearch(text.charAt(0), kanjiSearchOptions)
        );

      case DictMode.Default:
        this.showMode = 0;
        break;

      case DictMode.NextDict:
        this.showMode = (this.showMode + 1) % this.dictCount;
        break;
    }

    const searchCurrentDict: (text: string) => Promise<SearchResult | null> = (
      text: string
    ) => {
      switch (this.showMode) {
        case this.kanjiDictIndex:
          return Promise.resolve(
            this.flatFileDict!.kanjiSearch(text.charAt(0), kanjiSearchOptions)
          );
        case this.nameDictIndex:
          return this.flatFileDict!.wordSearch({
            input: text,
            doNames: true,
            includeRomaji: false,
          });
      }
      return this.flatFileDict!.wordSearch({
        input: text,
        doNames: false,
        includeRomaji: this.config.showRomaji,
      });
    };

    const originalMode = this.showMode;
    return (function loopOverDictionaries(
      text,
      self
    ): Promise<SearchResult | null> {
      return searchCurrentDict(text).then(result => {
        if (result) {
          return result;
        }
        self.showMode = (self.showMode + 1) % self.dictCount;
        if (self.showMode === originalMode) {
          return null;
        }
        return loopOverDictionaries(text, self);
      });
    })(text, this);
  }
}

const rcBackground = new RikaiBackground();

browser.runtime.onInstalled.addListener(() => {
  rcBackground.maybeDownloadData();
});
