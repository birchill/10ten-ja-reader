/// <reference path="./mail-extensions.d.ts" />
import Bugsnag from '@birchill/bugsnag-zero';
import * as s from 'superstruct';
import browser, { Runtime, Tabs, Windows } from 'webextension-polyfill';

import { ContentConfigParams } from '../common/content-config-params';
import { requestIdleCallback } from '../utils/request-idle-callback';

import {
  BackgroundMessage,
  IndividualFrameMessage,
  TopFrameMessage,
} from './background-message';
import { BackgroundRequestSchema } from './background-request';
import {
  EnabledChangedCallback,
  EnabledState,
  TabManager,
} from './tab-manager';

type Tab = {
  frames: Array<{ initialSrc: string }>;
  src: string;
  rootWindowCheckTimeout?: number;
};

export default class AllTabManager implements TabManager {
  private config: ContentConfigParams | undefined;
  private initPromise: Promise<void> | undefined;
  private initComplete = false;
  private enabled = false;
  private listeners: Array<EnabledChangedCallback> = [];
  private tabs: Array<Tab> = [];
  private tabsCleanupTask: number | undefined;

  async init(config: ContentConfigParams): Promise<void> {
    if (this.initPromise) {
      if (JSON.stringify(this.config) !== JSON.stringify(config)) {
        const error = new Error(
          'AllTabManager::init called multiple times with different configurations'
        );
        console.error(error);
        void Bugsnag.notify(error);
      }
      return this.initPromise;
    }

    this.initPromise = this.doInit(config);

    return this.initPromise;
  }

  private async doInit(config: ContentConfigParams): Promise<void> {
    this.config = config;

    // Try to fetch our previous enabled state from local storage
    this.enabled = await this.getStoredEnabledState();

    // Notify listeners
    if (this.enabled) {
      this.notifyListeners(true);
    }

    // Try to enable the active tab in each window
    if (this.enabled) {
      this.enableActiveTabs().catch((e) => Bugsnag.notify(e));
    }

    // Since we only enable the content script in the active tabs, if any other
    // tab becomes active we should make sure it gets enabled too.
    browser.tabs.onActivated.addListener(({ tabId }) => {
      return this.enableTab(tabId);
    });

    // Response to enabling-related messages
    browser.runtime.onMessage.addListener(
      (
        request: unknown,
        sender: Runtime.MessageSender
      ): undefined | Promise<any> => {
        if (!s.is(request, BackgroundRequestSchema)) {
          return undefined;
        }

        switch (request.type) {
          case 'enable?':
            if (!sender.tab || typeof sender.tab.id !== 'number') {
              return undefined;
            }

            void this.enableTab(sender.tab.id, sender.frameId);
            break;

          case 'enabled':
            if (
              !sender.tab ||
              typeof sender.tab.id !== 'number' ||
              typeof sender.frameId !== 'number'
            ) {
              return undefined;
            }

            this.updateFrames({
              tabId: sender.tab.id,
              frameId: sender.frameId,
              src: request.src,
            });

            return Promise.resolve({ frameId: sender.frameId });

          case 'disabled':
            if (!sender.tab || typeof sender.tab.id !== 'number') {
              return;
            }

            this.dropFrame({ tabId: sender.tab.id, frameId: sender.frameId });
            break;
        }

        return undefined;
      }
    );

    this.initComplete = true;
  }

  private async getStoredEnabledState(): Promise<boolean> {
    let getEnabledResult;
    try {
      getEnabledResult = await browser.storage.local.get('enabled');
    } catch {
      // This error occurs too frequently to be useful to report to Bugsnag.
      return false;
    }

    return (
      getEnabledResult.hasOwnProperty('enabled') && !!getEnabledResult.enabled
    );
  }

  private async enableActiveTabs(): Promise<void> {
    // browser.tabs.query sometimes fails with a generic Error with message "An
    // unexpected error occurred". I don't know why. Maybe it should fail? Maybe
    // it's a timing thing? Who knows �‍♂️
    //
    // For now, we just do a single retry, two seconds later. If that fails,
    // I suppose the user will have to try again.
    const tryToEnable = async () => {
      const tabs = await browser.tabs.query({ active: true });
      if (!tabs) {
        return;
      }

      for (const tab of tabs) {
        if (typeof tab.id === 'number') {
          await this.enableTab(tab.id);
        }
      }
    };

    // Try to enable but only wait on the first attempt.
    try {
      await tryToEnable();
    } catch {
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

  async toggleTab(_tab: Tabs.Tab | undefined, config: ContentConfigParams) {
    if (!this.initPromise) {
      throw new Error('Should have called init before toggleTab');
    }

    await this.initPromise;

    // Update our local copy of the config
    this.config = config;

    if (!this.enabled) {
      Bugsnag.leaveBreadcrumb('Enabling active tabs from toggle');
    }

    // Update local state
    this.enabled = !this.enabled;

    // Update tabs
    if (this.enabled) {
      // Enable the active tabs
      await this.enableActiveTabs();
    } else {
      // Disable all tabs
      await sendMessageToAllTabs({ type: 'disable', frame: '*' });
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

  private async enableTab(tabId: number, frameId?: number): Promise<void> {
    if (!this.config) {
      throw new Error('Should have called init before enableTab');
    }

    if (!this.enabled) {
      return;
    }

    try {
      await browser.tabs.sendMessage(
        tabId,
        {
          type: 'enable',
          config: this.config,
          // At the point when the listener gets this message it won't know what
          // its frameId is so it's pointless to specify it here.
          frame: '*',
        },
        { frameId }
      );
    } catch {
      // Some tabs don't have the content script so just ignore
      // connection failures here.
    }
  }

  //
  // Config updates
  //

  async updateConfig(config: ContentConfigParams) {
    // Ignore redundant changes
    if (JSON.stringify(this.config) === JSON.stringify(config)) {
      return;
    }

    this.config = config;

    if (!this.enabled) {
      return;
    }

    await sendMessageToAllTabs({ type: 'enable', config, frame: '*' });
  }

  async notifyDbUpdated() {
    await sendMessageToAllTabs({ type: 'dbUpdated', frame: '*' });
  }

  //
  // Frame management
  //

  sendMessageToFrame<T extends Omit<IndividualFrameMessage, 'frame'>>({
    tabId,
    message,
    frameId,
  }: {
    tabId: number;
    message: T;
    frameId: number;
  }) {
    browser.tabs
      .sendMessage(tabId, { ...message, frame: frameId }, { frameId })
      .catch(() => {
        // Probably just a stale frameId
      });
  }

  sendMessageToTopFrame<T extends Omit<TopFrameMessage, 'frame'>>({
    tabId,
    message,
  }: {
    tabId: number;
    message: T;
  }) {
    const frameId = this.getTopFrameId(tabId);
    if (frameId === null) {
      return;
    }

    browser.tabs
      .sendMessage(tabId, { ...message, frame: 'top' }, { frameId })
      .catch(() => {
        // Probably just a stale frameId
      });
  }

  private getTopFrameId(tabId: number): number | null {
    if (!(tabId in this.tabs)) {
      return null;
    }

    return Number(Object.keys(this.tabs[tabId].frames)[0]);
  }

  getInitialFrameSrc({
    tabId,
    frameId,
  }: {
    tabId: number;
    frameId: number;
  }): string | undefined {
    return this.tabs[tabId]?.frames[frameId]?.initialSrc;
  }

  private updateFrames({
    tabId,
    frameId,
    src,
  }: {
    tabId: number;
    frameId: number;
    src: string;
  }) {
    if (tabId in this.tabs) {
      const tab = this.tabs[tabId];
      if (frameId === 0) {
        tab.src = src;
      }
      // If we have navigated the root frame, blow away all the child frames
      if (frameId === 0 && tab.src !== src && tab.src !== '') {
        tab.frames = [];
      }
    } else {
      this.tabs[tabId] = { src: frameId === 0 ? src : '', frames: [] };
    }

    const tab = this.tabs[tabId];
    const addedFrame = !(frameId in tab.frames);
    tab.frames[frameId] = { initialSrc: src };

    // Try to detect the "no content script in the root window" case
    if (addedFrame && !tab.frames[0] && !tab.rootWindowCheckTimeout) {
      tab.rootWindowCheckTimeout = self.setTimeout(() => {
        if (!this.tabs[tabId] || !Object.keys(this.tabs[tabId].frames).length) {
          return;
        }

        this.tabs[tabId].rootWindowCheckTimeout = undefined;

        const topMostFrameId = Number(Object.keys(this.tabs[tabId].frames)[0]);
        if (topMostFrameId !== 0) {
          this.sendMessageToFrame({
            tabId,
            message: { type: 'isTopMost' },
            frameId: topMostFrameId,
          });
        }
      }, 3000);
    }

    // Schedule a task to clean up any tabs that have been closed
    if (!this.tabsCleanupTask) {
      this.tabsCleanupTask = requestIdleCallback(async () => {
        this.tabsCleanupTask = undefined;
        try {
          const allTabs = await browser.tabs.query({});
          const ourTabs = Object.keys(this.tabs).map(Number);
          for (const tabId of ourTabs) {
            if (!allTabs.some((t) => t.id === tabId)) {
              delete this.tabs[tabId];
            }
          }
        } catch (e) {
          // Sometimes tabs.query will fail (e.g. if the user is dragging tabs).
          //
          // That's fine since presumably this task will get scheduled again
          // eventually.
          Bugsnag.leaveBreadcrumb('Error cleaning up tabs', e);
        }
      });
    }
  }

  private dropFrame({
    tabId,
    frameId,
  }: {
    tabId: number;
    frameId: number | undefined;
  }) {
    if (!this.tabs[tabId]) {
      return;
    }

    if (typeof frameId === 'number') {
      const tab = this.tabs[tabId];
      delete tab.frames[frameId];
      if (!tab.frames.length) {
        delete this.tabs[tabId];
      }
    } else {
      delete this.tabs[tabId];
    }
  }

  //
  // Listeners
  //

  addListener(listener: EnabledChangedCallback) {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }

    if (this.initComplete) {
      listener({ enabled: this.enabled, anyEnabled: this.enabled });
    }

    // If we are still initializing, all the listeners will get notified at the
    // end of initialization if we are enabled.
  }

  removeListener(listener: EnabledChangedCallback) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners(enabled: boolean) {
    for (const listener of this.listeners.slice()) {
      listener({ enabled, anyEnabled: enabled });
    }
  }
}

async function sendMessageToAllTabs(message: BackgroundMessage): Promise<void> {
  const allTabs: Array<Tabs.Tab> = [];

  // We could probably always just use `browser.tabs.query` but for some reason
  // I decided to use browser.window.getAll. We use `browser.tabs.query` as a
  // fallback when that is not available (e.g. Firefox for Android).
  //
  // 2021-09-20: I think we prefer windows.getAll over tabs.query because
  // tabs.query is not particularly reliable (e.g. when the user is dragging
  // tabs it will fail).
  if (browser.windows) {
    let windows: Array<Windows.Window> = [];
    const windowTypes: Array<Windows.MailWindowType> = ['normal'];
    // Firefox will just return an empty array if we pass a window type it
    // doesn't recognize so we need to "feature-detect" if we are in a mail
    // extension context or not. For now the presence/absence of the
    // composeAction member will do.
    if (browser.composeAction) {
      windowTypes.push('messageCompose', 'messageDisplay');
    }

    try {
      windows = await browser.windows.getAll({ populate: true, windowTypes });
    } catch (e) {
      Bugsnag.leaveBreadcrumb('Error getting windows', { error: e });
    }

    for (const win of windows) {
      if (!win.tabs) {
        continue;
      }

      allTabs.push(...win.tabs);
    }
  } else {
    const tabs = await browser.tabs.query({});
    allTabs.push(...tabs);
  }

  for (const tab of allTabs) {
    if (!tab.id) {
      continue;
    }

    browser.tabs.sendMessage(tab.id, message).catch(() => {
      // Some tabs don't have the content script so just ignore
      // connection failures here.
    });
  }
}
