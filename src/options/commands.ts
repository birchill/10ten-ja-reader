const PRIMARY_MODIFIERS = ['Ctrl', 'Alt', 'MacCtrl'] as const;

type PrimaryModifier = (typeof PRIMARY_MODIFIERS)[number];

const SECONDARY_MODIFIERS = [...PRIMARY_MODIFIERS, 'Shift'] as const;

type SecondaryModifier = (typeof SECONDARY_MODIFIERS)[number];

// Conversion from various input formats to standard modifier syntax.
//
// We use lowercase for the inputs to make it easier to do a case-insensitive
// comparison with input from the user since at least Edge in some locales seems
// to uppercase modifiers.
const MODIFIER_MAP: { [key: string]: SecondaryModifier } = {
  ctrl: 'Ctrl',
  command: 'Ctrl',
  '⌘': 'Ctrl',
  strg: 'Ctrl',
  alt: 'Alt',
  '⌥': 'Alt',
  alternatif: 'Alt',
  macctrl: 'MacCtrl',
  '⌃': 'MacCtrl',
  shift: 'Shift',
  '⇧': 'Shift',
};

const MEDIA_KEYS = [
  'MediaNextTrack',
  'MediaPlayPause',
  'MediaPrevTrack',
  'MediaStop',
];

export type CommandParams = {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  macCtrl?: boolean;
  key: string;
};

export class CommandError extends Error {
  // This is just an l10n key
  code: string;
  // And these are substitutions
  substitutions: string | Array<string> | undefined;

  constructor(
    code: string,
    substitutions?: string | Array<string> | undefined,
    ...params: any[]
  ) {
    super(...params);
    Object.setPrototypeOf(this, CommandError.prototype);

    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, CommandError);
    }

    this.name = 'CommandError';
    this.code = code;
    this.substitutions = substitutions;
  }
}

export class Command {
  #modifier?: PrimaryModifier;
  #secondaryModifier?: SecondaryModifier;
  #key: string;

  constructor(
    key: string,
    modifier?: PrimaryModifier,
    secondaryModifier?: SecondaryModifier
  ) {
    this.#key = key;
    this.#modifier = modifier;
    this.#secondaryModifier = secondaryModifier;
  }

  static fromString(value: string): Command {
    value = value.trim();

    if (MEDIA_KEYS.includes(value)) {
      return new Command(value);
    }

    // Normally keys take the form Alt+Ctrl+R etc. but Chrome on Mac represents
    // the different modifiers as ⌥⇧⌃⌘.
    const parts: Array<string> = value
      .split(/([⌥⇧⌃⌘])|\+/)
      .filter(Boolean)
      .map((key) => key.trim())
      .map((key) => MODIFIER_MAP[key.toLowerCase()] || key);

    // Validate we have a suitable number of components.
    if (!parts.length || parts.length > 3) {
      throw new CommandError('error_command_could_not_parse', value);
    }

    // The last part is the key
    let key = parts.pop();
    if (!key?.length) {
      throw new CommandError('error_command_has_no_key');
    }

    // Single character keys should be uppercase
    if (key.length === 1) {
      key = key.toUpperCase();
    }

    // We need at least one modifier unless the key is a function key
    if (!isFunctionKey(key) && !parts.length) {
      throw new CommandError('error_command_is_missing_modifier_key');
    }

    // Swap the primary and secondary modifiers if necessary
    //
    // We've seen this on Chrome which can produce ⇧⌘K
    let [primary, secondary] = parts;
    if (
      primary &&
      !isPrimaryModifier(primary) &&
      secondary &&
      isPrimaryModifier(secondary)
    ) {
      [primary, secondary] = [secondary, primary];
    }

    // Now validate our modifiers
    let modifier: PrimaryModifier | undefined;
    if (primary) {
      if (!isPrimaryModifier(primary)) {
        throw new CommandError(
          'error_command_disallowed_modifier_key',
          primary
        );
      }

      modifier = primary;
    }

    let secondaryModifier: SecondaryModifier | undefined;
    if (secondary) {
      if (!isSecondaryModifier(secondary)) {
        throw new CommandError(
          'error_command_disallowed_modifier_key',
          secondary
        );
      }

      secondaryModifier = secondary;
    }

    // There are a few other checks we _could_ do such as:
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
        throw new CommandError('error_command_media_key_with_modifier_key');
      }
      return new Command(params.key);
    }

    let key = params.key.trim();
    if (key.length === 1) {
      key = key.toUpperCase();
    }

    if (!key.length) {
      throw new CommandError('error_command_has_no_key');
    }

    if (!isFunctionKey(key) && !(params.alt || params.ctrl || params.macCtrl)) {
      throw new CommandError('error_command_is_missing_modifier_key');
    }

    // Function key + Shift only is not allowed
    if (
      isFunctionKey(key) &&
      params.shift &&
      !(params.alt || params.ctrl || params.macCtrl)
    ) {
      throw new CommandError('error_command_disallowed_modifier_key', 'Shift');
    }

    const modifierCount = [
      params.alt ? 1 : 0,
      params.shift ? 1 : 0,
      params.ctrl ? 1 : 0,
      params.macCtrl ? 1 : 0,
    ].reduce((value, currentValue) => currentValue + value);
    if (modifierCount > 2) {
      throw new CommandError('error_command_too_many_modifiers');
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

    return new Command(key, modifier, secondaryModifier);
  }

  isValid(): boolean {
    return isValidKey(this.#key);
  }

  // This should be taken to mean "Command" when on Mac
  get ctrl(): boolean {
    return this.#modifier === 'Ctrl' || this.#secondaryModifier === 'Ctrl';
  }

  get alt(): boolean {
    return this.#modifier === 'Alt' || this.#secondaryModifier === 'Alt';
  }

  get shift(): boolean {
    return this.#secondaryModifier === 'Shift';
  }

  get macCtrl(): boolean {
    return (
      this.#modifier === 'MacCtrl' || this.#secondaryModifier === 'MacCtrl'
    );
  }

  get key(): string {
    return this.#key;
  }

  toString(): string {
    const parts: Array<string> = [];
    if (this.#modifier) {
      parts.push(this.#modifier!);
    }
    if (this.#secondaryModifier) {
      parts.push(this.#secondaryModifier!);
    }
    parts.push(this.#key!);

    return parts.join('+');
  }
}

function isPrimaryModifier(key: string): key is PrimaryModifier {
  return PRIMARY_MODIFIERS.includes(key as PrimaryModifier);
}

function isSecondaryModifier(key: string): key is SecondaryModifier {
  return SECONDARY_MODIFIERS.includes(key as PrimaryModifier);
}

const isFunctionKey = (key: string) => /^F([1-9]|(1[0-2]))$/.test(key);

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

export const isValidKey = (key: string): boolean =>
  /^[A-Z0-9]$/.test(key) || isFunctionKey(key) || SPECIAL_KEYS.includes(key);
