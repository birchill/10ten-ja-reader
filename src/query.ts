import { browser } from 'webextension-polyfill-ts';

import {
  DictType,
  SearchRequest,
  TranslateRequest,
} from './background-request';
import {
  KanjiSearchResult,
  NameResult,
  NameSearchResult,
  SearchResult,
  WordSearchResult,
} from './search-result';

export type QueryResult = (
  | WordSearchOrTranslateResult
  | NameSearchResult
  | KanjiSearchResult
) & { preferNames: boolean };

export interface WordSearchOrTranslateResult
  extends Omit<WordSearchResult, 'matchLen'> {
  type: 'words';
  title?: string;
  matchLen: number | null;
}

export interface QueryOptions {
  includeRomaji: boolean;
  dict?: DictType;
  prevDict: DictType | undefined;
  preferNames: boolean;
  wordLookup: boolean;
}

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
    options.dict || 'auto',
    options.prevDict || 'none',
    options.preferNames ? '1' : '0',
    options.wordLookup ? '1' : '0',
  ].join('-');

  // You'd think we'd use an actual hashmap (object) here but then we'd need to
  // work out some sort of LRU scheme for removing entries. While there are
  // plenty of libraries for that and we even use one such in the background
  // script, this code is part of the content script which goes into every page
  // so we try to keep it learn.
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
      if (!result || (result.type === 'words' && result.dbUnavailable)) {
        dropFromCache();
      }
      return result;
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
  let message: SearchRequest | TranslateRequest;
  if (options.wordLookup) {
    message = {
      type: 'search',
      input: text,
      dict: options.dict,
      prevDict: options.prevDict,
      preferNames: options.preferNames,
      includeRomaji: options.includeRomaji,
    };
  } else {
    message = {
      type: 'translate',
      title: text,
      includeRomaji: options.includeRomaji,
    };
  }

  let searchResult: SearchResult | null;
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

  if (searchResult.type === 'kanji' || searchResult.type === 'names') {
    return searchResult;
  }

  let matchLen: number | null = null;
  if (searchResult.type === 'words') {
    matchLen = searchResult.matchLen || 1;
  }
  const more = !!searchResult.more;

  let title: string | undefined;
  if (searchResult.type === 'translate') {
    title = text.substr(0, searchResult.textLen);
    if (text.length > searchResult.textLen) {
      title += '...';
    }
  }

  let names: Array<NameResult> | undefined;
  let moreNames: boolean | undefined;
  let preferNames = false;
  let dbUnavailable = false;
  if (searchResult.type === 'words') {
    names = searchResult.names;
    moreNames = searchResult.moreNames;
    preferNames = searchResult.preferNames;
    dbUnavailable = !!searchResult.dbUnavailable;
  }

  return {
    type: 'words',
    title,
    names,
    moreNames,
    data: searchResult.data,
    matchLen,
    more,
    preferNames,
    dbUnavailable,
  };
}
