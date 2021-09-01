import * as s from 'superstruct';
import { browser } from 'webextension-polyfill-ts';

import { BackgroundMessageSchema } from './background-message';
import { BackgroundRequest } from './background-request';
import { hasKatakana } from './char-range';
import {
  FullSearchResult,
  InitialSearchResult,
  KanjiSearchResult,
  NameResult,
  NameSearchResult,
  TranslateResult,
  WordSearchResult,
} from './search-result';
import { stripFields } from './strip-fields';

export type QueryResult = {
  words: WordSearchResult | null;
  kanji?: KanjiSearchResult | null;
  names?: NameSearchResult | null;

  // Metadata
  title?: string;
  namePreview?: NamePreview;
  resultType:
    | InitialSearchResult['resultType']
    | FullSearchResult['resultType'];
};

export type NamePreview = {
  names: Array<NameResult>;
  more: boolean;
};

export interface QueryOptions {
  includeRomaji: boolean;
  wordLookup: boolean;
  updateQueryResult: (result: QueryResult | null) => void;
}

type QueryCacheEntry = {
  key: string;

  // We'd like to cache a Promise representing the initial request (in fact,
  // we used to do that), but that's problematic when the result is returned in
  // two steps.
  //
  // e.g. imagine the following sequence:
  //
  // 1. Search for 'A'
  // 2. Get back initial result for 'A'. Meanwhile the background page is doing
  //    a full search for 'A'.
  // 3. Search for 'B'.
  // 4. Background page detects an overlapping request, cancels the full search
  //    for 'A' and sends back 'null' indicating the full search was cancelled.
  // 5. Meanwhile we trigger another search for 'A' before we get back the null
  //    result (which would clear the entry from our cache).
  // 6. Since we still have the initial result for 'A' in the cache, we return
  //    that, assuming the full result will come in time.
  //
  //    But it won't. As a result the users sees the initial result for 'A'
  //    and it appears to be a partial result.
  //
  // So, for now, the simplest thing is just to cache the result once we have a
  // _full_ result. That might mean a few overlapping requests but hopefully the
  // speed-up from the two-step search covers up for that.
  query: QueryResult;
};

let queryCache: Array<QueryCacheEntry> = [];

const callbackRegistry: Array<(result: QueryResult | null) => void> = [];
let callbackIndex = 0;

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
    return cachedEntry.query;
  }

  const requestId = callbackIndex++;

  try {
    const queryResult = await doQuery(text, { ...options, requestId });

    // If we are expecting a follow-up result, add the callback to the registry.
    if (queryResult && !queryResult.resultType.startsWith('db-')) {
      callbackRegistry[requestId] = options.updateQueryResult;
    }

    // The initial result only ever has the words filled-in so if that's
    // missing, return null.
    return queryResult?.words ? queryResult : null;
  } catch {
    return null;
  }
}

async function doQuery(
  text: string,
  options: QueryOptions & { requestId: number }
): Promise<QueryResult | null> {
  const message: BackgroundRequest = {
    type: options.wordLookup ? 'search' : 'translate',
    input: text,
    includeRomaji: options.includeRomaji,
    requestId: options.requestId,
  };

  let searchResult: InitialSearchResult | TranslateResult | null;
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

  let queryResult: QueryResult;

  // Convert a translate result into a suitably shaped QueryResult but
  // with the title part filled-in.
  if (isTranslateResult(searchResult)) {
    let title = text.substr(0, searchResult.textLen);
    if (text.length > searchResult.textLen) {
      title += '...';
    }
    queryResult = {
      words: {
        ...stripFields(searchResult, ['resultType', 'textLen']),
        type: 'words',
        matchLen: searchResult.textLen,
      },
      title,
      resultType: searchResult.resultType,
    };
  } else {
    queryResult = searchResult;
  }

  return queryResult;
}

function isTranslateResult(
  result: InitialSearchResult | TranslateResult
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

function addToCache({
  key,
  queryResult,
}: {
  key: string;
  queryResult: QueryResult;
}) {
  // Limit the cache to 10 entries. This cache is really just here for the case
  // when the user is moving the cursor back and forward along a word and
  // therefore running the same query multiple times.
  if (queryCache.length > 10) {
    queryCache.shift();
  }

  queryCache.push({ key: key, query: queryResult });
}

browser.runtime.onMessage.addListener((message: unknown) => {
  s.assert(message, BackgroundMessageSchema);

  if (message.type !== 'updateSearchResult') {
    return;
  }

  let result = message.result as FullSearchResult | null;
  let queryResult: QueryResult | null = result
    ? {
        words: result.words,
        kanji: result.kanji,
        names: result.names,
        resultType: 'full',
      }
    : null;

  if (queryResult) {
    queryResult = addNamePreview(queryResult);
    const key = getCacheKey({
      text: result!.request.input,
      includeRomaji: !!result!.request.includeRomaji,
      // Translate lookups never have a two step result
      wordLookup: true,
    });
    addToCache({ key, queryResult });
  }

  // Call the callback
  const requestId = result?.request.requestId;
  if (requestId && callbackRegistry[requestId]) {
    callbackRegistry[requestId](queryResult);
    delete callbackRegistry[requestId];
  }
});
