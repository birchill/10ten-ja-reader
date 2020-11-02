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
  ForceKanji,
  Default,
  NextDict,
}

type NameResult = import('@birchill/hikibiki-data').NameResult & {
  matchLen: number;
};

interface NameSearchResult {
  type: 'names';
  data: Array<NameResult>;
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

interface WordMatch {
  // TODO: Use definitions from hikibiki-data once we update it
  entry: import('./word-result').WordResult;
  reason?: string;
  romaji?: Array<string>;
}

interface WordSearchResult {
  type: 'words';
  data: Array<WordMatch>;
  // The length of the longest match in the original input string.
  matchLen: number;
  // True if greater than `maxResults` entries were found.
  more: boolean;
  // If we found longer matches in the names dictionary we return the longest
  // ones here, here up to the first 3 results.
  names?: Array<NameResult>;
  // If there were more than 3 names with a longer length, we indicate that
  // here.
  moreNames?: boolean;
}

interface TranslateResult {
  type: 'translate';
  data: Array<WordMatch>;
  // Length of text matched.
  textLen: number;
  // True if greater than WORDS_MAX_ENTRIES were found.
  more: boolean;
}

type SearchResult =
  | KanjiSearchResult
  | NameSearchResult
  | WordSearchResult
  | TranslateResult;
