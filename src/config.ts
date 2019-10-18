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

import {
  ReferenceAbbreviation,
  convertLegacyReference,
  getSupportedReferences,
} from './refs';

// We represent the set of references that have been turned on as a series
// of true or false values.
//
// It might seem like it's sufficient to just store the _set_ values (or
// vice-versa) but that complicates matters when we introduce a new reference
// type or change the default value of an existing reference type. Currently all
// references as enabled by default, but we may wish to add a new reference type
// that is disabled by default, or conditionally enabled by default (e.g. if we
// find data for JLPT Nx levels, we might want to only enable it if the user has
// already got the existing JLPT data enabled).
//
// By recording the references that have actually been changed by the user as
// being either enabled or disabled we capture the user's intention more
// accurately. Anything not set should use the default setting.
type KanjiReferenceFlagsV2 = { [key in ReferenceAbbreviation]?: boolean };

interface Settings {
  readingOnly?: boolean;
  showRomaji?: boolean;
  toggleKey?: string;
  holdToShowKeys?: string;
  keys?: Partial<KeyboardKeys>;
  contextMenuEnable?: boolean;
  noTextHighlight?: boolean;
  showKanjiComponents?: boolean;
  kanjiReferencesV2?: KanjiReferenceFlagsV2;
  popupStyle?: string;
}

type StorageChange = {
  oldValue?: any;
  newValue?: any;
};
type ChangeDict = { [field: string]: StorageChange };
type ChangeCallback = (changes: ChangeDict) => void;

// A single key description. We use this definition for storing the default keys
// since it allows storing as an array (so we can determine the order the
// options are displayed in) and storing a description along with each key.
interface KeySetting {
  name: keyof KeyboardKeys;
  keys: string[];
  enabledKeys: string[];
  l10nKey: string;
}

export const DEFAULT_KEY_SETTINGS: KeySetting[] = [
  {
    name: 'nextDictionary',
    keys: ['Shift', 'Enter'],
    enabledKeys: ['Shift', 'Enter'],
    l10nKey: 'options_popup_switch_dictionaries',
  },
  {
    name: 'toggleDefinition',
    keys: ['d'],
    enabledKeys: [],
    l10nKey: 'options_popup_toggle_definition',
  },
  {
    name: 'startCopy',
    keys: ['c'],
    enabledKeys: ['c'],
    l10nKey: 'options_popup_start_copy',
  },
];

export class Config {
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
    await this.upgradeSettings();
  }

  async upgradeSettings() {
    // If we have old kanji reference settings but not new ones, upgrade them.
    if (
      this._settings.hasOwnProperty('kanjiReferences') &&
      !this._settings.kanjiReferencesV2
    ) {
      const newSettings: KanjiReferenceFlagsV2 = {};
      const existingSettings: { [key: string]: boolean } = (this
        ._settings as any).kanjiReferences;
      for (const [ref, enabled] of Object.entries(existingSettings)) {
        const newRef = convertLegacyReference(ref);
        if (newRef) {
          newSettings[newRef] = enabled;
        }
      }

      this._settings.kanjiReferencesV2 = newSettings;
      await browser.storage.sync.set({
        kanjiReferencesV2: newSettings,
      });
    }
  }

  get ready(): Promise<void> {
    return this._readPromise;
  }

  onChange(changes: ChangeDict, areaName: string) {
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

  // showRomaji: Defaults to false

  get showRomaji(): boolean {
    return !!this._settings.showRomaji;
  }

  set showRomaji(value: boolean) {
    if (
      typeof this._settings.showRomaji !== 'undefined' &&
      this._settings.showRomaji === value
    ) {
      return;
    }

    this._settings.showRomaji = value;
    browser.storage.sync.set({ showRomaji: value });
  }

  // toggleKey: Default is 'Alt+R'
  //
  // Note that we'd like to derive this default from the manifest but,
  // as far as I can tell, browser.commands.getAll() won't necessarily give us
  // what's in the manifest. That is, if we update the command, it will give us
  // the updated value instead.
  //
  // As a result, we don't really have a way of determining the true default
  // programmatically, so we just hard-code the value here and hope it matches
  // the manifest.
  //
  // While this could be an array value, it complicates the options form if we
  // have to deal with that, so for now we just allow a single shortcut.

  get toggleKey(): string {
    return typeof this._settings.toggleKey === 'undefined'
      ? 'Alt+R'
      : this._settings.toggleKey;
  }

  set toggleKey(value: string) {
    if (
      typeof this._settings.toggleKey !== 'undefined' &&
      this._settings.toggleKey === value
    ) {
      return;
    }

    this._settings.toggleKey = value;
    browser.storage.sync.set({ toggleKey: value });
  }

  // holdToShowKeys: Defaults to null

  get holdToShowKeys(): string | null {
    return typeof this._settings.holdToShowKeys === 'string'
      ? this._settings.holdToShowKeys
      : null;
  }

  set holdToShowKeys(value: string | null) {
    if (
      (typeof this._settings.holdToShowKeys !== 'undefined' &&
        this._settings.holdToShowKeys === value) ||
      (typeof this._settings.holdToShowKeys === 'undefined' && value === null)
    ) {
      return;
    }

    if (value === null) {
      browser.storage.sync.remove('holdToShowKeys');
      delete this._settings.holdToShowKeys;
    } else {
      browser.storage.sync.set({ holdToShowKeys: value });
      this._settings.holdToShowKeys = value;
    }
  }

  // keys: Defaults are defined by DEFAULT_KEY_SETTINGS, and particularly the
  // enabledKeys member.

  get keys(): KeyboardKeys {
    const setValues = this._settings.keys || {};
    const defaultEnabledKeys: KeyboardKeys = DEFAULT_KEY_SETTINGS.reduce(
      (defaultKeys, setting) => {
        defaultKeys[setting.name] = setting.enabledKeys;
        return defaultKeys;
      },
      {} as Partial<KeyboardKeys>
    ) as KeyboardKeys;

    return { ...defaultEnabledKeys, ...setValues };
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

  // kanjiReferences: Defaults to true for all supported references

  get kanjiReferences(): Array<ReferenceAbbreviation> {
    const setValues = this._settings.kanjiReferencesV2 || {};
    const result: Array<ReferenceAbbreviation> = [];
    for (const ref of getSupportedReferences({ lang: 'en' })) {
      if (typeof setValues[ref] === 'undefined' || setValues[ref]) {
        result.push(ref);
      }
    }
    return result;
  }

  updateKanjiReferences(updatedReferences: KanjiReferenceFlagsV2) {
    const existingSettings = this._settings.kanjiReferencesV2 || {};
    this._settings.kanjiReferencesV2 = {
      ...existingSettings,
      ...updatedReferences,
    };
    browser.storage.sync.set({
      kanjiReferencesV2: this._settings.kanjiReferencesV2,
    });
  }

  // Get all the options the content process cares about at once
  get contentConfig(): ContentConfig {
    return {
      readingOnly: this.readingOnly,
      kanjiReferences: this.kanjiReferences,
      showKanjiComponents: this.showKanjiComponents,
      holdToShowKeys: this.holdToShowKeys
        ? (this.holdToShowKeys.split('+') as Array<'Ctrl' | 'Alt'>)
        : [],
      keys: this.keys,
      noTextHighlight: this.noTextHighlight,
      popupStyle: this.popupStyle,
    };
  }
}
