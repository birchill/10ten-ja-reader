browser.browserAction.onClicked.addListener(rcxMain.inlineToggle);

browser.tabs.onActivated.addListener(activeInfo =>
  rcxMain.onTabSelect(activeInfo.tabId)
);

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.type) {
    case 'enable?':
      rcxMain.onTabSelect(sender.tab.id);
      break;
    case 'xsearch':
      return rcxMain.search(request.text, request.dictOption);
    case 'translate':
      return rcxMain.dict.translate(request.title);
    case 'toggleDefinition':
      rcxMain.config.toggleReadingOnly();
      break;
  }
});

rcxMain.config = new Config();

// Notify all tabs on config changes
rcxMain.config.onContentChange = config => {
  browser.windows.getAll({ populate: true}).then(windows => {
    for (const win of windows) {
      for (const tab of win.tabs) {
        browser.tabs.sendMessage(tab.id, { type: 'enable', config });
      }
    }
  });
}
