import type {
  NameResult as JpdictNameResult,
  WordResult as JpdictWordResult,
  KanjiResult,
} from '@birchill/jpdict-idb';

import { Reason } from './deinflect';

// Words

export type DictionaryWordResult = JpdictWordResult;

export type CandidateWordResult = DictionaryWordResult & {
  reasonChains?: Array<Array<Reason>>;
};

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
  data: Array<KanjiResult>;
  matchLen: number;
}

// Names

export type NameResult = JpdictNameResult & { matchLen: number };

export interface NameSearchResult {
  type: 'names';
  data: Array<NameResult>;
  // The length of the longest match in the original input string.
  matchLen: number;
  // True if greater than `maxResults` entries were found.
  more: boolean;
}

// Combined search result

export type SearchWordsResult = {
  words: WordSearchResult | null;
  // DB here refers to the IndexedDB database. If it is unavailable or being
  // updated we look up the flat-file database instead which only covers the
  // words dictionary, has only English glosses, and may be out-of-date.
  dbStatus?: 'unavailable' | 'updating';
};

export type SearchOtherResult = {
  kanji: KanjiSearchResult | null;
  names: NameSearchResult | null;
};

// Translate result

export interface TranslateResult {
  type: 'translate';
  data: Array<WordResult>;
  // Length of text matched.
  textLen: number;
  // True if greater than WORDS_MAX_ENTRIES were found.
  more: boolean;
  // See description in SearchWordsResult.
  dbStatus?: 'unavailable' | 'updating';
}
