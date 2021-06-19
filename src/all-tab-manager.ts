import Bugsnag from '@bugsnag/browser';
import Browser, { browser } from 'webextension-polyfill-ts';

import { isBackgroundRequest } from './background-request';

import { ContentConfig } from './content-config';
import { ExtensionStorageError } from './extension-storage-error';
import {
  EnabledChangedCallback,
  TabManager,
  EnabledState,
} from './tab-manager';

export default class AllTabManager implements TabManager {
  private config: ContentConfig | undefined;
  private enabled = false;
  private listeners: Array<EnabledChangedCallback> = [];

  async init(config: ContentConfig): Promise<void> {
    this.config = config;

    // Try to fetch our previous enabled state from local storage
    this.enabled = await this.getStoredEnabledState();

    // Notify listeners
    if (this.enabled) {
      this.notifyListeners(true);
    }

    // Try to enable the active tab in the current window
    if (this.enabled) {
      this.enableActiveTab().catch(Bugsnag.notify);
    }

    // Since we only enable the content script in the active tab for the current
    // window, if any other tab becomes active we should make sure it gets
    // enabled too.
    browser.tabs.onActivated.addListener(({ tabId }) => this.enableTab(tabId));

    // Response to enable? messages
    browser.runtime.onMessage.addListener(
      (
        request: any,
        sender: Browser.Runtime.MessageSender
      ): void | Promise<any> => {
        if (!isBackgroundRequest(request)) {
          return;
        }

        switch (request.type) {
          case 'enable?':
            if (!sender.tab || typeof sender.tab.id !== 'number') {
              return;
            }

            this.enableTab(sender.tab.id);
            break;
        }
      }
    );
  }

  private async getStoredEnabledState(): Promise<boolean> {
    let getEnabledResult;
    try {
      getEnabledResult = await browser.storage.local.get('enabled');
    } catch (_e) {
      Bugsnag.notify(
        new ExtensionStorageError({ key: 'enabled', action: 'get' }),
        (event) => {
          event.severity = 'warning';
        }
      );
      return false;
    }

    return (
      getEnabledResult.hasOwnProperty('enabled') && !!getEnabledResult.enabled
    );
  }

  private async enableActiveTab(): Promise<void> {
    // browser.tabs.query sometimes fails with a generic Error with message "An
    // unexpected error occurred". I don't know why. Maybe it should fail? Maybe
    // it's a timing thing? Who knows �‍♂️
    //
    // For now, we just do a single retry, two seconds later. If that fails,
    // I suppose the user will just have to manually re-enable the add-on.
    const tryToEnable = async () => {
      const tabs = await browser.tabs.query({
        currentWindow: true,
        active: true,
      });

      if (tabs && tabs.length && typeof tabs[0].id === 'number') {
        Bugsnag.leaveBreadcrumb(
          'Loading because we were enabled on the previous run'
        );
        await this.enableTab(tabs[0].id);
      }
    };

    // Try to enable but only wait on the first attempt.
    try {
      await tryToEnable();
    } catch (_e) {
      console.log('Failed to re-enable. Will retry in two seconds.');
      setTimeout(() => {
        tryToEnable().catch(() => {
          console.log('Second attempt to re-enable failed. Giving up.');
        });
      }, 2000);
    }
  }

  //
  // State queries
  //

  getEnabledState(): Promise<Array<EnabledState>> {
    return Promise.resolve([{ enabled: this.enabled, tabId: undefined }]);
  }

  //
  // Toggling related interface
  //

  async toggleTab(tab: Browser.Tabs.Tab, config: ContentConfig) {
    // Update our local copy of the config
    this.config = config;

    if (typeof tab.id !== 'number') {
      return;
    }

    if (!this.enabled) {
      Bugsnag.leaveBreadcrumb('Enabling tab from toggle');
    }

    // Update local state
    this.enabled = !this.enabled;

    // Update tabs
    if (this.enabled) {
      // Enable this tab
      await this.enableTab(tab.id);
    } else {
      // Disable all tabs
      await sendMessageToAllTabs({ type: 'disable' });
    }

    // Store our local value
    if (this.enabled) {
      browser.storage.local.set({ enabled: true }).catch(() => {
        // Ignore, it's just not that important.
      });
    } else {
      browser.storage.local.remove('enabled').catch(() => {
        // Ignore
      });
    }

    this.notifyListeners(this.enabled);
  }

  private async enableTab(tabId: number): Promise<void> {
    if (!this.config) {
      throw new Error(`Should have called init before enableTab`);
    }

    if (!this.enabled) {
      return;
    }

    try {
      await browser.tabs.sendMessage(tabId, {
        type: 'enable',
        config: this.config,
      });
    } catch (_e) {
      // Some tabs don't have the content script so just ignore
      // connection failures here.
    }
  }

  //
  // Config updates
  //

  async updateConfig(config: ContentConfig) {
    // Ignore redundant changes
    if (JSON.stringify(this.config) === JSON.stringify(config)) {
      return;
    }

    this.config = config;

    if (!this.enabled) {
      return;
    }

    await sendMessageToAllTabs({ type: 'enable', config });
  }

  //
  // Listeners
  //

  addListener(listener: EnabledChangedCallback) {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }

    // Call with initial state, after spinning the event loop to give the client
    // a chance to initialize.
    setTimeout(() => {
      listener(this.enabled);
    }, 0);
  }

  removeListener(listener: EnabledChangedCallback) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners(enabled: boolean) {
    for (const listener of this.listeners.slice()) {
      listener(enabled);
    }
  }
}

async function sendMessageToAllTabs(message: any): Promise<void> {
  const windows = await browser.windows.getAll({
    populate: true,
    windowTypes: ['normal'],
  });
  for (const win of windows) {
    if (!win.tabs) {
      continue;
    }

    for (const tab of win.tabs) {
      if (!tab.id) {
        continue;
      }

      browser.tabs.sendMessage(tab.id, message).catch(() => {
        // Some tabs don't have the content script so just ignore
        // connection failures here.
      });
    }
  }
}
