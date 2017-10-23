type KanjiReferenceFlags = { [abbrev: string]: boolean };

interface Settings {
  readingOnly?: boolean;
  showKanjiComponents?: boolean;
  kanjiReferences?: KanjiReferenceFlags;
}

type ContentChangeCallback = (config: ContentConfig) => void;

class Config {
  _settings: Settings = {};
  _readPromise: Promise<void>;
  _onContentChange?: ContentChangeCallback;

  constructor() {
    this._readPromise = this._readSettings();
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

  // TODO: Call this periodically (each time rikaichamp is enabled?) so that if
  // settings change on another device and get synced, we update them locally.
  async refreshSettings() {
    this._readPromise = this._readSettings();
  }

  // TODO: Make this take multiple listeners and then make the options page
  // listen so it can update the "hide definition" text box when we change it
  // from content.
  set onContentChange(callback: ContentChangeCallback) {
    this._onContentChange = callback;
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
    if (this._onContentChange) {
      this._onContentChange(this.contentConfig);
    }
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
