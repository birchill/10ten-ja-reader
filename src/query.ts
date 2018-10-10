// Currently the background process will parse out the kanji data before
// returning it but not the word/name data. Who knows why.
//
// Ultimately all parsing should happen in the background process (since we'll
// eventually store the records as actually JS(ON) objects) but there will still
// probably be some pre-processing on the content side to coalesce records etc.

export interface WordEntry {
  kanjiKana: string;
  kana: string[];
  definition: string;
  reason: string | null;
}

export interface NameEntry {
  names: { kanji?: string; kana: string }[];
  definition: string;
}

export interface QueryResult {
  title: string | null;
  data: KanjiEntry | Array<WordEntry> | Array<NameEntry>;
  names: boolean;
  matchLen: number | null;
  more: boolean;
}

export interface QueryOptions {
  dictMode: DictMode;
  wordLookup: boolean;
}

const isKanjiEntry = (result: SearchResult): result is KanjiEntry =>
  (result as KanjiEntry).kanji !== undefined;

const isNamesEntry = (result: SearchResult): result is WordSearchResult =>
  (result as WordSearchResult).names !== undefined;

// XXX Add a wrapper for this that memoizes when dictMode is Default

export async function query(
  text: string,
  options: QueryOptions
): Promise<QueryResult | null> {
  let message;
  if (options.wordLookup) {
    message = {
      type: 'xsearch',
      text: text,
      dictOption: options.dictMode,
    };
  } else {
    message = {
      type: 'translate',
      title: text,
    };
  }

  const searchResult: SearchResult = await browser.runtime.sendMessage(message);

  if (!searchResult) {
    return null;
  }

  let title: string | null = null;
  if (!options.wordLookup) {
    title = text.substr(0, (searchResult as TranslateResult).textLen);
    if (text.length > (searchResult as TranslateResult).textLen) {
      title += '...';
    }
  }

  let names = false;
  let data: KanjiEntry | Array<WordEntry> | Array<NameEntry>;
  if (isKanjiEntry(searchResult)) {
    data = searchResult;
  } else if (isNamesEntry(searchResult)) {
    data = parseNameEntries(searchResult);
    names = true;
  } else {
    data = parseWordEntries(searchResult);
  }

  let matchLen: number | null = null;
  if (options.wordLookup) {
    matchLen = (searchResult as WordSearchResult).matchLen || 1;
  }

  const more =
    searchResult.hasOwnProperty('more') &&
    !!(searchResult as LookupResult).more;

  return {
    title,
    data,
    names,
    matchLen,
    more,
  };
}

function parseNameEntries(
  wordSearchResult: WordSearchResult
): Array<NameEntry> {
  const result: Array<NameEntry> = [];

  for (const [dictEntry] of wordSearchResult.data) {
    // See parseWordEntries for an explanation of the format here
    const matches = dictEntry.match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
    if (!matches) {
      continue;
    }
    let [kanjiKana, kana, definition] = matches.slice(1);

    // Sometimes for names when we have a mix of katakana and hiragana we
    // actually have the same format in the definition field, e.g.
    //
    //  あか組４ [あかぐみふぉー] /あか組４ [あかぐみフォー] /Akagumi Four (h)//
    //
    // So we try reprocessing the definition field using the same regex.
    const rematch = definition.match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
    if (rematch) {
      [kanjiKana, kana, definition] = rematch.slice(1);
    }
    const name = kana
      ? { kanji: kanjiKana, kana }
      : { kanji: undefined, kana: kanjiKana };

    // Combine with previous entry if the definitions match.
    const prevEntry = result.length ? result[result.length - 1] : null;
    if (prevEntry && prevEntry.definition === definition) {
      prevEntry.names.push(name);
      continue;
    }

    result.push({
      names: [name],
      definition,
    });
  }

  return result;
}

function parseWordEntries(
  searchResult: WordSearchResult | TranslateResult
): Array<WordEntry> {
  // Parse entries, parsing them and combining them when the kanji and
  // definition match.
  //
  // Each dictionary entry has the format:
  //
  //   仔クジラ [こくじら] /(n) whale calf/
  //
  // Or without kana reading:
  //
  //   あっさり /(adv,adv-to,vs,on-mim) easily/readily/quickly/(P)/
  //
  const result: Array<WordEntry> = [];
  for (const [dictEntry, reason] of searchResult.data) {
    const matches = dictEntry.match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
    if (!matches) {
      continue;
    }
    const [kanjiKana, kana, definition] = matches.slice(1);

    // Combine with previous entry if both kanji and definition match.
    const prevEntry = result.length ? result[result.length - 1] : null;
    if (
      prevEntry &&
      prevEntry.kanjiKana === kanjiKana &&
      prevEntry.definition === definition
    ) {
      if (kana) {
        prevEntry.kana.push(kana);
      }
      continue;
    }

    const entry: WordEntry = {
      kanjiKana,
      kana: [],
      definition,
      reason,
    };
    if (kana) {
      entry.kana.push(kana);
    }
    result.push(entry);
  }

  return result;
}
