const defaultConfig = {
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
type MutableConfig = typeof defaultConfig;
type Config = Readonly<MutableConfig>;

// Simply wrapper which makes `sync.get` `Promise` based.
async function getStorage(): Promise<MutableConfig> {
  const config = await new Promise<MutableConfig>((resolve) => {
    chrome.storage.sync.get(defaultConfig, (cloudStorage) => {
      resolve(cloudStorage as MutableConfig);
    });
  });
  return config;
}

function isLegacyKanjiInfo(
  kanjiInfo: [] | {}
): kanjiInfo is { [kanjiInfoCode: string]: boolean } {
  return !(kanjiInfo instanceof Array);
}

async function applyMigrations(storageConfig: MutableConfig): Promise<void> {
  if (isLegacyKanjiInfo(storageConfig.kanjiInfo)) {
    const newKanjiInfo = [];
    for (const info of defaultConfig.kanjiInfo) {
      newKanjiInfo.push({
        ...info,
        shouldDisplay: storageConfig.kanjiInfo[info.code],
      });
    }
    storageConfig.kanjiInfo = newKanjiInfo;
    await new Promise<void>((resolve) => {
      chrome.storage.sync.set(storageConfig, resolve);
    });
  }
}

async function createNormalizedConfiguration(): Promise<MutableConfig> {
  const storageConfig = await getStorage();
  await applyMigrations(storageConfig);
  return storageConfig;
}

const configPromise: Promise<MutableConfig> = createNormalizedConfiguration();

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync') {
    return;
  }
  const config = await configPromise;

  Object.entries(changes).map((change) => {
    (config[change[0] as keyof MutableConfig] as unknown) = change[1].newValue;
  });
});

const immutableConfigPromise = configPromise as Promise<Config>;
export { immutableConfigPromise as configPromise };
export type { Config };
