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

export type InitialSearchResult = {
  words: WordSearchResult | null;

  // The initial result can be one of several types which will determine how
  // it is displayed to the user:
  //
  // 'db-unavailable' - The IndexedDB database is not available, e.g. because we
  // are in always-on private browsing mode. In this case we should present the
  // result as complete (i.e. not translucent) and not show any tabs since there
  // never will be any other tabs to show.
  //
  //    Show tabs? No
  //    Show "updating" status? No
  //
  // 'db-updating' - The IndexedDB database is being updated and so we won't
  // access it because in Chromium browsers even if we access a different table
  // it will block. In this case we should indicate the database is updating and
  // hence incomplete results are shown. We should should probably show the tabs
  // however, because eventually they will become available once the update has
  // completed.
  //
  //    Show tabs? Yes
  //    Show "updating" status? Yes
  //
  // 'initial' - The IndexedDB database is available and we used it to gather
  // the word results. A subsequent result will provide the data for other data
  // series (names and kanji) along with identical data for the words result.
  //
  //    Show tabs? Yes
  //    Show "updating" status? No
  //
  resultType: 'db-unavailable' | 'db-updating' | 'initial';
};

export type FullSearchResult = {
  // There is a subtle difference below between 'null' and 'undefined'/absent.
  //
  // - 'null' means we searched the database but found nothing.
  // - 'undefined'/absent means the database was not available for some reason.
  //
  // (Since there is a fallback words database, `words` never ends up being
  // undefined.)
  words: WordSearchResult | null;
  kanji?: KanjiSearchResult | null;
  names?: NameSearchResult | null;

  // For symmetry with InitialSearchResult we provide a resultType member.
  resultType: 'full';
};

// A type we temporarily introduce representing the conflation of
// InitialSearchResult and FullSearchResult that we return from the background
// page until we the content script knows how to handle the separate results.
export type CompatibilitySearchResult = Omit<FullSearchResult, 'resultType'> & {
  resultType: 'db-unavailable' | 'db-updating' | undefined;
};

// Translate result

export interface TranslateResult {
  type: 'translate';
  data: Array<WordResult>;
  // Length of text matched.
  textLen: number;
  // True if greater than WORDS_MAX_ENTRIES were found.
  more: boolean;
  // See the description of these values in InitialSearchResult and FullSearchResult.
  resultType: 'db-unavailable' | 'db-updating' | 'full';
}
