// Recent versions of Firefox use "menus" but in order to support
// Chrome and we use "contextMenus".
//
// See https://github.com/kelseasy/web-ext-types/issues/81

declare namespace browser.contextMenus {
  type ContextType = browser.menus.ContextType;
  type ItemType = browser.menus.ItemType;
  type OnClickData = browser.menus.OnClickData;
  const create: typeof browser.menus.create;
  const getTargetElement: typeof browser.menus.getTargetElement;
  const refresh: typeof browser.menus.refresh;
  const remove: typeof browser.menus.remove;
  const removeAll: typeof browser.menus.removeAll;
  const update: typeof browser.menus.update;
  const onClicked: typeof browser.menus.onClicked;
  const onHidden: typeof browser.menus.onHidden;
  const onShown: typeof browser.menus.onShown;
}
