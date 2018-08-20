export interface CommandParams {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  key: string;
}

//
// You might have noticed how MacCtrl and Command are missing from the following
// lists. That's because this class is for managing settings that get synced
// across devices. We don't want users to be able to set keys that can't be
// synced to other platforms. That would either render the keys useless on other
// platforms (which would be very confusing) or would introduce a lot of
// complexity in trying to manage variants of the key settings.
//
const PRIMARY_MODIFIER_KEYS = ['Ctrl', 'Alt'];

const SECONDARY_MODIFIER_KEYS = ['Ctrl', 'Alt', 'Shift'];

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

const isValidKey = (key: string): boolean =>
  /^[A-Z0-9]$/.test(key) || isFunctionKey(key) || SPECIAL_KEYS.includes(key);

type PrimaryModifier = 'Ctrl' | 'Alt';
type SecondaryModifier = 'Ctrl' | 'Alt' | 'Shift';

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

    const parts = value.split('+');
    if (!parts.length || parts.length > 3) {
      throw new Error(`Could not parse command string: ${value}.`);
    }

    const key = parts[parts.length - 1];
    if (!key.length) {
      throw new Error(`Invalid command string: ${value}. Key is empty.`);
    }

    if (!isValidKey(key)) {
      throw new Error(
        `Invalid command string: ${value}. Key '${key}' is not allowed.`
      );
    }

    if (
      !isFunctionKey(key) &&
      (parts.length < 2 || !PRIMARY_MODIFIER_KEYS.includes(parts[0]))
    ) {
      throw new Error(
        `Invalid command string: ${value}. A modifier must be specified unless using a function key.`
      );
    }

    let modifier: PrimaryModifier | undefined;
    if (parts.length > 1) {
      if (!PRIMARY_MODIFIER_KEYS.includes(parts[0])) {
        throw new Error(
          `Invalid command string: ${value}. Modifier ${
            parts[0]
          } is not allowed.`
        );
      }
      modifier = parts[0] as PrimaryModifier;
    }

    let secondaryModifier: SecondaryModifier | undefined;
    if (parts.length > 2) {
      if (!SECONDARY_MODIFIER_KEYS.includes(parts[1])) {
        throw new Error(
          `Invalid command string: ${value}. Secondary modifier ${
            parts[1]
          } is not allowed.`
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
          `Invalid command: Cannot specify modifiers and media keys.`
        );
      }
      return new Command(params.key);
    }

    if (!params.key.length) {
      throw new Error(`Invalid command. Key is empty.`);
    }

    if (!isValidKey(params.key)) {
      throw new Error(`Invalid command. Key '${params.key}' is not allowed.`);
    }

    if (!isFunctionKey(params.key) && !(params.alt || params.ctrl)) {
      throw new Error(
        `Invalid command. A modifier must be specified unless using a function key.`
      );
    }

    const modifierCount = [
      params.alt ? 1 : 0,
      params.shift ? 1 : 0,
      params.ctrl ? 1 : 0,
    ].reduce((value, currentValue) => currentValue + value);
    if (modifierCount > 2) {
      throw new Error('Invalid command. Too many modifiers.');
    }

    let modifier: PrimaryModifier | undefined;
    if (params.alt) {
      modifier = 'Alt';
    } else if (params.ctrl) {
      modifier = 'Ctrl';
    }

    let secondaryModifier: SecondaryModifier | undefined;
    if (modifier) {
      if (params.ctrl && modifier !== 'Ctrl') {
        secondaryModifier = 'Ctrl';
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
