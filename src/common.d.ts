// Common definitions shared between the content and backend parts.

// Keyboard shortcut keys. Each of these is an array of keycodes (as reported
// by KeyboardEvent.key). The array may be empty in which case the action is
// effectively disabled.
interface KeyboardKeys {
  // The key(s) to toggle display of the definition vs reading-only.
  toggleDefinition: string[];

  // The key(s) to cycle through the available dictionaries.
  nextDictionary: string[];
}

interface ContentConfig {
  // True if only the reading (and not the definition) should be shown.
  readingOnly: boolean;

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
  Same,
  ForceKanji,
  Default,
  NextDict,
}

interface LookupResult {
  // Array of matches. Each match is a tuple array containing a dictionary entry
  // and a reason string.
  data: [string, string][];
  // True if greater than `maxResults` entries were found.
  more: boolean;
  // The length of the longest match using the lengths supplied in
  // `inputLengths`.
  matchLen: number;
}

interface WordSearchResult extends LookupResult {
  // Set and true if the search included the names dictionary.
  names?: boolean;
}

interface KanjiEntry {
  // The kanji itself
  kanji: string;
  // Key-value pairs with the key is usually 1~2 uppercase characters
  // indicating the reference, and the value is an object containing a 'value'
  // which is typically a number or sequence indicating the index of the
  // character in said reference, and a 'reference' field with the full name of
  // the reference.
  misc: { [abbrev: string]: string };
  // An array that defines which entries in 'misc' should be displayed, the
  // order in which they should be presented, and the full name of the reference
  // corresponding to each abbreviation.
  miscDisplay: { abbrev: string; name: string }[];
  // Kanji components
  components?: { radical: string; yomi: string; english: string }[];
  // On-yomi and kun-komi
  onkun: string[];
  // Name readings
  nanori: string[];
  // Radicals
  bushumei: string[]; // Pronunciation of the radical (in kana)
  radical: string; // Radical as unicode character
  // English
  eigo: string;
}

interface TranslateResult {
  // As with LookupResult.
  data: [string, string][];
  // Length of text matched.
  textLen: number;
  // True if greater than WORDS_MAX_ENTRIES were found.
  more: boolean;
}

type SearchResult = KanjiEntry | WordSearchResult | TranslateResult;
