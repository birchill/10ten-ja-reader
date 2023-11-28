/// <reference path="../common/constants.d.ts" />
import browser, { Menus, Tabs } from 'webextension-polyfill';

import { isFenix } from '../utils/ua-utils';

const TOGGLE_MENU_ID = 'context-toggle';
const ENABLE_PUCK_MENU_ID = 'context-enable-puck';

// Thunderbird does not support contextMenus, only menus.
//
// iOS does not support either.
const contextMenus: browser.ContextMenus.Static | undefined =
  browser.contextMenus || browser.menus;

export function registerMenuListeners(options: {
  onToggleMenu: (tab: Tabs.Tab | undefined) => void;
  onTogglePuck: (enabled: boolean) => void;
}) {
  contextMenus?.onClicked.addListener((info, tab) => {
    if (info.menuItemId === TOGGLE_MENU_ID) {
      options.onToggleMenu(tab);
    } else if (info.menuItemId === ENABLE_PUCK_MENU_ID) {
      options.onTogglePuck(!!info.checked);
    }
  });
}

/**
 * Create / update the context menu items based on the current state.
 *
 * This is a little bit of a funny function because:
 *
 * 1. We can't programmatically tell if a menu item exists or not.
 *
 * 2. Firefox will destroy the context menu if an add-on is disabled.
 *    See bug 1771328 / bug 1817287.
 *
 *    The proposed workaround is to simply unconditionally create the menus at
 *    the top-level and ignore any errors that occur if the menu already
 *    exists.
 *
 *    See: https://bugzilla.mozilla.org/show_bug.cgi?id=1771328#c1
 *
 * As a result of that, we simply try to create each menu item each time and, if
 * it fails, we try to update it instead.
 */
export async function updateContextMenus(options: {
  tabEnabled: boolean;
  toggleMenuEnabled: boolean;
  showPuck: boolean;
}) {
  // Fenix does not support context menus (but I'm not sure if it actually sets
  // contextMenus to undefined).
  if (!contextMenus || isFenix()) {
    return;
  }

  const { tabEnabled, toggleMenuEnabled, showPuck } = options;

  if (toggleMenuEnabled) {
    try {
      await addToggleMenu(tabEnabled);
    } catch {
      try {
        await contextMenus.update(TOGGLE_MENU_ID, { checked: tabEnabled });
      } catch {
        // Ignore
      }
    }
  } else {
    await removeMenuItem(TOGGLE_MENU_ID);
  }

  // We only show the enable puck menu if the tab is enabled
  if (tabEnabled) {
    try {
      await addEnablePuckMenu(showPuck);
    } catch {
      try {
        await contextMenus.update(ENABLE_PUCK_MENU_ID, { checked: showPuck });
      } catch {
        // Ignore
      }
    }
  } else {
    await removeMenuItem(ENABLE_PUCK_MENU_ID);
  }
}

async function addToggleMenu(enabled: boolean) {
  const contexts: Array<Menus.ContextType> = [
    __MV3__ ? 'action' : 'browser_action',
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

  return createMenuItem({
    id: TOGGLE_MENU_ID,
    type: 'checkbox',
    title: browser.i18n.getMessage('menu_enable_extension'),
    contexts,
    checked: enabled,
  });
}

async function addEnablePuckMenu(enabled: boolean) {
  return createMenuItem({
    id: ENABLE_PUCK_MENU_ID,
    type: 'checkbox',
    title: browser.i18n.getMessage('menu_enable_puck'),
    contexts: [__MV3__ ? 'action' : 'browser_action'],
    checked: enabled,
  });
}

async function createMenuItem(
  createProperties: Menus.CreateCreatePropertiesType
) {
  // It's important we don't handle errors here so that the caller can detect a
  // failure to create the menu item and try to update the existing one instead.
  return new Promise<void>((resolve, reject) => {
    if (!contextMenus) {
      reject(new Error('contextMenus is undefined'));
      return;
    }

    contextMenus.create(createProperties, () => {
      if (browser.runtime.lastError) {
        reject(browser.runtime.lastError);
      }
      resolve();
    });
  });
}

async function removeMenuItem(menuItemId: string) {
  try {
    await contextMenus?.remove(menuItemId);
  } catch {
    // Ignore
  }
}
