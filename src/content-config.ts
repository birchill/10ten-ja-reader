// Keyboard shortcut keys. Each of these is an array of keycodes (as reported
// by KeyboardEvent.key). The array may be empty in which case the action is
// effectively disabled.
export interface KeyboardKeys {
  // The key(s) to toggle display of the definition vs reading-only.
  toggleDefinition: string[];

  // The key(s) to cycle through the available dictionaries.
  nextDictionary: string[];

  // The key(s) to force kanji-only lookup.
  kanjiLookup: string[];

  // The key(s) to move the popup up.
  movePopupUp: string[];

  // The key(s) to move the popup down.
  movePopupDown: string[];

  // The key(s) to entry copy mode.
  startCopy: string[];
}

export type AccentDisplay = 'downstep' | 'binary' | 'none';

export type PartOfSpeechDisplay = 'expl' | 'code' | 'none';

export type TabDisplay = 'top' | 'left' | 'right' | 'none';

export interface ContentConfig {
  // Indicates the type of display to use for showing pitch accent information.
  accentDisplay: AccentDisplay;

  // The preferred language for dictionary content.
  dictLang: string;

  // True if the user has successfully switched dictionaries (meaning we don't
  // need to tell them how).
  hasSwitchedDictionary: boolean;

  // Modifier keys which must be held down in order for the pop-up to shown.
  //
  // This should be a Set but Chrome can't send Sets by sendMessage :(
  holdToShowKeys: Array<'Alt' | 'Ctrl'>;

  // As above but specifically for images.
  holdToShowImageKeys: Array<'Alt' | 'Ctrl'>;

  // References to show in the kanji view.
  kanjiReferences: Array<import('./refs').ReferenceAbbreviation>;

  // Keyboard shortcut keys. Each of these is an array of keycodes (as reported
  // by KeyboardEvent.key). The array may be empty in which case the action is
  // not possible via keyboard.
  keys: KeyboardKeys;

  // Prevents highlighting text on hover
  noTextHighlight: boolean;

  // The theme in use, e.g. 'blue'.
  popupStyle: string;

  // Indicates the type of display to use for part-of-speech labels.
  posDisplay: PartOfSpeechDisplay;

  // True if only the reading (and not the definition) should be shown.
  readingOnly: boolean;

  // True if the components of the kanji should be shown alongside it.
  showKanjiComponents: boolean;

  // True if we should show indicators next to common words.
  showPriority: boolean;

  // Should we show the puck or not? If the setting is 'auto' the content script
  // should detect if the device has hover capability or not and hide the puck
  // if so.
  //
  // (We make the content script responsible for implementing this because it may
  // be difficult to have the background process do this if/when we move to a
  // Service Worker model.)
  showPuck: 'auto' | 'hide' | 'show';

  // True if we should show romaji alongside each reading.
  showRomaji: boolean;

  // Indicates the orientation / visibility of the popup tab bar.
  tabDisplay: TabDisplay;
}
