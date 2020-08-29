chrome.browserAction.onClicked.addListener(rcxMain.inlineToggle);
chrome.tabs.onSelectionChanged.addListener(rcxMain.onTabSelect);
chrome.runtime.onMessage.addListener(function (request, sender, response) {
  switch (request.type) {
    case 'enable?':
      console.log('enable?');
      rcxMain.onTabSelect(sender.tab.id);
      break;
    case 'xsearch':
      console.log('xsearch');
      const e = rcxMain.search(request.text, request.dictOption);
      response(e);
      break;
    /*  case 'nextDict':
       console.log('nextDict');
       rcxMain.nextDict();
       break;*/
    case 'resetDict':
      console.log('resetDict');
      rcxMain.resetDict();
      break;
    case 'translate':
      console.log('translate');
      const translateEntry = rcxMain.dict.translate(request.title);
      response(translateEntry);
      break;
    case 'makehtml':
      console.log('makehtml');
      const html = rcxMain.dict.makeHtml(request.entry);
      response(html);
      break;
    case 'switchOnlyReading':
      console.log('switchOnlyReading');
      rcxMain.config.onlyreading = !rcxMain.config.onlyreading;
      chrome.storage.sync.set({
        onlyreading: rcxMain.config.onlyreading,
      });
      break;
    case 'copyToClip':
      console.log('copyToClip');
      rcxMain.copyToClip(sender.tab, request.entry);
      break;
    case 'playTTS':
      console.log('playTTS');
      TTS.prototype.play(request.text);
      break;
    default:
      console.log(request);
  }
});

rcxMain.config = {};

const optionsList = [
  'copySeparator',
  'disablekeys',
  'highlight',
  'kanjicomponents',
  'kanjiInfo',
  'lineEnding',
  'maxClipCopyEntries',
  'minihelp',
  'onlyreading',
  'popupcolor',
  'popupDelay',
  'popupLocation',
  'textboxhl',
  'ttsEnabled',
  'showOnKey',
];

/** Get option data from cloud and initialize into memory. */
chrome.storage.sync.get(optionsList, function (items) {
  initializeConfigFromCloudOrLocalStorageOrDefaults(items);

  // Save right away incase we initialized from localStorage or defaults.
  saveOptionsToCloudStorage();
});

/**
 * Initializes config with values from one of the following sources in order:
 *
 * 1. Cloud Storage, 2. Local Storage, and 3. Default
 *
 * @param {Object<string, boolean | number | string>} cloudStorage Config
 *     values retrieved from cloud storage.
 */
function initializeConfigFromCloudOrLocalStorageOrDefaults(cloudStorage) {
  /**
   * Initializes option `key` in `rcxMain.config` from `cloudStorage`, falling
   * back to `localStorage` and finally defaulting to `defaultValue`.
   *
   * @param {string} key
   * @param {boolean | number | string} defaultValue
   */
  function initConfig(key, defaultValue) {
    let currentValue =
      cloudStorage[key] || normalizeStringValue(localStorage[key]);
    if (currentValue === undefined) {
      currentValue = defaultValue;
    }
    rcxMain.config[key] = currentValue;
  }

  initConfig('copySeparator', 'tab');
  initConfig('disablekeys', false);
  initConfig('highlight', true);
  initConfig('kanjicomponents', true);
  initConfig('lineEnding', 'n');
  initConfig('maxClipCopyEntries', 7);
  initConfig('maxDictEntries', 7);
  initConfig('minihelp', true);
  initConfig('onlyreading', false);
  initConfig('popupcolor', 'blue');
  initConfig('popupDelay', 150);
  initConfig('popupLocation', 0);
  initConfig('showOnKey', '');
  initConfig('textboxhl', false);
  initConfig('ttsEnabled', false);

  /**
   * Set kanjiInfo option values
   *
   * Check each key in case there are new types of info to be added to the
   * config. TODO: Consider a solution that doesn't require this loop.
   */
  rcxMain.config.kanjiInfo = {};
  const kanjiInfoLabelList = RcxDict.prototype.kanjiInfoLabelList;
  for (i = 0; i < kanjiInfoLabelList.length; i += 2) {
    const kanjiInfoKey = kanjiInfoLabelList[i];
    if (cloudStorage.kanjiInfo && cloudStorage.kanjiInfo[kanjiInfoKey]) {
      rcxMain.config.kanjiInfo[kanjiInfoKey] =
        cloudStorage.kanjiInfo[kanjiInfoKey];
    } else if (localStorage[kanjiInfoKey]) {
      rcxMain.config.kanjiInfo[kanjiInfoKey] = normalizeStringValue(
        localStorage[kanjiInfoKey]
      );
    } else {
      rcxMain.config.kanjiInfo[kanjiInfoKey] = true;
    }
  }
}

/**
 * Saves options to Google Chrome Cloud storage
 * https://developer.chrome.com/storage
 */
function saveOptionsToCloudStorage() {
  chrome.storage.sync.set({
    // Saving General options
    disablekeys: rcxMain.config.disablekeys,
    highlight: rcxMain.config.highlight,
    kanjicomponents: rcxMain.config.kanjicomponents,
    kanjiInfo: rcxMain.config.kanjiInfo,
    maxDictEntries: rcxMain.config.maxDictEntries,
    minihelp: rcxMain.config.minihelp,
    onlyreading: rcxMain.config.onlyreading,
    popupcolor: rcxMain.config.popupcolor,
    popupDelay: rcxMain.config.popupDelay,
    popupLocation: rcxMain.config.popupLocation,
    showOnKey: rcxMain.config.showOnKey,
    textboxhl: rcxMain.config.textboxhl,
    ttsEnabled: rcxMain.config.ttsEnabled,

    // Saving Copy to Clipboard settings
    copySeparator: rcxMain.config.copySeparator,
    lineEnding: rcxMain.config.lineEnding,
    maxClipCopyEntries: rcxMain.config.maxClipCopyEntries,
  });
}

/**
 * For a given string representation `value` of a boolean, integer or string,
 * returns the same value coerced to the proper type.
 *
 * @param {string} value
 * @returns {boolean | number | string}
 */
function normalizeStringValue(value) {
  const maybeNumber = parseInt(value, 10);
  if (!Number.isNaN(maybeNumber)) return maybeNumber;
  if (value === 'true' || value === 'false') {
    return value === 'true' ? true : false;
  }
  return value;
}
