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
    case 'resetDict':
      rcxMain.resetDict();
      break;
    case 'translate':
      return rcxMain.dict.translate(request.title);
    case 'makehtml':
      sendResponse(rcxMain.dict.makeHtml(request.entry));
      break;
    case 'switchOnlyReading':
      if (rcxMain.config.onlyReading)
        rcxMain.config.onlyReading = false;
      else rcxMain.config.onlyReading = true;
      localStorage['onlyReading'] = rcxMain.config.onlyReading;
      break;
    case 'copyToClip':
      rcxMain.copyToClip(sender.tab, request.entry);
      break;
  }
});

if (initStorage('v0.8.92', true)) {
  // v0.7
  initStorage('popupcolor', 'blue');
  initStorage('highlight', true);

  // v0.8
  // No changes to options

  // V0.8.5
  initStorage('textboxhl', false);

  // v0.8.6
  initStorage('onlyReading', false);
  // v0.8.8
  if (localStorage['highlight'] == 'yes') localStorage['highlight'] = 'true';
  if (localStorage['highlight'] == 'no') localStorage['highlight'] = 'false';
  if (localStorage['textboxhl'] == 'yes') localStorage['textboxhl'] = 'true';
  if (localStorage['textboxhl'] == 'no') localStorage['textboxhl'] = 'false';
  if (localStorage['onlyReading'] === 'yes')
    localStorage['onlyReading'] = 'true';
  if (localStorage['onlyReading'] === 'no')
    localStorage['onlyReading'] = 'false';
  initStorage('copySeparator', 'tab');
  initStorage('maxClipCopyEntries', '7');
  initStorage('lineEnding', 'n');
  initStorage('minihelp', 'true');
  initStorage('disablekeys', 'false');
  initStorage('kanjicomponents', 'true');

  for (let ref of REF_ABBREVIATIONS) {
    initStorage(ref.abbrev, 'true');
  }

  // v0.8.92
  initStorage('popupDelay', '150');
  initStorage('showOnKey', '');
}

/**
 * Initializes the localStorage for the given key.
 * If the given key is already initialized, nothing happens.
 *
 * @author Teo (GD API Guru)
 * @param key The key for which to initialize
 * @param initialValue Initial value of localStorage on the given key
 * @return true if a value is assigned or false if nothing happens
 */
function initStorage(key, initialValue) {
  var currentValue = localStorage[key];
  if (!currentValue) {
    localStorage[key] = initialValue;
    return true;
  }
  return false;
}

rcxMain.config = {};
rcxMain.config.css = localStorage['popupcolor'];
rcxMain.config.highlight = localStorage['highlight'];
rcxMain.config.textboxhl = localStorage['textboxhl'];
rcxMain.config.onlyReading = localStorage['onlyReading'] == 'true';
rcxMain.config.copySeparator = localStorage['copySeparator'];
rcxMain.config.maxClipCopyEntries = localStorage['maxClipCopyEntries'];
rcxMain.config.lineEnding = localStorage['lineEnding'];
rcxMain.config.minihelp = localStorage['minihelp'];
rcxMain.config.popupDelay = parseInt(localStorage['popupDelay']);
rcxMain.config.disablekeys = localStorage['disablekeys'];
rcxMain.config.showOnKey = localStorage['showOnKey'];
rcxMain.config.kanjicomponents = localStorage['kanjicomponents'];
rcxMain.config.kanjiinfo = {};
for (let ref of REF_ABBREVIATIONS) {
  rcxMain.config.kanjiinfo[ref.abbrev] = localStorage[ref.abbrev];
}
