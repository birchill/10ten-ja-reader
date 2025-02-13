/// <reference path="../common/constants.d.ts" />
import Bugsnag from '@birchill/bugsnag-zero';
import * as s from 'superstruct';
import browser, { Runtime, Tabs } from 'webextension-polyfill';

import { ContentConfigParams } from '../common/content-config-params';

import { IndividualFrameMessage, TopFrameMessage } from './background-message';
import { BackgroundRequestSchema } from './background-request';
import {
  EnabledChangedCallback,
  EnabledState,
  TabManager,
} from './tab-manager';

type EnabledTab = {
  frames: Array<{ initialSrc: string }>;
  port: Runtime.Port | undefined;
  src: string;
};

export default class ActiveTabManager implements TabManager {
  private config: ContentConfigParams | undefined;
  // It's ok to initialize this to an empty array even if we're being run as an
  // event page that's just been resumed since we only track enabled tabs and
  // any enabled tabs will set up a message port that will keep the background
  // page alive. As a result, if we're being resumed, we must have zero enabled
  // tabs (so far).
  private enabledTabs: Array<EnabledTab> = [];
  private listeners: Array<EnabledChangedCallback> = [];

  async init(config: ContentConfigParams): Promise<void> {
    this.config = config;

    // Notify listeners when the active tab changes
    browser.tabs.onActivated.addListener(({ tabId }) => {
      const enabled = tabId in this.enabledTabs;
      this.notifyListeners(enabled, tabId);
    });

    browser.runtime.onConnect.addListener(this.onConnect.bind(this));

    // Response to enable?/disabled messages
    browser.runtime.onMessage.addListener(
      (
        request: unknown,
        sender: Runtime.MessageSender
      ): undefined | Promise<any> => {
        // Basic sanity checks
        if (!s.is(request, BackgroundRequestSchema)) {
          return undefined;
        }

        // We only handle messages from tabs
        if (!sender.tab || typeof sender.tab.id !== 'number') {
          return undefined;
        }

        switch (request.type) {
          case 'enable?':
            this.enablePage(sender.tab.id, sender.frameId).catch((e) =>
              Bugsnag.notify(e)
            );
            break;

          case 'enabled':
            if (
              typeof sender.frameId === 'number' &&
              sender.tab.id in this.enabledTabs
            ) {
              this.updateFrames({
                tabId: sender.tab.id,
                frameId: sender.frameId,
                src: request.src,
              });
              return Promise.resolve({ frameId: sender.frameId });
            }
            break;

          case 'disabled':
            this.onPageDisabled(sender.tab.id, sender.frameId).catch((e) =>
              Bugsnag.notify(e)
            );
            break;
        }

        return undefined;
      }
    );
  }

  //
  // Port management
  //

  private onConnect(port: Runtime.Port) {
    // If we get a connection, store the port. We don't actually use this at
    // the moment, except as a means to keep the background page alive while
    // we have an enabled tab somewhere.
    if (!port.name.startsWith('tab-')) {
      return;
    }

    const id = parseInt(port.name.substring('tab-'.length), 10);
    if (!id) {
      return;
    }

    const tab = this.enabledTabs[id];
    if (!tab) {
      return;
    }

    tab.port = port;

    port.onDisconnect.addListener(() => this.onPageDisabled(id));
  }

  //
  // State queries
  //

  async getEnabledState(): Promise<Array<EnabledState>> {
    // For each active tab in each window, see if it is enabled
    const result: Array<EnabledState> = [];

    try {
      const activeTabs = await browser.tabs.query({ active: true });
      for (const tab of activeTabs) {
        const enabled =
          typeof tab.id !== 'undefined' && tab.id in this.enabledTabs;
        result.push({ enabled, tabId: tab.id });
      }
    } catch (e) {
      void Bugsnag.notify(e);
    }

    return result;
  }

  //
  // Toggling related interface
  //

  async toggleTab(tab: Tabs.Tab | undefined, config: ContentConfigParams) {
    if (typeof tab?.id === 'undefined') {
      return;
    }

    // First, determine if we want to disable or enable
    const enable = !(tab.id in this.enabledTabs);

    if (enable) {
      this.config = config;
      await this.enablePage(tab.id);
    } else {
      // It's important we drop the entry from the enabledTabs array before we
      // notify the content script. Otherwise when the content script
      // disconnects itself we'll think it should still be enabled and try to
      // re-inject ourselves.
      delete this.enabledTabs[tab.id];
      try {
        await browser.tabs.sendMessage(tab.id, { type: 'disable', frame: '*' });
      } catch (e) {
        void Bugsnag.notify(e);
      }

      this.notifyListeners(false, tab.id);
    }
  }

  private async enablePage(tabId: number, frameId?: number): Promise<void> {
    if (!this.config) {
      throw new Error('Should have called init before enablePage');
    }

    // Update our local list of enabled tabs, if needed.
    //
    // We do this even before we know if we will successfully set up the content
    // script because once the content script _is_ set up, it might end up
    // trying to connect to us before sendMessage returns and we want
    // enabledTabs to be up-to-date by that point.
    //
    // If we fail to set up the content script we'll drop the entry from
    // enabledTabs at that point.
    const isRootFrame = typeof frameId === 'undefined' || frameId === 0;
    if (isRootFrame && !(tabId in this.enabledTabs)) {
      this.enabledTabs[tabId] = { frames: [], port: undefined, src: '' };
    }

    // If we are dealing with a single frame, try calling to see if the content
    // script is already injected.
    //
    // We can't do that if we are dealing with a whole tab, however, since
    // sendMessage only returns the result of the first frame to answer.
    //
    // So in that case we just have to blindly inject the script and trust the
    // content script to return early if it finds it has already been injected.
    //
    // However, we only want to change the enabled state if we are dealing with
    // the root frame or the whole tab.
    let enabled = true;
    if (
      typeof frameId === 'undefined' ||
      !(await this.tryEnablingFrame(tabId, frameId))
    ) {
      // Looks like we need to try and inject the script instead.
      try {
        await this.injectScript(tabId, frameId);
      } catch (e) {
        void Bugsnag.notify(e);

        enabled = false;
        // Drop the enabled tab from our list, but only if we're dealing with
        // the root frame or the whole tab.
        if (isRootFrame) {
          delete this.enabledTabs[tabId];
        }
      }
    }

    // Notify listeners regardless of whether or not we updated enabledTabs.
    //
    // We need to do this because during navigation, the browser can reset the
    // browser action to its non-active state without telling us so even if the
    // tab is already in enabledTabs, we may still need to update the browser
    // action to reflect that.
    if (isRootFrame) {
      this.notifyListeners(enabled, tabId);
    }
  }

  private async tryEnablingFrame(
    tabId: number,
    frameId: number
  ): Promise<boolean> {
    if (!this.config) {
      throw new Error('Should have called init before isFrameEnabled');
    }

    try {
      const result = await browser.tabs.sendMessage(
        tabId,
        {
          type: 'enable',
          config: this.config,
          id: tabId,
          // At the point when the listener gets this message it won't know what
          // its frameId is so it's pointless to specify it here.
          frame: '*',
        },
        { frameId }
      );
      // We need to check we got the expected result because Safari simply fails
      // silently if no one received the message.
      return result === 'ok';
    } catch {
      return false;
    }
  }

  private async injectScript(tabId: number, frameId?: number): Promise<void> {
    // Inject the script
    if (__MV3__) {
      await browser.scripting.executeScript({
        target: {
          tabId,
          allFrames: typeof frameId === 'undefined',
          frameIds: frameId ? [frameId] : undefined,
        },
        files: ['/10ten-ja-content.js'],
        injectImmediately: true,
      });
    } else {
      await browser.tabs.executeScript(tabId, {
        allFrames: typeof frameId === 'undefined',
        file: '/10ten-ja-content.js',
        runAt: 'document_start',
        frameId,
      });
    }

    // See if we should inject the Google Docs bootstrap script too
    try {
      const tabDetails = await browser.tabs.get(tabId);
      if (tabDetails.url?.startsWith('https://docs.google.com')) {
        if (__MV3__) {
          await browser.scripting.executeScript({
            target: {
              tabId,
              allFrames: typeof frameId === 'undefined',
              frameIds: frameId ? [frameId] : undefined,
            },
            files: ['/10ten-ja-gdocs-bootstrap.js'],
            injectImmediately: true,
          });
        } else {
          await browser.tabs.executeScript(tabId, {
            allFrames: typeof frameId === 'undefined',
            file: '/10ten-ja-gdocs-bootstrap.js',
            runAt: 'document_start',
            frameId,
          });
        }
      }
    } catch {
      console.warn('Failed to get tab for injecting Google docs bootstrap');
    }

    // We'd really like to detect if we failed to inject into the root frame
    // (since we report our enabled state based on whether or not the the root
    // frame is successfully enabled).
    //
    // However, there doesn't seem to be any easy way to do that.
    //
    // executeScript returns an array of results from each frame we injected the
    // script into. If the script returns nothing, Firefox reports 'undefined'
    // while Chrome reports 'null'. However, it's not clear if these results are
    // ordered by frame or not, or how to actually return a meaningful value
    // given the way we package our content script. What's more, if any of the
    // frames throws an error, the whole call executeScript call fails.
    //
    // So, for now, we just rely on the call site doing some guessing about
    // whether or not we should report ourselves as being enabled or not.

    // Now send the enable message.
    await browser.tabs.sendMessage(
      tabId,
      { type: 'enable', config: this.config, id: tabId, frame: '*' },
      { frameId }
    );
  }

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
    return tabId in this.enabledTabs ? 0 : null;
  }

  getInitialFrameSrc({
    tabId,
    frameId,
  }: {
    tabId: number;
    frameId: number;
  }): string | undefined {
    if (!(frameId in this.enabledTabs[tabId].frames)) {
      return undefined;
    }

    return this.enabledTabs[tabId].frames[frameId].initialSrc;
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
    if (!(tabId in this.enabledTabs)) {
      return;
    }

    const tab = this.enabledTabs[tabId];
    if (frameId === 0) {
      // If we have navigated the root frame, blow away all the child frames
      if (tab.src !== '' && tab.src !== src) {
        tab.frames = [];
      }
      tab.src = src;
    }
    if (!(frameId in tab.frames)) {
      tab.frames[frameId] = { initialSrc: src };
    }
  }

  private dropFrame({
    tabId,
    frameId,
  }: {
    tabId: number;
    frameId: number | undefined;
  }) {
    if (!this.enabledTabs[tabId]) {
      return;
    }

    if (frameId) {
      const tab = this.enabledTabs[tabId];
      delete tab.frames[frameId];
      if (!tab.frames.length) {
        delete this.enabledTabs[tabId];
      }
    } else {
      delete this.enabledTabs[tabId];
    }
  }

  private async onPageDisabled(tabId: number, frameId?: number) {
    // If we already believe the page to be disabled, there's nothing more to
    // do.
    if (!(tabId in this.enabledTabs)) {
      return;
    }

    // We only modify enabledTabs and we only report changes to the enabled
    // state when we're dealing with a tab as a whole or its root frame.
    const isTabOrRootFrame = typeof frameId === 'undefined' || frameId === 0;

    // The content script was unloaded but it's possible we still have activeTab
    // privileges for this tab. For example, some versions of Chrome and Safari
    // grant activeTab privileges to subsequent navigations to the same origin.
    //
    // Try to re-inject our content script and see if it works.
    let enabled = false;
    try {
      await this.injectScript(tabId, frameId);
      enabled = true;
    } catch {
      // Check if the tab still exists. Perhaps it finished unloading while we
      // were injecting scripts.
      if (!(tabId in this.enabledTabs)) {
        return;
      }

      this.dropFrame({ tabId, frameId });
    }

    // Note that even if we successfully re-injected our content script
    // we still need to notify listeners because browsers will generally
    // automatically reset the browser action icon.
    if (isTabOrRootFrame) {
      this.notifyListeners(enabled, tabId);
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

    const tabIds = Object.keys(this.enabledTabs).map(Number);
    for (const tabId of tabIds) {
      try {
        // We deliberately omit the 'id' member here since it's only needed
        // when setting up a port and shouldn't be required when we're just
        // updating the config.
        await browser.tabs.sendMessage(tabId, {
          type: 'enable',
          config,
          frame: '*',
        });
      } catch (e) {
        console.error('Error sending enable message to tabs', e);
        void Bugsnag.notify(e);
      }
    }
  }

  async notifyDbUpdated() {
    const tabIds = Object.keys(this.enabledTabs).map(Number);
    for (const tabId of tabIds) {
      try {
        await browser.tabs.sendMessage(tabId, {
          type: 'dbUpdated',
          frame: '*',
        });
      } catch (e) {
        console.error('Error sending dbUpdated message to tabs', e);
        void Bugsnag.notify(e);
      }
    }
  }

  //
  // Listeners
  //

  addListener(listener: EnabledChangedCallback) {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }

  removeListener(listener: EnabledChangedCallback) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners(enabled: boolean, tabId: number) {
    for (const listener of this.listeners.slice()) {
      listener({ enabled, tabId, anyEnabled: this.enabledTabs.length > 0 });
    }
  }
}
