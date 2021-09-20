import { browser } from 'webextension-polyfill-ts';

export interface CommandParams {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  macCtrl?: boolean;
  key: string;
}

const PRIMARY_MODIFIER_MAP: { [key: string]: PrimaryModifier } = {
  Ctrl: 'Ctrl',
  Command: 'Ctrl',
  '⌘': 'Ctrl',
  Alt: 'Alt',
  '⌥': 'Alt',
  MacCtrl: 'MacCtrl',
  '⌃': 'MacCtrl',
};

const SECONDARY_MODIFIER_MAP: { [key: string]: SecondaryModifier } = {
  ...PRIMARY_MODIFIER_MAP,
  Shift: 'Shift',
  '⇧': 'Shift',
};

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

    this._key = key;
    this._modifier = modifier;
    this._secondaryModifier = secondaryModifier;
  }

  static fromString(value: string): Command {
    if (MEDIA_KEYS.includes(value)) {
      return new Command(value);
    }

    // Normally keys take the form Alt+Ctrl+R etc. but Chrome on Mac represents
    // the different modifiers as ⌥⇧⌃⌘.
    let parts = value
      .split(/([⌥⇧⌃⌘])|\+/)
      .filter(Boolean)
      .map((key) => key.trim());

    // Normalize the case of modifiers.
    //
    // On Edge, at least on the German locale, the modifiers appear to be
    // uppercased.
    const modifiers = new Map(
      [...new Set(Object.values(SECONDARY_MODIFIER_MAP))].map((m) => [
        m.toLowerCase(),
        m,
      ])
    );
    parts = parts.map((p) => modifiers.get(p.toLowerCase()) || p);

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
      (parts.length < 2 || !PRIMARY_MODIFIER_MAP.hasOwnProperty(parts[0]))
    ) {
      console.warn(`Unexpected command string: ${value}`);
      throw new Error(
        browser.i18n.getMessage('error_command_is_missing_modifier_key')
      );
    }

    let modifier: PrimaryModifier | undefined;
    if (parts.length > 1) {
      if (!PRIMARY_MODIFIER_MAP.hasOwnProperty(parts[0])) {
        throw new Error(
          browser.i18n.getMessage(
            'error_command_disallowed_modifier_key',
            parts[0]
          )
        );
      }

      modifier = PRIMARY_MODIFIER_MAP[parts[0]];
    }

    let secondaryModifier: SecondaryModifier | undefined;
    if (parts.length > 2) {
      if (!SECONDARY_MODIFIER_MAP.hasOwnProperty(parts[1])) {
        throw new Error(
          browser.i18n.getMessage(
            'error_command_disallowed_modifier_key',
            parts[1]
          )
        );
      }

      secondaryModifier = SECONDARY_MODIFIER_MAP[parts[1]];
    }

    // There are a few other checks we could do such as:
    //
    // - Checking that we don't have BOTH Ctrl and Command (since Ctrl maps to
    //   Command on Macs and Command doesn't exist on other platforms).
    // - Checking that we don't use MacCtrl or Command on non-Mac platforms.
    //
    // However, since we no longer sync toggle keys, they can only be set by
    // our UI or the browser UI, presumably both of which ensure the key is
    // valid for the above cases.

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

    if (
      !isFunctionKey(params.key) &&
      !(params.alt || params.ctrl || params.macCtrl)
    ) {
      console.warn(`Unexpected command params: ${JSON.stringify(params)}`);
      throw new Error(
        browser.i18n.getMessage('error_command_is_missing_modifier_key')
      );
    }

    // Function key + Shift is not allowed
    if (
      isFunctionKey(params.key) &&
      params.shift &&
      !(params.alt || params.ctrl || params.macCtrl)
    ) {
      throw new Error(
        browser.i18n.getMessage(
          'error_command_disallowed_modifier_key',
          'Shift'
        )
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
    } catch {
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
      this._modifier === 'MacCtrl' || this._secondaryModifier === 'MacCtrl'
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
}

export default Command;
