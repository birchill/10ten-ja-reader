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

import Bugsnag from '@bugsnag/browser';

import { dbLanguages, DbLanguageId } from './db-languages';
import { ExtensionStorageError } from './extension-storage-error';
import {
  AccentDisplay,
  ContentConfig,
  KeyboardKeys,
  PartOfSpeechDisplay,
} from './content-config';
import {
  ReferenceAbbreviation,
  convertLegacyReference,
  getReferencesForLang,
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
  showPriority?: boolean;
  showRomaji?: boolean;
  readingOnly?: boolean;
  accentDisplay?: AccentDisplay;
  posDisplay?: PartOfSpeechDisplay;
  toggleKey?: string;
  holdToShowKeys?: string;
  keys?: Partial<KeyboardKeys>;
  contextMenuEnable?: boolean;
  noTextHighlight?: boolean;
  dictLang?: DbLanguageId;
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

// The following references were added to Rikaichamp in a later version and so
// we turn them off by default to avoid overwhelming users with too many
// references.
const OFF_BY_DEFAULT_REFERENCES: Set<ReferenceAbbreviation> = new Set([
  'busy_people',
  'kanji_in_context',
  'kodansha_compact',
  'maniette',
]);

export class Config {
  private _settings: Settings = {};
  private _readPromise: Promise<void>;
  private _changeListeners: ChangeCallback[] = [];
  private _previousDefaultLang: DbLanguageId;

  constructor() {
    this._readPromise = this._readSettings();
    this._previousDefaultLang = this.getDefaultLang();

    this.onChange = this.onChange.bind(this);
    browser.storage.onChanged.addListener(this.onChange);

    this.onLanguageChange = this.onLanguageChange.bind(this);
    window.addEventListener('languagechange', this.onLanguageChange);
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
      try {
        await browser.storage.sync.set({
          kanjiReferencesV2: newSettings,
        });
      } catch (_) {
        // If we failed to store the upgraded settings that's fine since at
        // least the in-memory version of the settings has been upgraded.
        // We'll try upgrading the stored settings next time we're loaded
        // anyway.
        console.error('Failed to upgrade kanji references settings');
      }
    }
  }

  get ready(): Promise<void> {
    return this._readPromise;
  }

  async onChange(changes: ChangeDict, areaName: string) {
    if (areaName !== 'sync') {
      return;
    }

    // Re-read settings in case the changes were made by a different instance of
    // this class.
    await this._readSettings();

    // Fill in default setting values
    const updatedChanges: ChangeDict = { ...changes };
    for (const key of Object.keys(updatedChanges)) {
      switch (key) {
        case 'dictLang':
          updatedChanges.dictLang = { ...changes.dictLang };
          if (!updatedChanges.dictLang.newValue) {
            updatedChanges.dictLang.newValue = this.dictLang;
          }
          if (!updatedChanges.dictLang.oldValue) {
            updatedChanges.dictLang.oldValue = this._previousDefaultLang;
          }
          break;

        // Following is just the set of properties we know we actually inspect
        // the `newValue` of. We don't have a convenient means of fetching the
        // default value to fill in the oldValue, but we don't currently need
        // it either.
        case 'popupStyle':
        case 'contextMenuEnable':
        case 'toggleKey':
          updatedChanges[key] = { ...changes[key] };
          if (
            typeof updatedChanges[key].newValue === 'undefined' ||
            updatedChanges[key].newValue === null
          ) {
            updatedChanges[key].newValue = this[key];
          }
          break;
      }
    }

    for (const listener of this._changeListeners) {
      listener(updatedChanges);
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

  // showPriority: Defaults to true

  get showPriority(): boolean {
    return (
      typeof this._settings.showPriority === 'undefined' ||
      this._settings.showPriority
    );
  }

  set showPriority(value: boolean) {
    this._settings.showPriority = value;
    browser.storage.sync.set({ showPriority: value });
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

  // Pitch accent display: Defaults to binary

  get accentDisplay(): AccentDisplay {
    return typeof this._settings.accentDisplay === 'undefined'
      ? 'binary'
      : this._settings.accentDisplay;
  }

  set accentDisplay(value: AccentDisplay) {
    if (
      typeof this._settings.accentDisplay !== 'undefined' &&
      this._settings.accentDisplay === value
    ) {
      return;
    }

    this._settings.accentDisplay = value;
    browser.storage.sync.set({ accentDisplay: value });
  }

  // Part-of-speech display: Defaults to expl

  get posDisplay(): PartOfSpeechDisplay {
    return typeof this._settings.posDisplay === 'undefined'
      ? 'expl'
      : this._settings.posDisplay;
  }

  set posDisplay(value: PartOfSpeechDisplay) {
    if (
      typeof this._settings.posDisplay !== 'undefined' &&
      this._settings.posDisplay === value
    ) {
      return;
    }

    this._settings.posDisplay = value;
    browser.storage.sync.set({ posDisplay: value });
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

  // dictLang: Defaults to the first match from navigator.languages found in
  // dbLanguages, or 'en' otherwise.

  get dictLang(): DbLanguageId {
    return this.useDefaultLang()
      ? this.getDefaultLang()
      : this._settings.dictLang!;
  }

  private useDefaultLang(): boolean {
    // Check that the language that is set is valid. It might be invalid if we
    // deprecated a language or we synced a value from a newer version of the
    // extension.
    if (this._settings.dictLang) {
      return !dbLanguages.includes(this._settings.dictLang);
    }

    return true;
  }

  private getDefaultLang(): DbLanguageId {
    const availableLanguages = new Set(dbLanguages);
    for (const lang of navigator.languages) {
      const langCode = lang.split('-')[0];
      if (availableLanguages.has(langCode as DbLanguageId)) {
        return langCode as DbLanguageId;
      }
    }

    return 'en';
  }

  set dictLang(value: DbLanguageId) {
    if (this._settings.dictLang && this._settings.dictLang === value) {
      return;
    }

    // Note that we don't need to check that `value` is valid since TypeScript
    // does that for us.

    // If the value to set matches the default we clear the setting. This is so
    // that if we later support one of the user's more preferred languages we
    // can update them automatically.
    if (value === this.getDefaultLang()) {
      browser.storage.sync.remove('dictLang').catch(() => {
        Bugsnag.notify(
          new ExtensionStorageError({ key: 'dictLang', action: 'remove' }),
          (event) => {
            event.severity = 'warning';
          }
        );
      });
      delete this._settings.dictLang;
    } else {
      browser.storage.sync.set({ dictLang: value }).catch(() => {
        Bugsnag.notify(
          new ExtensionStorageError({ key: 'dictLang', action: 'set' }),
          (event) => {
            event.severity = 'warning';
          }
        );
      });
      this._settings.dictLang = value;
    }
  }

  onLanguageChange() {
    // If the user's accept-languages setting changed AND we are basing the
    // dictLang value on that we should notify listeners of the change.
    if (!this.useDefaultLang()) {
      return;
    }

    const newValue = this.getDefaultLang();
    if (this._previousDefaultLang !== newValue) {
      const oldValue = this._previousDefaultLang;
      this._previousDefaultLang = newValue;
      const changes: ChangeDict = { dictLang: { newValue, oldValue } };
      for (const listener of this._changeListeners) {
        listener(changes);
      }
    }
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

  // kanjiReferences: Defaults to true for all but a few references
  // that were added more recently.

  get kanjiReferences(): Array<ReferenceAbbreviation> {
    const setValues = this._settings.kanjiReferencesV2 || {};
    const result: Array<ReferenceAbbreviation> = [];
    for (const ref of getReferencesForLang(this.dictLang)) {
      if (typeof setValues[ref] === 'undefined') {
        if (!OFF_BY_DEFAULT_REFERENCES.has(ref)) {
          result.push(ref);
        }
      } else if (setValues[ref]) {
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
      accentDisplay: this.accentDisplay,
      dictLang: this.dictLang,
      holdToShowKeys: this.holdToShowKeys
        ? (this.holdToShowKeys.split('+') as Array<'Ctrl' | 'Alt'>)
        : [],
      kanjiReferences: this.kanjiReferences,
      keys: this.keys,
      noTextHighlight: this.noTextHighlight,
      popupStyle: this.popupStyle,
      posDisplay: this.posDisplay,
      readingOnly: this.readingOnly,
      showPriority: this.showPriority,
      showKanjiComponents: this.showKanjiComponents,
    };
  }
}
