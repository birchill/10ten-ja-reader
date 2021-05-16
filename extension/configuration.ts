const DefaultConfig = {
  copySeparator: 'tab',
  disablekeys: false,
  highlight: true,
  kanjicomponents: true,
  lineEnding: 'n',
  maxClipCopyEntries: 7,
  maxDictEntries: 7,
  minihelp: true,
  onlyreading: false,
  popupcolor: 'blue',
  popupDelay: 150,
  popupLocation: 0,
  showOnKey: '',
  textboxhl: false,
  ttsEnabled: false,
  kanjiInfo: [
    { code: 'H', name: 'Halpern', shouldDisplay: true },
    { code: 'L', name: 'Heisig 5th Edition', shouldDisplay: true },
    { code: 'DN', name: 'Heisig 6th Edition', shouldDisplay: true },
    { code: 'E', name: 'Henshall', shouldDisplay: true },
    { code: 'DK', name: 'Kanji Learners Dictionary', shouldDisplay: true },
    { code: 'N', name: 'Nelson', shouldDisplay: true },
    { code: 'V', name: 'New Nelson', shouldDisplay: true },
    { code: 'Y', name: 'PinYin', shouldDisplay: true },
    { code: 'P', name: 'Skip Pattern', shouldDisplay: true },
    { code: 'IN', name: 'Tuttle Kanji &amp; Kana', shouldDisplay: true },
    { code: 'I', name: 'Tuttle Kanji Dictionary', shouldDisplay: true },
    { code: 'U', name: 'Unicode', shouldDisplay: true },
  ],
};
type Config = typeof DefaultConfig;

const initOptions = (async function migrateOptions() {
  const config = await getStorageSync();
  // Old version had a flat object here instead of an
  // array of objects.
  if (!(config.kanjiInfo instanceof Array)) {
    const newKanjiInfo = [];
    for (const info of DefaultConfig.kanjiInfo) {
      newKanjiInfo.push({
        ...info,
        shouldDisplay: config.kanjiInfo[info.code],
      });
    }
    config.kanjiInfo = newKanjiInfo;
    return new Promise<void>((resolve) => {
      chrome.storage.sync.set(config, resolve);
    });
  }
})();

async function getCurrentConfiguration(): Promise<Config> {
  // Probably not required but insures any migrations have
  // happened before we access them normally.
  await initOptions;
  return getStorageSync();
}

// Simply wrapper which makes `sync.get` `Promise` based.
function getStorageSync(): Promise<Config> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(DefaultConfig, function (cloudStorage) {
      resolve(cloudStorage as Config);
    });
  });
}

export { getCurrentConfiguration };
export type { Config };
