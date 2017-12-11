// This is a wrapper about the browser.sync.settings API which provides
// following important features:
//
// * Only options that are explicitly set get saved. (This prevents the
//   FoxClocks problem where, when you install the FoxClocks add-on on a new
//   computer it sets all the settings to their default values before a sync
//   happens so then all other synchronized computers end up having their
//   settings reset to their default values.)
//
// * Provides a snapshot of all options with their default values filled-in for
//   passing to the content process.

type KanjiReferenceFlags = { [abbrev: string]: boolean };

interface Settings {
  readingOnly?: boolean;
  keys?: Partial<KeyboardKeys>;
  contextMenuEnable?: boolean;
  noTextHighlight?: boolean;
  showKanjiComponents?: boolean;
  kanjiReferences?: KanjiReferenceFlags;
  popupStyle?: string;
}

type ChangeCallback = (changes: object) => void;

// A single key description. We use this definition for storing the default keys
// since it allows storing as an array (so we can determine the order the
// options are displayed in) and storing a description along with each key.
interface KeySetting {
  name: keyof KeyboardKeys;
  keys: string[];
  description: string;
}

class Config {
  _settings: Settings = {};
  _readPromise: Promise<void>;
  _changeListeners: ChangeCallback[] = [];

  DEFAULT_KEY_SETTINGS: KeySetting[] = [
    {
      name: 'nextDictionary',
      keys: ['Shift', 'Enter'],
      description: 'Switch dictionaries',
    },
    {
      name: 'toggleDefinition',
      keys: ['d'],
      description: 'Toggle definition',
    },
  ];

  DEFAULT_KEYS: KeyboardKeys = this.DEFAULT_KEY_SETTINGS.reduce(
    (defaultKeys, setting) => {
      defaultKeys[setting.name] = setting.keys;
      return defaultKeys;
    },
    {}
  ) as KeyboardKeys;

  constructor() {
    this._readPromise = this._readSettings();
    this.onChange = this.onChange.bind(this);
    browser.storage.onChanged.addListener(this.onChange);
  }

  async _readSettings() {
    let settings;
    try {
      settings = await browser.storage.sync.get(null);
    } catch (e) {
      settings = {};
    }
    this._settings = settings;
  }

  get ready(): Promise<void> {
    return this._readPromise;
  }

  onChange(changes, areaName) {
    if (areaName !== 'sync') {
      return;
    }
    for (const listener of this._changeListeners) {
      listener(changes);
    }
  }

  addChangeListener(callback: ChangeCallback) {
    if (this._changeListeners.indexOf(callback) !== -1) {
      return;
    }
    this._changeListeners.push(callback);
  }

  removeChangeListener(callback: ChangeCallback) {
    const index = this._changeListeners.indexOf(callback);
    if (index === -1) {
      return;
    }
    this._changeListeners.splice(index, 1);
  }

  // readingOnly: Defaults to false

  get readingOnly(): boolean {
    return !!this._settings.readingOnly;
  }

  set readingOnly(value: boolean) {
    if (
      typeof this._settings.readingOnly !== 'undefined' &&
      this._settings.readingOnly === value
    ) {
      return;
    }

    this._settings.readingOnly = value;
    browser.storage.sync.set({ readingOnly: value });
  }

  toggleReadingOnly() {
    this.readingOnly = !this._settings.readingOnly;
  }

  // keys: Defaults are defined by DEFAULT_KEYS

  get keys(): KeyboardKeys {
    const setValues = this._settings.keys || {};
    return { ...this.DEFAULT_KEYS, ...setValues };
  }

  updateKeys(keys: Partial<KeyboardKeys>) {
    const existingSettings = this._settings.keys || {};
    this._settings.keys = {
      ...existingSettings,
      ...keys,
    };
    browser.storage.sync.set({ keys: this._settings.keys as any });
  }

  // popupStyle: Defaults to blue

  get popupStyle(): string {
    return typeof this._settings.popupStyle === 'undefined'
      ? 'blue'
      : this._settings.popupStyle;
  }

  set popupStyle(value: string) {
    if (
      typeof this._settings.popupStyle !== 'undefined' &&
      this._settings.popupStyle === value
    ) {
      return;
    }

    this._settings.popupStyle = value;
    browser.storage.sync.set({ popupStyle: value });
  }

  // contextMenuEnable: Defaults to true

  get contextMenuEnable(): boolean {
    return (
      typeof this._settings.contextMenuEnable === 'undefined' ||
      this._settings.contextMenuEnable
    );
  }

  set contextMenuEnable(value: boolean) {
    if (
      typeof this._settings.contextMenuEnable !== 'undefined' &&
      this._settings.contextMenuEnable === value
    ) {
      return;
    }

    this._settings.contextMenuEnable = value;
    browser.storage.sync.set({ contextMenuEnable: value });
  }

  // noTextHighlight: Defaults to false

  get noTextHighlight(): boolean {
    return !!this._settings.noTextHighlight;
  }

  set noTextHighlight(value: boolean) {
    if (
      typeof this._settings.noTextHighlight !== 'undefined' &&
      this._settings.noTextHighlight === value
    ) {
      return;
    }

    this._settings.noTextHighlight = value;
    browser.storage.sync.set({ noTextHighlight: value });
  }

  // showKanjiComponents: Defaults to true

  get showKanjiComponents(): boolean {
    return (
      typeof this._settings.showKanjiComponents === 'undefined' ||
      this._settings.showKanjiComponents
    );
  }

  set showKanjiComponents(value: boolean) {
    this._settings.showKanjiComponents = value;
    browser.storage.sync.set({ showKanjiComponents: value });
  }

  // kanjiReferences: Defaults to true for all items in REF_ABBREVIATION

  get kanjiReferences(): KanjiReferenceFlags {
    const setValues = this._settings.kanjiReferences || {};
    const result = {};
    for (const ref of REF_ABBREVIATIONS) {
      result[ref.abbrev] =
        typeof setValues[ref.abbrev] === 'undefined' || setValues[ref.abbrev];
    }
    return result;
  }

  updateKanjiReferences(value: KanjiReferenceFlags) {
    const existingSettings = this._settings.kanjiReferences || {};
    this._settings.kanjiReferences = {
      ...existingSettings,
      ...value,
    };
    browser.storage.sync.set({
      kanjiReferences: this._settings.kanjiReferences,
    });
  }

  // Get all the options the content process cares about at once
  get contentConfig(): ContentConfig {
    return {
      readingOnly: this.readingOnly,
      keys: this.keys,
      noTextHighlight: this.noTextHighlight,
      popupStyle: this.popupStyle,
    };
  }
}

interface Module {
  exports: any;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}
