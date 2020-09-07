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

interface ContentConfig {
  // True if only the reading (and not the definition) should be shown.
  readingOnly: boolean;

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
  Same,
  ForceKanji,
  Default,
  NextDict,
}

interface NameSearchResult {
  type: 'names';
  data: Array<import('@birchill/hikibiki-data').NameResult>;
  // The length of the longest match in the original input string.
  matchLen: number;
  // True if greater than `maxResults` entries were found.
  more: boolean;
}

interface KanjiSearchResult {
  type: 'kanji';
  data: import('@birchill/hikibiki-data').KanjiResult;
  matchLen: 1;
}

interface RawWordSearchResult {
  type: 'words';
  // Array of matches. Each match is a tuple array containing:
  // - a dictionary entry,
  // - an optional reason string,
  // - an optional romaji transliteration
  data: [string, string | null, string | null][];
  // If we found a longer match in the names dictionary we return that here.
  name?: import('@birchill/hikibiki-data').NameResult;
  // The length of the longest match in the original input string.
  matchLen: number;
  // True if greater than `maxResults` entries were found.
  more: boolean;
}

interface RawTranslateResult {
  type: 'translate';
  // As with LookupResult.
  data: [string, string | null, string | null][];
  // Length of text matched.
  textLen: number;
  // True if greater than WORDS_MAX_ENTRIES were found.
  more: boolean;
}

type SearchResult =
  | KanjiSearchResult
  | NameSearchResult
  | RawWordSearchResult
  | RawTranslateResult;
