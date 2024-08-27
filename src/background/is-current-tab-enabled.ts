import Bugsnag from '@birchill/bugsnag-zero';
import browser from 'webextension-polyfill';

import { TabManager } from './tab-manager';

// Determining if the tab is enabled or not is not straightforward since
// different windows can have different enabled states.
//
// So if we get multiple windows, we should try to find out which one is the
// current window and use that.
export async function isCurrentTabEnabled(
  tabManager: TabManager
): Promise<boolean> {
  const enabledStates = await tabManager.getEnabledState();
  if (enabledStates.length < 1) {
    return false;
  }

  if (enabledStates.length === 1) {
    return enabledStates[0].enabled;
  }

  try {
    const currentWindowTabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    // We've received at least one error report where `currentWindowTabs` was
    // `undefined` on Safari. That shouldn't ever happen, but let's handle it just
    // in case.
    if (!currentWindowTabs) {
      return false;
    }

    // Typically there's only one active tab per window so let's just query that
    // (rather than introducing something potentially O(n^2)).
    const activeTab = currentWindowTabs[0];

    return (
      activeTab &&
      enabledStates.some(
        (state) => state.tabId === activeTab.id && state.enabled
      )
    );
  } catch (e) {
    void Bugsnag.notify(e);
    return false;
  }
}
