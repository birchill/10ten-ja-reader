import type {
  KanjiResult,
  NameResult as HikibikiNameResult,
  WordResult as HikibikiWordResult,
} from '@birchill/hikibiki-data';

// Words

export type DictionaryWordResult = HikibikiWordResult;

export type WordResult = DictionaryWordResult & {
  reason?: string;
  romaji?: Array<string>;
};

export type Sense = WordResult['s'][0];

export interface WordSearchResult {
  type: 'words';
  data: Array<WordResult>;
  // The length of the longest match in the original input string.
  matchLen: number;
  // True if greater than `maxResults` entries were found.
  more: boolean;
}

// Kanji

export interface KanjiSearchResult {
  type: 'kanji';
  data: KanjiResult;
  matchLen: 1;
}

// Names

export type NameResult = HikibikiNameResult & {
  matchLen: number;
};

export interface NameSearchResult {
  type: 'names';
  data: Array<NameResult>;
  // The length of the longest match in the original input string.
  matchLen: number;
  // True if greater than `maxResults` entries were found.
  more: boolean;
}

// Combined search result

export type SearchDatabaseStatus = 'unavailable' | 'updating';

export type SearchResult = {
  // There is a subtle difference below between 'null' and 'undefined'/absent.
  //
  // - 'null' means we searched the database but found nothing.
  // - 'undefined'/absent means the database was not available for some reason
  //   (usually covered by dbStatus below).
  //
  // (Since there is a fallback words database, `words` never ends up being
  // undefined.)
  words: WordSearchResult | null;
  kanji?: KanjiSearchResult | null;
  names?: NameSearchResult | null;
  // DB here refers to the IndexedDB database. If it is unavailable or being
  // updated we look up the flat-file database instead which only covers the
  // words dictionary, has only English glosses, and may be out-of-date.
  dbStatus?: SearchDatabaseStatus;
};

// Translate result

export interface TranslateResult {
  type: 'translate';
  data: Array<WordResult>;
  // Length of text matched.
  textLen: number;
  // True if greater than WORDS_MAX_ENTRIES were found.
  more: boolean;
  // DB here refers to the IndexedDB database. If it is unavailable or being
  // updated we look up the flat-file database instead which has only English
  // glosses and may be out-of-date.
  dbStatus?: SearchDatabaseStatus;
}
