import type {
  KanjiResult,
  NameResult as HikibikiNameResult,
  WordResult as HikibikiWordResult,
} from '@birchill/hikibiki-data';

import { SearchRequest } from './background-request';

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
  //    Popup is translucent? No
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
  //    Popup is translucent? No
  //    Show tabs? Yes
  //    Show "updating" status? Yes
  //
  // 'snapshot' - The IndexedDB database is available to be queried but we
  // decided to initially return a result from the in-memory snapshot of the
  // database because we determined that would produce better response time for
  // this device. A subsequent result will provide the complete, up-to-date,
  // data from the IndexedDB database so we should show this result in a
  // tentative manner (e.g. translucent) since it may be subsequently replaced
  // with entirely different data.
  //
  //    Popup is translucent? Yes
  //    Show tabs? Yes
  //    Show "updating" status? No
  //
  // 'initial' - The IndexedDB database is available and we used it to gather
  // the word results. A subsequent result will provide the data for other data
  // series (names and kanji) along with identical data for the words result.
  //
  //    Popup is translucent? No
  //    Show tabs? Yes
  //    Show "updating" status? No
  //
  resultType: 'db-unavailable' | 'db-updating' | 'snapshot' | 'initial';
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

  // Include the original search request so the caller can cache the result
  // against the search input.
  request: SearchRequest;

  // For symmetry with InitialSearchResult we provide a resultType member.
  resultType: 'full';
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
