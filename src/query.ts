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
  prevDict: DictType | undefined;
  preferNames: boolean;
  wordLookup: boolean;
}

// XXX Add a wrapper for this that memoizes the result

export async function query(
  text: string,
  options: QueryOptions
): Promise<QueryResult | null> {
  let message: SearchRequest | TranslateRequest;
  if (options.wordLookup) {
    message = {
      type: 'search',
      input: text,
      prevDict: options.prevDict,
      preferNames: options.preferNames,
    };
  } else {
    message = {
      type: 'translate',
      title: text,
    };
  }

  let searchResult: SearchResult | null;
  try {
    searchResult = await browser.runtime.sendMessage(message);
  } catch (e) {
    console.error(
      '[rikaichamp] Failed to call query. The page might need to be refreshed.',
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
  if (searchResult.type === 'words') {
    names = searchResult.names;
    moreNames = searchResult.moreNames;
    preferNames = searchResult.preferNames;
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
  };
}
