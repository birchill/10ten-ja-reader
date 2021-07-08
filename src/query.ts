import { browser } from 'webextension-polyfill-ts';

import { SearchRequest, TranslateRequest } from './background-request';
import { NameResult, SearchResult, TranslateResult } from './search-result';
import { stripFields } from './strip-fields';

export interface QueryOptions {
  includeRomaji: boolean;
  wordLookup: boolean;
}

export type QueryResult = SearchResult & {
  title?: string;
  namePreview?: NamePreview;
};

export type NamePreview = {
  names: Array<NameResult>;
  more: boolean;
};

type QueryCacheEntry = {
  hash: string;
  query: Promise<QueryResult | null>;
};

let queryCache: Array<QueryCacheEntry> = [];

export async function query(
  text: string,
  options: QueryOptions
): Promise<QueryResult | null> {
  // Add a very very basic cache
  const hash = [
    text,
    options.includeRomaji ? '1' : '0',
    options.wordLookup ? '1' : '0',
  ].join('-');

  // You'd think we'd use an actual hashmap (object) here but then we'd need to
  // work out some sort of LRU scheme for removing entries. While there are
  // plenty of libraries for that and we even use one such in the background
  // script, this code is part of the content script which goes into every page
  // so we try to keep it lean.
  //
  // As a result, we limit our cache size to 10 entries and just do a linear
  // search of the array.
  const cachedEntry = queryCache.find((q) => q.hash === hash);
  if (cachedEntry) {
    return cachedEntry.query;
  }

  // Limit the cache to 10 entries. This cache is really just here for the case
  // when the user is moving the cursor back and forward along a word and
  // therefore running the same query multiple times.
  if (queryCache.length > 10) {
    queryCache.shift();
  }

  // If the query throws, comes back empty, or is a result from the fallback
  // database, drop it from the cache.
  const dropFromCache = () => {
    queryCache = queryCache.filter((q) => q.hash !== hash);
  };
  const queryResult = doQuery(text, options)
    .then((result) => {
      if (!result || !!result.dbStatus) {
        dropFromCache();
      }
      return result ? addNamePreview(result) : null;
    })
    .catch(() => {
      dropFromCache();
      return null;
    });

  // We cache the Promise, instead of the result, because we hope this will
  // help to stop flooding the background process with redundant requests.
  queryCache.push({
    hash,
    query: queryResult,
  });

  return queryResult;
}

async function doQuery(
  text: string,
  options: QueryOptions
): Promise<QueryResult | null> {
  const message: SearchRequest | TranslateRequest = {
    type: options.wordLookup ? 'search' : 'translate',
    input: text,
    includeRomaji: options.includeRomaji,
  };

  let searchResult: SearchResult | TranslateResult | null;
  try {
    searchResult = await browser.runtime.sendMessage(message);
  } catch (e) {
    console.error(
      '[10ten-ja-reader] Failed to call query. The page might need to be refreshed.',
      e
    );
    searchResult = null;
  }
  if (!searchResult) {
    return null;
  }

  // Convert a translate result into a suitably shaped SearchResult but
  // with the title part filled-in.

  let queryResult: QueryResult;
  if (isTranslateResult(searchResult)) {
    let title = text.substr(0, searchResult.textLen);
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
      dbStatus: searchResult.dbStatus,
    };
  } else {
    queryResult = searchResult;
  }

  return queryResult;
}

function isTranslateResult(
  result: SearchResult | TranslateResult
): result is TranslateResult {
  return (result as TranslateResult).type === 'translate';
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
  // - they have a kanji reading,
  // - and are all are as long as the longest names match,
  // - are all longer than the longest words match
  const minLength = Math.max(result.names.matchLen, result.words.matchLen + 1);

  for (const name of result.names.data) {
    // Names should be in descending order of length so if any of them is less
    // than the minimum length, we can skip the rest.
    if (name.matchLen < minLength) {
      break;
    }

    if (!name.k) {
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
