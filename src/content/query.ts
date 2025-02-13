import browser from 'webextension-polyfill';

import { BackgroundRequest } from '../background/background-request';
import {
  KanjiSearchResult,
  NameResult,
  NameSearchResult,
  SearchOtherResult,
  SearchWordsResult,
  TranslateResult,
  WordSearchResult,
} from '../background/search-result';
import { hasKatakana } from '../utils/char-range';
import { stripFields } from '../utils/strip-fields';

export type QueryResult = {
  words: WordSearchResult | null;
  kanji?: KanjiSearchResult | null;
  names?: NameSearchResult | null;

  // Metadata
  title?: string;
  namePreview?: NamePreview;
  resultType: 'db-unavailable' | 'db-updating' | 'initial' | 'full';
};

export type NamePreview = { names: Array<NameResult>; more: boolean };

export interface QueryOptions {
  includeRomaji: boolean;
  metaMatchLen?: number;
  wordLookup: boolean;
  updateQueryResult: (result: QueryResult | null) => void;
}

type QueryCacheEntry =
  | {
      key: string;
      state: 'searching';
      wordsQuery: Promise<QueryResult | null>;
      fullQuery: Promise<QueryResult | null>;
    }
  | { key: string; state: 'complete'; result: QueryResult };

let queryCache: Array<QueryCacheEntry> = [];

export async function query(
  text: string,
  options: QueryOptions
): Promise<QueryResult | null> {
  // Add a very very basic cache
  const key = getCacheKey({ ...options, text });

  // You'd think we'd use an actual hashmap (object) here but then we'd need to
  // work out some sort of LRU scheme for removing entries. While there are
  // plenty of libraries for that and we even use one such in the background
  // script, this code is part of the content script which goes into every page
  // so we try to keep it lean.
  //
  // As a result, we limit our cache size to 10 entries and just do a linear
  // search of the array.
  const cachedEntry = queryCache.find((q) => q.key === key);
  if (cachedEntry) {
    switch (cachedEntry.state) {
      case 'searching':
        void cachedEntry.fullQuery.then((result) => {
          options.updateQueryResult(result);
        });
        return cachedEntry.wordsQuery;

      case 'complete':
        return cachedEntry.result;
    }
  }

  // Limit the cache to 10 entries. This cache is really just here for the case
  // when the user is moving the cursor back and forward along a word and
  // therefore running the same query multiple times.
  if (queryCache.length > 10) {
    queryCache.shift();
  }

  // If the query throws, comes back empty, or is a result from the fallback
  // database, drop it from the cache.

  const rawWordsQuery = queryWords(text, options);
  const fullQuery = queryOther(text, options, rawWordsQuery)
    .then((result) => {
      // Update the cache accordingly
      if (!result || result === 'aborted') {
        queryCache = queryCache.filter((q) => q.key !== key);
        return null;
      } else if (result.resultType === 'full') {
        const cacheIndex = queryCache.findIndex((q) => q.key === key);
        if (cacheIndex !== -1) {
          queryCache[cacheIndex] = { key, state: 'complete', result };
        }
      } else {
        queryCache = queryCache.filter((q) => q.key !== key);
      }

      return result;
    })
    .catch(() => {
      queryCache = queryCache.filter((q) => q.key !== key);
      return null;
    });

  // The rawWordsQuery can return the 'aborted' value or an object with a
  // null `words` property (so we can read its dbStatus property) so that the
  // queryOther knows not to proceed, but we should simplify the result before
  // returning it to the caller.
  const wordsQuery = rawWordsQuery.then((result) => {
    return result === 'aborted' || !result?.words ? null : result;
  });

  queryCache.push({ key, state: 'searching', wordsQuery, fullQuery });

  void fullQuery.then((result) => options.updateQueryResult(result));

  return wordsQuery;
}

async function queryWords(
  text: string,
  options: QueryOptions
): Promise<QueryResult | 'aborted' | null> {
  const message: BackgroundRequest = {
    type: options.wordLookup ? 'searchWords' : 'translate',
    input: text,
    includeRomaji: options.includeRomaji,
  };

  let searchResult: SearchWordsResult | TranslateResult | 'aborted' | null;
  try {
    searchResult = await browser.runtime.sendMessage(message);
  } catch (e) {
    console.error(
      '[10ten-ja-reader] Failed to call query. The page might need to be refreshed.',
      e
    );
    searchResult = null;
  }

  if (!searchResult || searchResult === 'aborted') {
    return searchResult;
  }

  // Convert the result into a suitably shaped QueryResult

  let queryResult: QueryResult;
  let resultType: 'db-unavailable' | 'db-updating' | 'initial' = 'initial';
  const { dbStatus } = searchResult;
  if (dbStatus === 'unavailable') {
    resultType = 'db-unavailable';
  } else if (dbStatus === 'updating') {
    resultType = 'db-updating';
  }

  if (isTranslateResult(searchResult)) {
    let title = text.substring(0, searchResult.textLen);
    if (text.length > searchResult.textLen) {
      title += '...';
    }
    queryResult = {
      words: {
        ...stripFields(searchResult, ['dbStatus', 'textLen']),
        type: 'words',
        matchLen: searchResult.textLen,
      },
      title,
      resultType,
    };
  } else {
    queryResult = { ...stripFields(searchResult, ['dbStatus']), resultType };
  }

  return queryResult;
}

function isTranslateResult(
  result: SearchWordsResult | TranslateResult
): result is TranslateResult {
  return (result as TranslateResult).type === 'translate';
}

async function queryOther(
  text: string,
  options: QueryOptions,
  wordsQuery: Promise<QueryResult | 'aborted' | null>
): Promise<QueryResult | 'aborted' | null> {
  const words = await wordsQuery;
  if (words === 'aborted') {
    return 'aborted';
  }

  if (words?.resultType.startsWith('db-')) {
    return words;
  }

  const message: BackgroundRequest = {
    type: 'searchOther',
    input: text,
    includeRomaji: options.includeRomaji,
    wordsMatchLen: Math.max(
      words?.words?.matchLen || 0,
      options.metaMatchLen || 0
    ),
  };

  let searchResult: SearchOtherResult | 'aborted' | null;
  try {
    searchResult = await browser.runtime.sendMessage(message);
  } catch (e) {
    console.error(
      '[10ten-ja-reader] Failed to call searchOther. The page might need to be refreshed.',
      e
    );
    searchResult = null;
  }

  if (!searchResult) {
    // If the words query was empty too, make sure the final result is null.
    return words?.words ? words : null;
  }

  if (searchResult === 'aborted') {
    return searchResult;
  }

  return addNamePreview({
    words: words?.words ?? null,
    names: searchResult.names,
    kanji: searchResult.kanji,
    resultType: 'full',
  });
}

function addNamePreview(result: QueryResult): QueryResult {
  if (!result.words || !result.names) {
    return result;
  }

  // If we have a word result, check for a longer match in the names dictionary,
  // but only if the existing match has some non-hiragana characters in it.
  //
  // The names dictionary contains mostly entries with at least some kanji or
  // katakana but it also contains entries that are solely hiragana (e.g.  はなこ
  // without any corresponding kanji). Generally we only want to show a name
  // preview if it matches on some kanji or katakana as otherwise it's likely to
  // be a false positive.
  //
  // While it might seem like it would be enough to check if the existing match
  // from the words dictionary is hiragana-only, we can get cases where a longer
  // match in the names dictionary _starts_ with hiragana but has kanji/katakana
  // later, e.g. ほとけ沢.
  const names: Array<NameResult> = [];
  let more = false;

  // Add up to three results provided that:
  //
  // - they have a kanji reading or katakana reading,
  // - and are all are as long as the longest names match,
  // - are all longer than the longest words match
  const minLength = Math.max(result.names.matchLen, result.words.matchLen + 1);

  for (const name of result.names.data) {
    // Names should be in descending order of length so if any of them is less
    // than the minimum length, we can skip the rest.
    if (name.matchLen < minLength) {
      break;
    }

    if (!name.k && !name.r.some(hasKatakana)) {
      continue;
    }

    if (names.length > 2) {
      more = true;
      break;
    }

    names.push(name);
  }

  if (!names.length) {
    return result;
  }

  // If we got a match, extend the matchLen of the words result.
  //
  // Reaching into the words result like this is cheating a little bit but it
  // simplifies the places where we use the word result.
  const matchLen = names[0].matchLen;

  return {
    ...result,
    words: { ...result.words, matchLen },
    namePreview: { names, more },
  };
}

function getCacheKey({
  text,
  includeRomaji,
  wordLookup,
}: {
  text: string;
  includeRomaji: boolean;
  wordLookup: boolean;
}): string {
  return [text, includeRomaji ? '1' : '0', wordLookup ? '1' : '0'].join('-');
}
