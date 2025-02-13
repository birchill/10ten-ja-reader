import { KeyboardKeys } from './content-config-params';

// Although we separate out the keys for moving a pop-up up or down when we
// report the keys to the content page, we store them as a single setting.
export type StoredKeyboardKeys = Omit<
  KeyboardKeys,
  'movePopupUp' | 'movePopupDown'
> & { movePopupDownOrUp: string[] };

// A single key description. We use this definition for storing the default keys
// since it allows storing as an array (so we can determine the order the
// options are displayed in) and storing a description along with each key.
export type KeySetting = {
  name: keyof StoredKeyboardKeys;
  keys: string[];
  enabledKeys: string[];
  l10nKey: string;
};

export const PopupKeys: KeySetting[] = [
  {
    name: 'nextDictionary',
    keys: ['Shift', 'Enter', 'n'],
    enabledKeys: ['Shift', 'Enter'],
    l10nKey: 'options_popup_switch_dictionaries',
  },
  {
    name: 'kanjiLookup',
    keys: ['Shift'],
    enabledKeys: [],
    l10nKey: 'options_popup_kanji_lookup',
  },
  {
    name: 'toggleDefinition',
    keys: ['d'],
    enabledKeys: [],
    l10nKey: 'options_popup_toggle_definition',
  },
  {
    name: 'expandPopup',
    keys: ['x'],
    enabledKeys: ['x'],
    l10nKey: 'options_popup_expand_popup',
  },
  {
    name: 'closePopup',
    keys: ['Esc', 'x'],
    enabledKeys: ['Esc'],
    l10nKey: 'options_popup_close_popup',
  },
  {
    name: 'pinPopup',
    keys: ['Alt', 'Ctrl', 'Space'],
    enabledKeys: ['Ctrl'],
    l10nKey: 'options_popup_pin_popup',
  },
  {
    name: 'movePopupDownOrUp',
    keys: ['j,k'],
    enabledKeys: [],
    l10nKey: 'options_popup_move_popup_down_or_up',
  },
  {
    name: 'startCopy',
    keys: ['c'],
    enabledKeys: ['c'],
    l10nKey: 'options_popup_start_copy',
  },
];
