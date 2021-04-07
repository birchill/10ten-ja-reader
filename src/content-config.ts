// Keyboard shortcut keys. Each of these is an array of keycodes (as reported
// by KeyboardEvent.key). The array may be empty in which case the action is
// effectively disabled.
export interface KeyboardKeys {
  // The key(s) to toggle display of the definition vs reading-only.
  toggleDefinition: string[];

  // The key(s) to cycle through the available dictionaries.
  nextDictionary: string[];

  // The key(s) to entry copy mode.
  startCopy: string[];
}

export type AccentDisplay = 'downstep' | 'binary' | 'none';

export type PartOfSpeechDisplay = 'expl' | 'code' | 'none';

export interface ContentConfig {
  // Indicates the type of display to use for showing pitch accent information.
  accentDisplay: AccentDisplay;

  // The preferred language for dictionary content.
  dictLang: string;

  // References to show in the kanji view.
  kanjiReferences: Array<import('./refs').ReferenceAbbreviation>;

  // Keyboard shortcut keys. Each of these is an array of keycodes (as reported
  // by KeyboardEvent.key). The array may be empty in which case the action is
  // not possible via keyboard.
  keys: KeyboardKeys;

  // Modifier keys which must be held down in order for the pop-up to shown.
  //
  // This should be a Set but Chrome can't send Sets by sendMessage :(
  holdToShowKeys: Array<'Alt' | 'Ctrl'>;

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
}
