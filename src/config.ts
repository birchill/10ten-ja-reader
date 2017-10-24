type KanjiReferenceFlags = { [abbrev: string]: boolean };

interface Settings {
  readingOnly?: boolean;
  showKanjiComponents?: boolean;
  kanjiReferences?: KanjiReferenceFlags;
}

type ChangeCallback = (changes: object) => void;

class Config {
  _settings: Settings = {};
  _readPromise: Promise<void>;
  _changeListeners: ChangeCallback[] = [];

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
    };
  }
}

interface Module {
  exports: any;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Config;
}
