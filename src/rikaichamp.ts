/*

  Rikai champ
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

class App {
  _config: Config;
  _dict?: Dictionary;

  _haveNames: boolean = true;
  _dictCount: number = 3;
  _enabled: boolean = false;
  _menuId?: number | string = null;

  constructor() {
    this._config = new Config();

    this._config.addChangeListener(changes => {
      if (changes.hasOwnProperty('contextMenuEnable')) {
        if ((changes as any).contextMenuEnable.newValue) {
          this.addContextMenu();
        } else {
          this.removeContextMenu();
        }
      }

      // TODO: Ignore changes that aren't part of contentConfig
      this.updateConfig(this._config.contentConfig);
    });

    browser.tabs.onActivated.addListener(activeInfo => {
      this.onTabSelect(activeInfo.tabId);
    });
    browser.browserAction.onClicked.addListener(tab => {
      this.toggle(tab);
    });
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case 'enable?':
          this.onTabSelect(sender.tab.id);
          break;
        case 'xsearch':
          return this.search(request.text, request.dictOption);
        case 'translate':
          return this._dict.translate(request.title);
        case 'toggleDefinition':
          this._config.toggleReadingOnly();
          break;
      }
    });

    this._config.ready.then(() => {
      if (!this._config.contextMenuEnable) {
        return;
      }
      this.addContextMenu();
    });

    // See if we were enabled on the last run
    browser.storage.local
      .get('enabled')
      .then(getResult => {
        return getResult &&
          getResult.hasOwnProperty('enabled') &&
          getResult.enabled
          ? browser.tabs.getCurrent()
          : null;
      })
      .then(currentTab => {
        if (currentTab) {
          this.enableTab(currentTab);
        }
      })
      .catch(err => {
        // Ignore
      });
  }

  get config(): Config {
    return this._config;
  }

  loadDictionary() {
    if (!this._dict) {
      this._dict = new Dictionary({ loadNames: this._haveNames });
    }
    return this._dict.loaded;
  }

  onTabSelect(tabId) {
    if (!this._enabled) {
      return;
    }

    this._config.ready.then(() => {
      browser.tabs.sendMessage(tabId, {
        type: 'enable',
        config: this._config.contentConfig,
      });
    });
  }

  enableTab(tab) {
    browser.browserAction.setTitle({ title: 'Rikaichamp loading...' });
    browser.browserAction.setIcon({ path: 'images/rikaichamp-loading.svg' });
    if (this._menuId) {
      browser.contextMenus.update(this._menuId, { checked: true });
    }

    Promise.all([this.loadDictionary(), this._config.ready]).then(() => {
      // Send message to current tab to add listeners and create stuff
      browser.tabs.sendMessage(tab.id, {
        type: 'enable',
        config: this._config.contentConfig,
      });
      this._enabled = true;
      browser.storage.local.set({ enabled: true });

      browser.browserAction.setTitle({ title: 'Rikaichamp enabled' });
      browser.browserAction.setIcon({ path: 'images/rikaichamp-blue.svg' });
    });
  }

  updateConfig(config: ContentConfig) {
    if (!this._enabled) {
      return;
    }

    browser.windows.getAll({ populate: true }).then(windows => {
      for (const win of windows) {
        for (const tab of win.tabs) {
          browser.tabs.sendMessage(tab.id, { type: 'enable', config });
        }
      }
    });
  }

  disableAll() {
    this._enabled = false;
    browser.storage.local.remove('enabled').catch(() => {
      /* Ignore */
    });
    browser.browserAction.setTitle({ title: 'Rikaichamp disabled' });
    browser.browserAction.setIcon({ path: 'images/rikaichamp-disabled.svg' });
    if (this._menuId) {
      browser.contextMenus.update(this._menuId, { checked: false });
    }

    browser.windows.getAll({ populate: true }).then(windows => {
      for (const win of windows) {
        for (const tab of win.tabs) {
          browser.tabs.sendMessage(tab.id, { type: 'disable' });
        }
      }
    });
  }

  toggle(tab) {
    if (this._enabled) {
      this.disableAll();
    } else {
      this.enableTab(tab);
    }
  }

  addContextMenu() {
    if (this._menuId) {
      return;
    }

    this._menuId = browser.contextMenus.create({
      id: 'context-toggle',
      type: 'checkbox',
      title: 'Enable Rikaichamp',
      command: '_execute_browser_action',
      contexts: ['all'],
      checked: this._enabled,
    });
  }

  async removeContextMenu() {
    if (!this._menuId) {
      return;
    }

    try {
      await browser.contextMenus.remove(this._menuId);
    } catch (e) {
      console.error(`Failed to remove context menu: ${e}`);
    }

    this._menuId = null;
  }

  _kanjiN: number = 1;
  _namesN: number = 2;
  _showMode: number = 0;

  search(text: string, dictOption: DictMode) {
    const kanjiReferences = new Set(
      Object.entries(this._config.kanjiReferences)
        .filter(([abbrev, setting]) => setting)
        .map(([abbrev, setting]) => abbrev)
    );
    const kanjiSearchOptions = {
      includedReferences: kanjiReferences,
      includeKanjiComponents: this._config.showKanjiComponents,
    };

    switch (dictOption) {
      case DictMode.ForceKanji:
        return Promise.resolve(
          this._dict.kanjiSearch(text.charAt(0), kanjiSearchOptions)
        );

      case DictMode.Default:
        this._showMode = 0;
        break;

      case DictMode.NextDict:
        this._showMode = (this._showMode + 1) % this._dictCount;
        break;
    }

    const searchCurrentDict: (text: string) => Promise<SearchResult | null> = (
      text: string
    ) => {
      switch (this._showMode) {
        case this._kanjiN:
          return Promise.resolve(
            this._dict.kanjiSearch(text.charAt(0), kanjiSearchOptions)
          );
        case this._namesN:
          return this._dict.wordSearch(text, true);
      }
      return this._dict.wordSearch(text, false);
    };

    const originalMode = this._showMode;
    return (function loopOverDictionaries(text, self) {
      return searchCurrentDict(text).then(result => {
        if (result) {
          return result;
        }
        self._showMode = (self._showMode + 1) % self._dictCount;
        if (self._showMode === originalMode) {
          return null;
        }
        return loopOverDictionaries(text, self);
      });
    })(text, this);
  }
}

window.rcxMain = new App();

window.addEventListener('message', event => {
  if (event.origin !== window.location.origin) {
    return;
  }

  if (typeof event.data !== 'object' || typeof event.data.type !== 'string') {
    console.error('Unexpected message format');
    return;
  }

  switch (event.data.type) {
    case 'updateKeys':
      console.assert(
        typeof event.data.keys === 'object',
        '`keys` should be an object'
      );
      window.rcxMain.config.updateKeys(event.data.keys);
      break;

    default:
      console.error(`Unexpected message: ${event.data.type}`);
      break;
  }
});
