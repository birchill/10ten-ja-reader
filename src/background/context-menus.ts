import browser, { Menus, Tabs } from 'webextension-polyfill';

import { TabManager } from './tab-manager';

export type ContextMenusInit = {
  onToggleMenu: (tab: Tabs.Tab) => void;
  onTogglePuck: (enabled: boolean) => void;
  tabManager: TabManager;
  toggleMenuEnabled: boolean;
  showPuck: boolean;
};

let onToggleMenu: ContextMenusInit['onToggleMenu'] | undefined;
let onTogglePuck: ContextMenusInit['onTogglePuck'] | undefined;
let tabManager: TabManager | undefined;

let toggleMenuCreated = false;
let enablePuckMenuCreated = false;

// Thunderbird does not support contextMenus, only menus.
const contextMenus = browser.contextMenus || browser.menus;

export async function initContextMenus(
  options: ContextMenusInit
): Promise<void> {
  onToggleMenu = options.onToggleMenu;
  onTogglePuck = options.onTogglePuck;
  tabManager = options.tabManager;

  const { toggleMenuEnabled, showPuck } = options;

  await updateContextMenus({ toggleMenuEnabled, showPuck });
}

export async function updateContextMenus({
  tabEnabled,
  toggleMenuEnabled,
  showPuck,
}: {
  tabEnabled?: boolean;
  toggleMenuEnabled: boolean;
  showPuck: boolean;
}): Promise<void> {
  // This can happen when the background page initializes the tab manager (in
  // order to determine the tab enabled state) and it ends up notifying about
  // the enabled state before the background page has a chance to call
  // initContextMenus.
  if (!tabManager || !onToggleMenu || !onTogglePuck) {
    return;
  }

  // Resolve the tabEnabled state
  if (typeof tabEnabled === 'undefined') {
    // Determining if the tab is enabled or not is not straightforward since
    // different windows can have different enabled states.
    //
    // So if we get multiple windows, we should try to find out which one is the
    // current window and use that.
    const enabledStates = await tabManager.getEnabledState();
    tabEnabled = false;
    if (enabledStates.length === 1) {
      tabEnabled = enabledStates[0].enabled;
    } else if (enabledStates.length > 1) {
      try {
        const currentWindowTabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        const match = currentWindowTabs.length
          ? enabledStates.find((s) => s.tabId === currentWindowTabs[0].id)
          : undefined;
        tabEnabled = !!match?.enabled;
      } catch {
        // Ignore
      }
    }
  }

  // Update the toggle menu
  if (toggleMenuEnabled) {
    if (!toggleMenuCreated) {
      await addToggleMenu(tabEnabled, onToggleMenu);
      toggleMenuCreated = true;
    } else {
      await updateMenuItemCheckedState('context-toggle', tabEnabled);
    }
  } else {
    toggleMenuCreated = false;
    await removeMenuItem('context-toggle');
  }

  // Update the enable puck menu -- we only show this item if the tab is enabled
  if (tabEnabled) {
    if (!enablePuckMenuCreated) {
      await addEnablePuckMenu(showPuck, onTogglePuck);
      enablePuckMenuCreated = true;
    } else {
      await updateMenuItemCheckedState('context-enable-puck', showPuck);
    }
  } else {
    enablePuckMenuCreated = false;
    await removeMenuItem('context-enable-puck');
  }
}

async function addToggleMenu(
  enabled: boolean,
  onClick: ContextMenusInit['onToggleMenu']
) {
  const contexts: Array<Menus.ContextType> = [
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

  // We'd like to use:
  //
  //   command: '_execute_browser_action'
  //
  // here instead of onclick but:
  //
  // a) Chrome etc. don't support that
  // b) Firefox passes the wrong tab ID to the callback when the command is
  //    activated from the context menu of a non-active tab.
  return createMenuItem({
    id: 'context-toggle',
    type: 'checkbox',
    title: browser.i18n.getMessage('menu_enable_extension'),
    onclick: (_info, tab) => onClick(tab),
    contexts,
    checked: enabled,
  });
}

async function addEnablePuckMenu(
  enabled: boolean,
  onClick: ContextMenusInit['onTogglePuck']
) {
  return createMenuItem({
    id: 'context-enable-puck',
    type: 'checkbox',
    title: browser.i18n.getMessage('menu_enable_puck'),
    onclick: (info) => onClick(!!info.checked),
    contexts: ['browser_action'],
    checked: enabled,
  });
}

async function createMenuItem(
  createProperties: Menus.CreateCreatePropertiesType
) {
  return new Promise<void>((resolve) => {
    contextMenus.create(createProperties, () => {
      // This is just to silence Safari which will complain if the menu
      if (browser.runtime.lastError) {
        // Very interesting
      }
      resolve();
    });
  }).catch(() => {
    // Give up. We're probably on a platform that doesn't support the
    // contextMenus/menus API such as Firefox for Android.
  });
}

async function removeMenuItem(menuItemId: string) {
  try {
    await contextMenus.remove(menuItemId);
  } catch {
    // Ignore
  }
}

async function updateMenuItemCheckedState(
  menuItemId: string,
  checked: boolean
) {
  try {
    await contextMenus.update(menuItemId, { checked });
  } catch {
    // Ignore
  }
}
