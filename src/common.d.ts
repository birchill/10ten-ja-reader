// Common definitions shared between the content and backend parts.

// Keyboard shortcut keys. Each of these is an array of keycodes (as reported
// by KeyboardEvent.key). The array may be empty in which case the action is
// effectively disabled.
interface KeyboardKeys {
  // The key(s) to toggle display of the definition vs reading-only.
  toggleDefinition: string[];

  // The key(s) to cycle through the available dictionaries.
  nextDictionary: string[];

  // The key(s) to entry copy mode.
  startCopy: string[];
}

type AccentDisplay = 'downstep' | 'binary' | 'none';

type PartOfSpeechDisplay = 'expl' | 'code' | 'none';

interface ContentConfig {
  // True if we should show indicators next to common words.
  showPriority: boolean;

  // True if only the reading (and not the definition) should be shown.
  readingOnly: boolean;

  // Indicates the type of display to use for showing pitch accent information.
  accentDisplay: AccentDisplay;

  // Indicates the type of display to use for part-of-speech labels.
  posDisplay: PartOfSpeechDisplay;

  // References to show in the kanji view.
  kanjiReferences: Array<import('./refs').ReferenceAbbreviation>;

  // True if the components of the kanji should be shown alongside it.
  showKanjiComponents: boolean;

  // Modifier keys which must be held down in order for the pop-up to shown.
  //
  // This should be a Set but Chrome can't send Sets by sendMessage :(
  holdToShowKeys: Array<'Alt' | 'Ctrl'>;

  // Keyboard shortcut keys. Each of these is an array of keycodes (as reported
  // by KeyboardEvent.key). The array may be empty in which case the action is
  // not possible via keyboard.
  keys: KeyboardKeys;

  // Prevents highlighting text on hover
  noTextHighlight: boolean;

  // The theme in use, e.g. 'blue'.
  popupStyle: string;
}

declare const enum DictMode {
  ForceKanji,
  Default,
  NextDict,
}
