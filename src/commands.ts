import { browser } from 'webextension-polyfill-ts';

export interface CommandParams {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  macCtrl?: boolean;
  key: string;
}

//
// Normally we don't want to allow MacCtrl because it doesn't sync well across
// platforms. However, in order to provide a better experience on Safari (and
// because Safari doesn't generally need to worry about syncing keyboard
// shortcuts cross-platform) we allow it there.
//
// For other platforms we simply hide the controls that would allow setting it.
//
const PRIMARY_MODIFIER_KEYS = ['Ctrl', 'Alt', 'MacCtrl'];

const SECONDARY_MODIFIER_KEYS = ['Ctrl', 'Alt', 'Shift', 'MacCtrl'];

const MEDIA_KEYS = [
  'MediaNextTrack',
  'MediaPlayPause',
  'MediaPrevTrack',
  'MediaStop',
];

const SPECIAL_KEYS = [
  'Comma',
  'Period',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Space',
  'Insert',
  'Delete',
  'Up',
  'Down',
  'Left',
  'Right',
];

const isFunctionKey = (key: string): boolean => /^F([1-9]|(1[0-2]))$/.test(key);

export const isValidKey = (key: string): boolean =>
  /^[A-Z0-9]$/.test(key) || isFunctionKey(key) || SPECIAL_KEYS.includes(key);

type PrimaryModifier = 'Ctrl' | 'Alt' | 'MacCtrl';
type SecondaryModifier = 'Ctrl' | 'Alt' | 'MacCtrl' | 'Shift';

export class Command {
  private _modifier?: PrimaryModifier;
  private _secondaryModifier?: SecondaryModifier;
  private _key: string;

  constructor(
    key: string,
    modifier?: PrimaryModifier,
    secondaryModifier?: SecondaryModifier
  ) {
    console.assert(
      MEDIA_KEYS.includes(key) || isValidKey(key),
      `Set invalid key ${key}. Probably should have used one of the fromXXX methods`
    );
    console.assert(
      MEDIA_KEYS.includes(key) ||
        isFunctionKey(key) ||
        typeof modifier !== 'undefined',
      'Should have a modifier unless we are using a media key or function key. Probably should have used one of the fromXXX methods'
    );
    console.assert(
      __ALLOW_MAC_CTRL__ || modifier !== 'MacCtrl',
      'Should not be specifying MacCtrl on a configuration that does not support it'
    );
    console.assert(
      __ALLOW_MAC_CTRL__ || secondaryModifier !== 'MacCtrl',
      'Should not be specifying MacCtrl on a configuration that does not support it'
    );

    this._key = key;
    this._modifier = modifier;
    this._secondaryModifier = secondaryModifier;
  }

  static fromString(value: string): Command {
    if (MEDIA_KEYS.includes(value)) {
      return new Command(value);
    }

    const parts = value.split('+');
    if (!parts.length || parts.length > 3) {
      throw new Error(
        browser.i18n.getMessage('error_command_could_not_parse', value)
      );
    }

    const key = parts[parts.length - 1];
    if (!key.length) {
      throw new Error(browser.i18n.getMessage('error_command_has_no_key'));
    }

    if (!isValidKey(key)) {
      throw new Error(
        browser.i18n.getMessage('error_command_key_is_not_allowed', key)
      );
    }

    if (
      !isFunctionKey(key) &&
      (parts.length < 2 || !PRIMARY_MODIFIER_KEYS.includes(parts[0]))
    ) {
      throw new Error(
        browser.i18n.getMessage('error_command_is_missing_modifier_key')
      );
    }

    let modifier: PrimaryModifier | undefined;
    if (parts.length > 1) {
      if (!PRIMARY_MODIFIER_KEYS.includes(parts[0])) {
        throw new Error(
          browser.i18n.getMessage(
            'error_command_disallowed_modifier_key',
            parts[0]
          )
        );
      }
      modifier = parts[0] as PrimaryModifier;
    }

    let secondaryModifier: SecondaryModifier | undefined;
    if (parts.length > 2) {
      if (!SECONDARY_MODIFIER_KEYS.includes(parts[1])) {
        throw new Error(
          browser.i18n.getMessage(
            'error_command_disallowed_modifier_key',
            parts[1]
          )
        );
      }
      secondaryModifier = parts[1] as SecondaryModifier;
    }

    return new Command(key, modifier, secondaryModifier);
  }

  static fromParams(params: CommandParams): Command {
    if (MEDIA_KEYS.includes(params.key)) {
      if (params.alt || params.ctrl || params.shift) {
        throw new Error(
          browser.i18n.getMessage('error_command_media_key_with_modifier_key')
        );
      }
      return new Command(params.key);
    }

    if (!params.key.length) {
      throw new Error(browser.i18n.getMessage('error_command_has_no_key'));
    }

    if (!isValidKey(params.key)) {
      throw new Error(
        browser.i18n.getMessage('error_command_key_is_not_allowed', params.key)
      );
    }

    if (!isFunctionKey(params.key) && !(params.alt || params.ctrl)) {
      throw new Error(
        browser.i18n.getMessage('error_command_is_missing_modifier_key')
      );
    }

    const modifierCount = [
      params.alt ? 1 : 0,
      params.shift ? 1 : 0,
      params.ctrl ? 1 : 0,
      params.macCtrl ? 1 : 0,
    ].reduce((value, currentValue) => currentValue + value);
    if (modifierCount > 2) {
      throw new Error(
        browser.i18n.getMessage('error_command_too_many_modifiers')
      );
    }

    let modifier: PrimaryModifier | undefined;
    if (params.alt) {
      modifier = 'Alt';
    } else if (params.ctrl) {
      modifier = 'Ctrl';
    } else if (params.macCtrl) {
      modifier = 'MacCtrl';
    }

    let secondaryModifier: SecondaryModifier | undefined;
    if (modifier) {
      if (params.ctrl && modifier !== 'Ctrl') {
        secondaryModifier = 'Ctrl';
      } else if (params.macCtrl && modifier !== 'MacCtrl') {
        secondaryModifier = 'MacCtrl';
      } else if (params.shift) {
        secondaryModifier = 'Shift';
      }
    }

    return new Command(params.key, modifier, secondaryModifier);
  }

  static isValid(params: CommandParams): boolean {
    try {
      Command.fromParams(params);
      return true;
    } catch (e) {
      return false;
    }
  }

  // This should be taken to mean "Command" when on Mac
  get ctrl(): boolean {
    return this._modifier === 'Ctrl' || this._secondaryModifier === 'Ctrl';
  }

  get alt(): boolean {
    return this._modifier === 'Alt' || this._secondaryModifier === 'Alt';
  }

  get shift(): boolean {
    return this._secondaryModifier === 'Shift';
  }

  get macCtrl(): boolean {
    return (
      __ALLOW_MAC_CTRL__ &&
      (this._modifier === 'MacCtrl' || this._secondaryModifier === 'MacCtrl')
    );
  }

  get key(): string {
    return this._key;
  }

  toString(): string {
    const parts: Array<string> = [];
    if (this._modifier) {
      parts.push(this._modifier!);
    }
    if (this._secondaryModifier) {
      parts.push(this._secondaryModifier!);
    }
    parts.push(this._key!);

    return parts.join('+');
  }

  // Prior to Firefox 63, the second modifier could only be Shift.
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1364784
  usesExpandedModifierSet(): boolean {
    return !!this._secondaryModifier && this._secondaryModifier !== 'Shift';
  }
}

export default Command;
