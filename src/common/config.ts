// This is largely a wrapper about the browser.sync.settings API which provides
// following important features:
//
// * Only options that are explicitly set get saved. (This prevents the
//   "FoxClocks problem" where, when you install the FoxClocks add-on on a new
//   computer it sets all the settings to their default values before a sync
//   happens so then all other synchronized computers end up having their
//   settings reset to their default values.)
//
// * Provides a snapshot of all options with their default values filled-in for
//   passing to the content process.
import Bugsnag from '@birchill/bugsnag-zero';
import browser from 'webextension-polyfill';

import { FxLocalData, getLocalFxData } from '../background/fx-data';
import { isObject } from '../utils/is-object';
import { stripFields } from '../utils/strip-fields';
import { isSafari } from '../utils/ua-utils';

import type {
  AccentDisplay,
  AutoExpandableEntry,
  ContentConfigParams,
  FontFace,
  FontSize,
  HighlightStyle,
  KeyboardKeys,
  PartOfSpeechDisplay,
  TabDisplay,
} from './content-config-params';
import { DbLanguageId, dbLanguages } from './db-languages';
import { ExtensionStorageError } from './extension-storage-error';
import { PopupKeys, StoredKeyboardKeys } from './popup-keys';
import { PuckState } from './puck-state';
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
  accentDisplay?: AccentDisplay;
  autoExpand?: Array<AutoExpandableEntry>;
  bunproDisplay?: boolean;
  contextMenuEnable?: boolean;
  copyHeadwords?: 'common' | 'regular';
  copyPos?: 'code' | 'none';
  copySenses?: 'first' | 'all';
  dictLang?: DbLanguageId;
  enableTapLookup?: boolean;
  fontFace?: FontFace;
  fontSize?: FontSize;
  fxCurrency?: string;
  highlightStyle?: HighlightStyle;
  holdToShowKeys?: string;
  holdToShowImageKeys?: string;
  kanjiReferencesV2?: KanjiReferenceFlagsV2;
  keys?: Partial<StoredKeyboardKeys>;
  localSettings?: {
    canHover?: boolean;
    popupInteractive?: boolean;
    showPuck?: 'show' | 'hide';
    puckState?: PuckState;
  };
  noTextHighlight?: boolean;
  popupStyle?: string;
  posDisplay?: PartOfSpeechDisplay;
  preferredUnits?: 'metric' | 'imperial';
  readingOnly?: boolean;
  showKanjiComponents?: boolean;
  showPriority?: boolean;
  showRomaji?: boolean;
  tabDisplay?: TabDisplay;
  toolbarIcon?: 'default' | 'sky';
  waniKaniVocabDisplay?: 'hide' | 'show-matches';
}

type StorageChange = { oldValue?: any; newValue?: any };
type ChangeDict = { [field: string]: StorageChange };
export type ChangeCallback = (changes: ChangeDict) => void;

// The following references were added to this extension in a later version and
// so we turn them off by default to avoid overwhelming users with too many
// references.
const OFF_BY_DEFAULT_REFERENCES: Set<ReferenceAbbreviation> = new Set([
  'busy_people',
  'kanji_in_context',
  'kodansha_compact',
  'maniette',
  'wk',
]);

export class Config {
  private fxData: FxLocalData | undefined;
  private settings: Settings = {};
  private readyPromise: Promise<void>;
  private changeListeners: ChangeCallback[] = [];
  private previousDefaultLang: DbLanguageId;

  constructor() {
    this.readyPromise = this.readSettings().then(async () => {
      this.fxData = await getLocalFxData(this.onFxDataChange.bind(this));
    });
    this.previousDefaultLang = this.getDefaultLang();

    this.onChange = this.onChange.bind(this);
    browser.storage.onChanged.addListener(this.onChange);

    this.onLanguageChange = this.onLanguageChange.bind(this);
    self.addEventListener('languagechange', this.onLanguageChange);
  }

  private async readSettings() {
    let settings;
    try {
      settings = await browser.storage.sync.get(null);
    } catch {
      settings = {};
    }
    try {
      settings.localSettings = (
        await browser.storage.local.get('settings')
      ).settings;
    } catch {
      // Ignore
    }
    this.settings = settings;
    await this.upgradeSettings();
  }

  private async upgradeSettings() {
    // If we have old kanji reference settings but not new ones, upgrade them.
    if (
      this.settings.hasOwnProperty('kanjiReferences') &&
      !this.settings.kanjiReferencesV2
    ) {
      const newSettings: KanjiReferenceFlagsV2 = {};
      const existingSettings: { [key: string]: boolean } = (
        this.settings as any
      ).kanjiReferences;
      for (const [ref, enabled] of Object.entries(existingSettings)) {
        const newRef = convertLegacyReference(ref);
        if (newRef) {
          newSettings[newRef] = enabled;
        }
      }

      this.settings.kanjiReferencesV2 = newSettings;
      try {
        await browser.storage.sync.set({ kanjiReferencesV2: newSettings });
      } catch {
        // If we failed to store the upgraded settings that's fine since at
        // least the in-memory version of the settings has been upgraded.
        // We'll try upgrading the stored settings next time we're loaded
        // anyway.
        console.error('Failed to upgrade kanji references settings');
      }
    }

    // If we have old mouse onboarding prefs, drop them
    if (this.settings.hasOwnProperty('hasDismissedMouseOnboarding')) {
      try {
        await browser.storage.sync.remove('hasDismissedMouseOnboarding');
      } catch {
        // Ignore
      }
    }

    if (
      this.settings.localSettings?.hasOwnProperty('hasUpgradedFromPreMouse') ||
      this.settings.localSettings?.hasOwnProperty(
        'numLookupsWithMouseOnboarding'
      )
    ) {
      const localSettings = { ...this.settings.localSettings };
      delete (localSettings as Record<string, unknown>).hasUpgradedFromPreMouse;
      delete (localSettings as Record<string, unknown>)
        .numLookupsWithMouseOnboarding;
      this.settings.localSettings = localSettings;
      try {
        await browser.storage.local.set({ settings: localSettings });
      } catch {
        // Ignore
      }
    }
  }

  get ready(): Promise<void> {
    return this.readyPromise;
  }

  private async onChange(changes: ChangeDict, areaName: string) {
    // Safari bug https://bugs.webkit.org/show_bug.cgi?id=281644 means that
    // `areaName` is undefined in Safari 18.
    if (!isSafari() && areaName !== 'sync' && areaName !== 'local') {
      return;
    }

    // Re-read settings in case the changes were made by a different instance of
    // this class.
    await this.readSettings();

    // Extract the changes in a suitable form
    //
    // We should be able to key this on `areaName` but since Safari 18 doesn't
    // set that properly, we have to inspect the actual changes instead.
    let updatedChanges = { ...changes };
    if (typeof updatedChanges.settings !== 'undefined') {
      const localSettings = updatedChanges.settings;
      delete updatedChanges.settings;
      updatedChanges = {
        ...updatedChanges,
        ...this.extractLocalSettingChanges(localSettings),
      };
    }

    // Fill in default setting values
    for (const key of Object.keys(updatedChanges)) {
      switch (key) {
        case 'dictLang':
          updatedChanges.dictLang = { ...changes.dictLang };
          if (!updatedChanges.dictLang.newValue) {
            updatedChanges.dictLang.newValue = this.dictLang;
          }
          if (!updatedChanges.dictLang.oldValue) {
            updatedChanges.dictLang.oldValue = this.previousDefaultLang;
          }
          break;

        // Following is just the set of properties we know we actually inspect
        // the `newValue` of. We don't have a convenient means of fetching the
        // default value to fill in the oldValue, but we don't currently need
        // it either.
        case 'contextMenuEnable':
        case 'popupStyle':
        case 'toolbarIcon':
          updatedChanges[key] = { ...changes[key] };
          if (
            typeof updatedChanges[key].newValue === 'undefined' ||
            updatedChanges[key].newValue === null
          ) {
            updatedChanges[key].newValue = this[key];
          }
          break;

        // Rename the kanji reference key since the name we use to store it
        // differs from the name we expose via our API.
        case 'kanjiReferencesV2':
          updatedChanges.kanjiReferences = changes.kanjiReferencesV2;
          delete updatedChanges.kanjiReferencesV2;
          break;

        // In some cases, the pinPopup key is calculated from the holdToShowKeys
        // value so we might need to report that too.
        case 'holdToShowKeys':
          // If...
          if (
            // We are already reporting a change to `keys`, or
            Object.keys(updatedChanges).includes('keys') ||
            // The pinPopup key is already explicitly set
            this.settings.keys?.pinPopup
          ) {
            // ... we don't need to report a change
            break;
          }
          updatedChanges.keys = { newValue: this.keys };
          break;
      }
    }

    if (!Object.keys(updatedChanges).length) {
      return;
    }

    Bugsnag.leaveBreadcrumb('Settings change', updatedChanges);

    for (const listener of this.changeListeners) {
      listener(updatedChanges);
    }
  }

  private async onFxDataChange(fxData: FxLocalData) {
    this.fxData = fxData;

    const updatedChanges: ChangeDict = {
      fxCurrencies: { newValue: this.fxCurrencies },
      fx: { newValue: this.contentConfig.fx },
    };

    for (const listener of this.changeListeners) {
      listener(updatedChanges);
    }
  }

  private extractLocalSettingChanges(
    settingsChange: StorageChange
  ): ChangeDict {
    if (!isObject(settingsChange)) {
      return {};
    }

    const settings = [
      ...new Set([
        ...Object.keys(settingsChange.newValue || {}),
        ...Object.keys(settingsChange.oldValue || {}),
      ]),
    ];

    const result: ChangeDict = {};
    for (const setting of settings) {
      result[setting] = {
        newValue: settingsChange.newValue?.[setting],
        oldValue: settingsChange.oldValue?.[setting],
      };
    }

    return result;
  }

  addChangeListener(callback: ChangeCallback) {
    if (this.changeListeners.indexOf(callback) !== -1) {
      return;
    }
    this.changeListeners.push(callback);
  }

  removeChangeListener(callback: ChangeCallback) {
    const index = this.changeListeners.indexOf(callback);
    if (index === -1) {
      return;
    }
    this.changeListeners.splice(index, 1);
  }

  //
  // Property accessors
  //

  // Ultimately we want to do away with all this boilerplate and use decorators
  // to generate this code.
  //
  // Something like:
  //
  //   function syncedPref<T>(defaultValue: T) {
  //     return (
  //       _value: {
  //         get: () => T;
  //         set: (value: T) => void;
  //       },
  //       context: {
  //         kind: 'accessor';
  //         name: keyof Settings;
  //         static: boolean;
  //         private: boolean;
  //         access: {
  //           get: (object: Config) => T;
  //           set: (object: Config, value: T) => void;
  //         };
  //         addInitializer(initializer: () => void): void;
  //       }
  //     ): {
  //       get?: (this: Config) => T;
  //       set?: (this: Config, value: unknown) => void;
  //       init?: (this: Config, initialValue: T) => T;
  //     } | void => {
  //       return {
  //         get: () => this.settings[context.name] ?? defaultValue,
  //         set: (value: T) => {
  //           if (this.settings[context.name] === value) {
  //             return;
  //           }
  //
  //           if (value === defaultValue) {
  //             delete this.settings[context.name];
  //             void browser.storage.sync.remove(context.name);
  //           } else {
  //             this.settings[context.name] = value;
  //             void browser.storage.sync.set({ [context.name]: value });
  //           }
  //         },
  //       };
  //     };
  //   }
  //
  // Usage:
  //
  //   @syncedPref<'common' | 'regular' | undefined>('regular')
  //   accessor copyHeadwords: 'common' | 'regular' | undefined;
  //
  // (Come to think of it, once we do that each accessor will have its own
  // storage so we can skip writing to this.settings and just use
  // _value.get.call(this) etc.)
  //
  // (Also, we should make the generated getter/setter exclude `undefined` from
  // `T`).
  //
  // Unfortunately, while TypeScript can transpile that, we use vitest for our
  // unit tests which uses esbuild under the hood which doesn't yet support
  // decorators and in any case, won't transpile them:
  //
  //   https://github.com/evanw/esbuild/issues/104
  //
  // UPDATE: Looks like support was added for decorators as of esbuild v0.21.3
  // https://github.com/evanw/esbuild/releases/tag/v0.21.3
  //
  // Our options are either to use SWC (which runs the risk of behaving a bit
  // differently to TypeScript) or try to get TSC to transpile the relevant
  // files, e.g. using https://github.com/thomaschaaf/esbuild-plugin-tsc
  //
  // Unfortunately apparently vitest doesn't support esbuild plugins so that
  // last option probably won't work.
  //
  // Decorators are being implemented in browsers (e.g. Firefox bug:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1781212) so one day they should
  // be available in esbuild and vitest too.

  // accentDisplay: Defaults to binary

  get accentDisplay(): AccentDisplay {
    return typeof this.settings.accentDisplay === 'undefined'
      ? 'binary'
      : this.settings.accentDisplay;
  }

  set accentDisplay(value: AccentDisplay) {
    if (
      typeof this.settings.accentDisplay !== 'undefined' &&
      this.settings.accentDisplay === value
    ) {
      return;
    }

    this.settings.accentDisplay = value;
    void browser.storage.sync.set({ accentDisplay: value });
  }

  // autoExpand: Defaults to an empty array

  get autoExpand(): Array<AutoExpandableEntry> {
    return typeof this.settings.autoExpand === 'undefined'
      ? []
      : [...new Set(this.settings.autoExpand)];
  }

  toggleAutoExpand(type: AutoExpandableEntry, value: boolean) {
    const enabled = new Set(this.settings.autoExpand);
    if (value === enabled.has(type)) {
      return;
    }

    if (value) {
      enabled.add(type);
    } else {
      enabled.delete(type);
    }

    if (enabled.size) {
      this.settings.autoExpand = [...enabled];
      void browser.storage.sync.set({ autoExpand: [...enabled] });
    } else {
      delete this.settings.autoExpand;
      void browser.storage.sync.remove('autoExpand');
    }
  }

  // canHover (local): Defaults to true

  get canHover(): boolean {
    return this.settings.localSettings?.canHover ?? true;
  }

  set canHover(value: boolean) {
    const storedSetting = this.settings.localSettings?.canHover;
    if (storedSetting === value || (storedSetting === undefined && value)) {
      return;
    }

    const localSettings = { ...this.settings.localSettings };
    if (value) {
      delete localSettings.canHover;
    } else {
      localSettings.canHover = false;
    }
    this.settings.localSettings = localSettings;
    void browser.storage.local.set({ settings: localSettings });
  }

  // bunproDisplay: Defaults to false

  get bunproDisplay(): boolean {
    return !!this.settings.bunproDisplay;
  }

  set bunproDisplay(value: boolean) {
    if (this.settings.bunproDisplay === (value || undefined)) {
      return;
    }

    if (!value) {
      delete this.settings.bunproDisplay;
      void browser.storage.sync.remove('bunproDisplay');
    } else {
      this.settings.bunproDisplay = value;
      void browser.storage.sync.set({ bunproDisplay: value });
    }
  }

  // contextMenuEnable: Defaults to true

  get contextMenuEnable(): boolean {
    return (
      typeof this.settings.contextMenuEnable === 'undefined' ||
      this.settings.contextMenuEnable
    );
  }

  set contextMenuEnable(value: boolean) {
    if (
      typeof this.settings.contextMenuEnable !== 'undefined' &&
      this.settings.contextMenuEnable === value
    ) {
      return;
    }

    this.settings.contextMenuEnable = value;
    void browser.storage.sync.set({ contextMenuEnable: value });
  }

  // copyHeadwords: Defaults to 'regular'

  get copyHeadwords(): 'common' | 'regular' {
    return this.settings.copyHeadwords || 'regular';
  }

  set copyHeadwords(value: 'common' | 'regular') {
    if (this.settings.copyHeadwords === value) {
      return;
    }

    if (value === 'regular') {
      delete this.settings.copyHeadwords;
      void browser.storage.sync.remove('copyHeadwords');
    } else {
      this.settings.copyHeadwords = value;
      void browser.storage.sync.set({ copyHeadwords: value });
    }
  }

  // copyPos: Defaults to 'code'

  get copyPos(): 'code' | 'none' {
    return this.settings.copyPos || 'code';
  }

  set copyPos(value: 'code' | 'none') {
    if (this.settings.copyPos === value) {
      return;
    }

    if (value === 'code') {
      delete this.settings.copyPos;
      void browser.storage.sync.remove('copyPos');
    } else {
      this.settings.copyPos = value;
      void browser.storage.sync.set({ copyPos: value });
    }
  }

  // copySenses: Defaults to 'all'

  get copySenses(): 'first' | 'all' {
    return this.settings.copySenses || 'all';
  }

  set copySenses(value: 'first' | 'all') {
    if (this.settings.copySenses === value) {
      return;
    }

    if (value === 'all') {
      delete this.settings.copySenses;
      void browser.storage.sync.remove('copySenses');
    } else {
      this.settings.copySenses = value;
      void browser.storage.sync.set({ copySenses: value });
    }
  }

  // dictLang: Defaults to the first match from navigator.languages found in
  // dbLanguages, or 'en' otherwise.

  get dictLang(): DbLanguageId {
    return this.useDefaultLang()
      ? this.getDefaultLang()
      : this.settings.dictLang!;
  }

  set dictLang(value: DbLanguageId) {
    if (this.settings.dictLang && this.settings.dictLang === value) {
      return;
    }

    // Note that we don't need to check that `value` is valid since TypeScript
    // does that for us.

    // If the value to set matches the default we clear the setting. This is so
    // that if we later support one of the user's more preferred languages we
    // can update them automatically.
    if (value === this.getDefaultLang()) {
      browser.storage.sync.remove('dictLang').catch((e) => {
        void Bugsnag.notify(
          new ExtensionStorageError(
            { key: 'dictLang', action: 'remove' },
            { cause: e }
          ),
          { severity: 'warning' }
        );
      });
      delete this.settings.dictLang;
    } else {
      browser.storage.sync.set({ dictLang: value }).catch((e) => {
        void Bugsnag.notify(
          new ExtensionStorageError(
            { key: 'dictLang', action: 'set' },
            { cause: e }
          ),
          { severity: 'warning' }
        );
      });
      this.settings.dictLang = value;
    }
  }

  private useDefaultLang(): boolean {
    // Check that the language that is set is valid. It might be invalid if we
    // deprecated a language or we synced a value from a newer version of the
    // extension.
    if (this.settings.dictLang) {
      return !dbLanguages.includes(this.settings.dictLang);
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

  onLanguageChange() {
    // If the user's accept-languages setting changed AND we are basing the
    // dictLang value on that we should notify listeners of the change.
    if (!this.useDefaultLang()) {
      return;
    }

    const newValue = this.getDefaultLang();
    if (this.previousDefaultLang !== newValue) {
      const oldValue = this.previousDefaultLang;
      this.previousDefaultLang = newValue;
      const changes: ChangeDict = { dictLang: { newValue, oldValue } };
      for (const listener of this.changeListeners) {
        listener(changes);
      }
    }
  }

  // enableTapLookup: Defaults to true

  get enableTapLookup(): boolean {
    return this.settings.enableTapLookup ?? true;
  }

  set enableTapLookup(value: boolean) {
    const storedSetting = this.settings.enableTapLookup;
    if (storedSetting === value) {
      return;
    }

    if (value) {
      void browser.storage.sync.remove('enableTapLookup');
      delete this.settings.enableTapLookup;
    } else {
      void browser.storage.sync.set({ enableTapLookup: value });
      this.settings.enableTapLookup = value;
    }
  }

  // fontFace: Defaults to 'bundled'

  get fontFace(): FontFace {
    return this.settings.fontFace === undefined
      ? 'bundled'
      : this.settings.fontFace;
  }

  set fontFace(value: FontFace) {
    if (
      (this.settings.fontFace !== undefined &&
        this.settings.fontFace === value) ||
      (typeof this.settings.fontFace === 'undefined' && value === 'bundled')
    ) {
      return;
    }

    if (value !== 'bundled') {
      this.settings.fontFace = value;
      void browser.storage.sync.set({ fontFace: value });
    } else {
      this.settings.fontFace = undefined;
      void browser.storage.sync.remove('fontFace');
    }
  }

  // fontSize: Defaults to normal

  get fontSize(): FontSize {
    return typeof this.settings.fontSize === 'undefined'
      ? 'normal'
      : this.settings.fontSize;
  }

  set fontSize(value: FontSize) {
    if (
      typeof this.settings.fontSize !== 'undefined' &&
      this.settings.fontSize === value
    ) {
      return;
    }

    if (value === 'normal') {
      this.settings.fontSize = undefined;
      void browser.storage.sync.remove('fontSize');
    } else {
      this.settings.fontSize = value;
      void browser.storage.sync.set({ fontSize: value });
    }
  }

  // fxCurrency: Defaults to USD

  get fxCurrency(): string {
    return typeof this.settings.fxCurrency === 'string'
      ? this.settings.fxCurrency
      : 'USD';
  }

  set fxCurrency(value: string) {
    const storedSetting = this.settings.fxCurrency;
    if (value === storedSetting) {
      return;
    }

    // Unlike many other settings, we don't reset the setting if the user
    // chooses the default value ('USD') since in this case we treat it as an
    // explicit signal they want currencies displayed in USD even if we later
    // change the default.
    void browser.storage.sync.set({ fxCurrency: value });
    this.settings.fxCurrency = value;
  }

  get fxCurrencies(): Array<string> | undefined {
    return this.fxData
      ? Object.keys(this.fxData.rates).sort((a, b) => a.localeCompare(b))
      : undefined;
  }

  // highlightStyle: Defaults to 'yellow'

  get highlightStyle(): HighlightStyle {
    return this.settings.highlightStyle ?? 'yellow';
  }

  set highlightStyle(value: HighlightStyle) {
    if (this.highlightStyle === value) {
      return;
    }

    if (value === 'yellow') {
      this.settings.highlightStyle = undefined;
      void browser.storage.sync.remove('highlightStyle');
    } else {
      this.settings.highlightStyle = value;
      void browser.storage.sync.set({ highlightStyle: value });
    }
  }

  // holdToShowKeys: Defaults to null

  get holdToShowKeys(): string | null {
    return typeof this.settings.holdToShowKeys === 'string'
      ? this.settings.holdToShowKeys
      : null;
  }

  set holdToShowKeys(value: string | null) {
    const storedSetting = this.settings.holdToShowKeys || null;
    if (value === storedSetting) {
      return;
    }

    if (value === null) {
      void browser.storage.sync.remove('holdToShowKeys');
      delete this.settings.holdToShowKeys;
    } else {
      void browser.storage.sync.set({ holdToShowKeys: value });
      this.settings.holdToShowKeys = value;
    }

    // If holdToShowImageKeys was mirroring this setting, save the previous
    // value as its own value.
    if (typeof this.settings.holdToShowImageKeys === 'undefined') {
      this.holdToShowImageKeys = storedSetting;
    }
    // Otherwise, if we have cleared this setting and holdToShowImageKeys was
    // storing 'none' just to differentiate itself from us, we can clear that
    // stored value now.
    else if (!value && this.settings.holdToShowImageKeys === 'none') {
      this.holdToShowImageKeys = null;
    }
  }

  // holdToShowImageKeys: Default is... complicated.
  //
  // This setting was introduced after the "holdToShowKeys" setting was
  // introduced and we want the default behavior to be:
  //
  // - For new users, nothing, since that's the default for "holdToShow" keys
  //   and it makes sense to surface this by default and let users who find it
  //   annoying turn it off.
  //
  // - For users who have previously configured a "holdToShowKeys" setting,
  //   the same value as the "holdToShowKeys" setting since previously that
  //   setting controlled this behavior.
  //
  // But how do we distinguish between a user who has previously configured the
  // "holdToShowKeys" setting (meaning we should mirror that value here) vs one
  // who has configured the "holdToShowKeys" setting _since_ this setting was
  // introduced and deliberately wants different behavior to that setting?
  //
  // We achieve that by deliberately storing "none" as the value for this
  // setting any time we alter the "holdToShowKeys" setting while this is null.

  get holdToShowImageKeys(): string | null {
    // If there is an explicit setting for this value, use that.
    if (typeof this.settings.holdToShowImageKeys === 'string') {
      return this.settings.holdToShowImageKeys === 'none'
        ? null
        : this.settings.holdToShowImageKeys;
    }

    // Otherwise, mirror the holdToShowKeys setting
    return this.holdToShowKeys;
  }

  set holdToShowImageKeys(value: string | null) {
    // If this is null AND holdToShowKeys is null, then we can clear the local
    // setting. We only need to store 'none' if holdToShowKeys is set (in order
    // to ensure we DON'T mirror that setting).
    const settingToStore =
      value === null && this.holdToShowKeys ? 'none' : value;

    // Ignore null-op changes
    const storedSetting = this.settings.holdToShowImageKeys || null;
    if (settingToStore === storedSetting) {
      return;
    }

    if (settingToStore === null) {
      void browser.storage.sync.remove('holdToShowImageKeys');
      delete this.settings.holdToShowImageKeys;
    } else {
      void browser.storage.sync.set({ holdToShowImageKeys: settingToStore });
      this.settings.holdToShowImageKeys = settingToStore;
    }
  }

  // kanjiReferences: Defaults to true for all but a few references
  // that were added more recently.

  get kanjiReferences(): Array<ReferenceAbbreviation> {
    const setValues = this.settings.kanjiReferencesV2 || {};
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
    const existingSettings = this.settings.kanjiReferencesV2 || {};
    this.settings.kanjiReferencesV2 = {
      ...existingSettings,
      ...updatedReferences,
    };
    void browser.storage.sync.set({
      kanjiReferencesV2: this.settings.kanjiReferencesV2,
    });
  }

  // keys: Defaults are defined by DEFAULT_KEY_SETTINGS, and particularly the
  // enabledKeys member.

  private getDefaultEnabledKeys(): StoredKeyboardKeys {
    return PopupKeys.reduce<Partial<StoredKeyboardKeys>>(
      (defaultKeys, setting) => {
        defaultKeys[setting.name] = setting.enabledKeys;
        return defaultKeys;
      },
      {}
    ) as StoredKeyboardKeys;
  }

  get keys(): StoredKeyboardKeys {
    const setValues = this.settings.keys || {};
    const keys = { ...this.getDefaultEnabledKeys(), ...setValues };

    // If there is no key set for the pin popup key, but there _is_ a suitable
    // hold-to-show key set, we should use that as the default value.
    //
    // (Note that all this complexity might be meaningless. At least on Firefox
    // on Windows, no one in their right mind would configure Alt as their
    // hold-to-show key. Every time you release it the menu pops up!)
    if (!('pinPopup' in setValues)) {
      // Hold-to-show keys contains a string like `Alt+Ctrl` but we can only
      // re-use the hold-to-show keys when it's a single item like 'Alt'.
      const holdToShowKeys = this.holdToShowKeys?.split('+');
      if (holdToShowKeys?.length === 1) {
        const holdToShowKey = holdToShowKeys[0];
        const availableKeys = PopupKeys.find((k) => k.name === 'pinPopup');
        if (availableKeys?.keys.includes(holdToShowKey)) {
          keys.pinPopup = [holdToShowKey];
        }
      }
    }

    // When we first released the `expandPopup` key ('x') we didn't notice
    // that it was already possible to assign 'x' to `closePopup`.
    //
    // We _could_ try to make it so that if you assign 'x' to `expandPopup` we
    // remove it from `closePopup`. But it might be slightly more useful to
    // allow it to be assigned to both and simply report it as being assigned to
    // `closePopup` in that case.
    //
    // That has the advantages that:
    //
    // 1. If you go to enable it for `closePopup` and notice that doing so
    //    clears it from `expandPopup`, you can just untick it from `closePopup`
    //    and it will automatically be restored to `expandPopup`.
    //
    // 2. We need to handle the case when they're both selected anyway since
    //    it's already possible to get it into that state in a released version.
    if (keys.expandPopup.includes('x') && keys.closePopup.includes('x')) {
      keys.expandPopup = keys.expandPopup.filter((k) => k !== 'x');
    }

    return keys;
  }

  get keysNormalized(): KeyboardKeys {
    const storedKeys = this.keys;
    const [down, up] = this.keys.movePopupDownOrUp
      .map((key) => key.split(',', 2))
      .reduce<[Array<string>, Array<string>]>(
        ([existingDown, existingUp], [down, up]) => [
          [...existingDown, down],
          [...existingUp, up],
        ],
        [[], []]
      );

    return {
      ...stripFields(storedKeys, ['movePopupDownOrUp']),
      movePopupDown: down,
      movePopupUp: up,
    };
  }

  updateKeys(keys: Partial<StoredKeyboardKeys>) {
    const existingSettings = this.settings.keys || {};
    this.settings.keys = { ...existingSettings, ...keys };

    void browser.storage.sync.set({ keys: this.settings.keys });
  }

  // noTextHighlight: Defaults to false

  get noTextHighlight(): boolean {
    return !!this.settings.noTextHighlight;
  }

  set noTextHighlight(value: boolean) {
    if (
      typeof this.settings.noTextHighlight !== 'undefined' &&
      this.settings.noTextHighlight === value
    ) {
      return;
    }

    this.settings.noTextHighlight = value;
    void browser.storage.sync.set({ noTextHighlight: value });
  }

  // popupInteractive (local): Defaults to true

  get popupInteractive(): boolean {
    return this.settings.localSettings?.popupInteractive ?? true;
  }

  set popupInteractive(value: boolean) {
    const storedSetting = this.settings.localSettings?.popupInteractive;
    if (storedSetting === value) {
      return;
    }

    const localSettings = { ...this.settings.localSettings };
    if (value) {
      delete localSettings.popupInteractive;
    } else {
      localSettings.popupInteractive = false;
    }
    this.settings.localSettings = localSettings;
    void browser.storage.local.set({ settings: localSettings });
  }

  // popupStyle: Defaults to 'default'

  get popupStyle(): string {
    return typeof this.settings.popupStyle === 'undefined'
      ? 'default'
      : this.settings.popupStyle;
  }

  set popupStyle(value: string) {
    if (
      (typeof this.settings.popupStyle !== 'undefined' &&
        this.settings.popupStyle === value) ||
      (typeof this.settings.popupStyle === 'undefined' && value === 'default')
    ) {
      return;
    }

    if (value !== 'default') {
      this.settings.popupStyle = value;
      void browser.storage.sync.set({ popupStyle: value });
    } else {
      this.settings.popupStyle = undefined;
      void browser.storage.sync.remove('popupStyle');
    }
  }

  // posDisplay: Defaults to expl

  get posDisplay(): PartOfSpeechDisplay {
    return typeof this.settings.posDisplay === 'undefined'
      ? 'expl'
      : this.settings.posDisplay;
  }

  set posDisplay(value: PartOfSpeechDisplay) {
    if (
      typeof this.settings.posDisplay !== 'undefined' &&
      this.settings.posDisplay === value
    ) {
      return;
    }

    this.settings.posDisplay = value;
    void browser.storage.sync.set({ posDisplay: value });
  }

  // preferredUnits: Defaults to 'metric'

  get preferredUnits(): 'metric' | 'imperial' {
    return this.settings.preferredUnits || 'metric';
  }

  set preferredUnits(value: 'metric' | 'imperial') {
    if (this.settings.preferredUnits === value) {
      return;
    }

    this.settings.preferredUnits = value;
    void browser.storage.sync.set({ preferredUnits: value });
  }

  // readingOnly: Defaults to false

  get readingOnly(): boolean {
    return !!this.settings.readingOnly;
  }

  set readingOnly(value: boolean) {
    if (
      typeof this.settings.readingOnly !== 'undefined' &&
      this.settings.readingOnly === value
    ) {
      return;
    }

    this.settings.readingOnly = value;
    void browser.storage.sync.set({ readingOnly: value });
  }

  toggleReadingOnly() {
    this.readingOnly = !this.settings.readingOnly;
  }

  // showKanjiComponents: Defaults to true

  get showKanjiComponents(): boolean {
    return (
      typeof this.settings.showKanjiComponents === 'undefined' ||
      this.settings.showKanjiComponents
    );
  }

  set showKanjiComponents(value: boolean) {
    this.settings.showKanjiComponents = value;
    void browser.storage.sync.set({ showKanjiComponents: value });
  }

  // showPriority: Defaults to true

  get showPriority(): boolean {
    return (
      typeof this.settings.showPriority === 'undefined' ||
      this.settings.showPriority
    );
  }

  set showPriority(value: boolean) {
    this.settings.showPriority = value;
    void browser.storage.sync.set({ showPriority: value });
  }

  // showPuck (local): Defaults to 'auto'

  get showPuck(): 'show' | 'hide' | 'auto' {
    return this.settings.localSettings?.showPuck || 'auto';
  }

  set showPuck(value: 'show' | 'hide' | 'auto') {
    const storedSetting = this.settings.localSettings?.showPuck || 'auto';
    if (storedSetting === value) {
      return;
    }

    const localSettings = { ...this.settings.localSettings };
    if (value === 'auto') {
      delete localSettings.showPuck;
    } else {
      localSettings.showPuck = value;
    }
    this.settings.localSettings = localSettings;

    // If value is 'hide' we should reset the puck state but since that writes
    // to the same key in local storage we should wait for the current write to
    // complete first.
    void browser.storage.local.set({ settings: localSettings }).finally(() => {
      if (value === 'hide') {
        this.puckState = undefined;
      }
    });
  }

  get computedShowPuck(): 'show' | 'hide' {
    return this.showPuck !== 'auto'
      ? this.showPuck
      : this.canHover
        ? 'hide'
        : 'show';
  }

  // Puck state (local): Defaults to undefined

  get puckState(): PuckState | undefined {
    return this.settings.localSettings?.puckState;
  }

  set puckState(value: PuckState | undefined) {
    const storedSetting = this.settings.localSettings?.puckState;
    if (JSON.stringify(storedSetting) === JSON.stringify(value)) {
      return;
    }

    const localSettings = { ...this.settings.localSettings };
    if (!value) {
      delete localSettings.puckState;
    } else {
      localSettings.puckState = value;
    }
    this.settings.localSettings = localSettings;

    void browser.storage.local.set({ settings: localSettings });
  }

  // showRomaji: Defaults to false

  get showRomaji(): boolean {
    return !!this.settings.showRomaji;
  }

  set showRomaji(value: boolean) {
    if (this.settings.showRomaji === value) {
      return;
    }

    if (!value) {
      delete this.settings.showRomaji;
      void browser.storage.sync.remove('showRomaji');
    } else {
      this.settings.showRomaji = value;
      void browser.storage.sync.set({ showRomaji: value });
    }
  }

  // waniKaniVocabDisplay: Defaults to 'hide'

  get waniKaniVocabDisplay(): 'hide' | 'show-matches' {
    return this.settings.waniKaniVocabDisplay || 'hide';
  }

  set waniKaniVocabDisplay(value: 'hide' | 'show-matches') {
    if (this.settings.waniKaniVocabDisplay === value) {
      return;
    }

    if (value === 'hide') {
      delete this.settings.waniKaniVocabDisplay;
      void browser.storage.sync.remove('waniKaniVocabDisplay');
    } else {
      this.settings.waniKaniVocabDisplay = value;
      void browser.storage.sync.set({ waniKaniVocabDisplay: value });
    }
  }

  // tabDisplay: Defaults to 'top'

  get tabDisplay(): TabDisplay {
    return typeof this.settings.tabDisplay === 'undefined'
      ? 'top'
      : this.settings.tabDisplay;
  }

  set tabDisplay(value: TabDisplay) {
    if (
      (typeof this.settings.tabDisplay !== 'undefined' &&
        this.settings.tabDisplay === value) ||
      (typeof this.settings.tabDisplay === 'undefined' && value === 'top')
    ) {
      return;
    }

    if (value !== 'top') {
      this.settings.tabDisplay = value;
      void browser.storage.sync.set({ tabDisplay: value });
    } else {
      this.settings.tabDisplay = undefined;
      void browser.storage.sync.remove('tabDisplay');
    }
  }

  // toolbarIcon: Defaults to 'default'

  get toolbarIcon(): 'default' | 'sky' {
    return typeof this.settings.toolbarIcon === 'undefined'
      ? 'default'
      : this.settings.toolbarIcon;
  }

  set toolbarIcon(value: 'default' | 'sky') {
    if (
      (typeof this.settings.toolbarIcon !== 'undefined' &&
        this.settings.toolbarIcon === value) ||
      (typeof this.settings.toolbarIcon === 'undefined' && value === 'default')
    ) {
      return;
    }

    if (value !== 'default') {
      this.settings.toolbarIcon = value;
      void browser.storage.sync.set({ toolbarIcon: value });
    } else {
      this.settings.toolbarIcon = undefined;
      void browser.storage.sync.remove('toolbarIcon');
    }
  }

  // Get all the options the content process cares about at once
  get contentConfig(): ContentConfigParams {
    return {
      accentDisplay: this.accentDisplay,
      autoExpand: this.autoExpand,
      bunproDisplay: this.bunproDisplay,
      copyHeadwords: this.copyHeadwords,
      copyPos: this.copyPos,
      copySenses: this.copySenses,
      dictLang: this.dictLang,
      enableTapLookup: this.enableTapLookup,
      fx:
        this.fxData && this.fxCurrency in this.fxData.rates
          ? {
              currency: this.fxCurrency,
              rate: this.fxData.rates[this.fxCurrency],
              timestamp: this.fxData.timestamp,
            }
          : undefined,
      fontFace: this.fontFace,
      fontSize: this.fontSize,
      highlightStyle: this.highlightStyle,
      holdToShowKeys: this.holdToShowKeys
        ? (this.holdToShowKeys.split('+') as Array<'Ctrl' | 'Alt'>)
        : [],
      holdToShowImageKeys: this.holdToShowImageKeys
        ? (this.holdToShowImageKeys.split('+') as Array<'Ctrl' | 'Alt'>)
        : [],
      kanjiReferences: this.kanjiReferences,
      keys: this.keysNormalized,
      noTextHighlight: this.noTextHighlight,
      popupInteractive: this.popupInteractive,
      popupStyle: this.popupStyle,
      posDisplay: this.posDisplay,
      preferredUnits: this.preferredUnits,
      puckState: this.puckState,
      readingOnly: this.readingOnly,
      showKanjiComponents: this.showKanjiComponents,
      showPriority: this.showPriority,
      showPuck: this.showPuck,
      showRomaji: this.showRomaji,
      tabDisplay: this.tabDisplay,
      toolbarIcon: this.toolbarIcon,
      waniKaniVocabDisplay: this.waniKaniVocabDisplay,
    };
  }
}
