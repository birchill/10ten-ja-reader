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

  // If we found longer matches in the names dictionary we return the longest
  // ones here, here up to the first 3 results.
  names?: Array<NameResult>;

  // If there were more than 3 names with a longer length, we indicate that
  // here.
  moreNames?: boolean;

  // A status flag used to indicate that we returned results from the flat-file
  // database instead of the (more up-to-date and localized Indexed DB store)
  // and hence the result should not be cached since a subsequent query with the
  // same inputs might return a different (and better) result.
  dbUnavailable?: boolean;
}

export interface TranslateResult {
  type: 'translate';
  data: Array<WordResult>;
  // Length of text matched.
  textLen: number;
  // True if greater than WORDS_MAX_ENTRIES were found.
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

export type RawSearchResult =
  | WordSearchResult
  | TranslateResult
  | KanjiSearchResult
  | NameSearchResult;

export type SearchMetadata = {
  // Used to indicate that we failed to find a match in the word dictionary
  // but found one in the names dictionary.
  //
  // When this is true, we use a different order for displaying the dictionaries
  // so this flag should be passed along with the next query to preserve that
  // order.
  preferNames: boolean;
};

// The search result combined with metadata needed to perform subsequent
// searches.
export type SearchResult = RawSearchResult & SearchMetadata;
