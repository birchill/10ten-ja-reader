// Currently the background process will return structured data for kanji and
// names data but not for word data (we're still in the processing of doing
// that).

export interface WordEntry {
  kanjiKana: string;
  kana: string[];
  romaji: string[];
  definition: string;
  reason: string | null;
}

export interface WordsQueryResult {
  type: 'words';
  title: string | null;
  data: Array<WordEntry>;
  names?: Array<NameResult>;
  moreNames?: boolean;
  matchLen: number | null;
  more: boolean;
}

export type QueryResult =
  | WordsQueryResult
  | NameSearchResult
  | KanjiSearchResult;

export interface QueryOptions {
  dictMode: DictMode;
  wordLookup: boolean;
}

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

  if (searchResult.type === 'kanji' || searchResult.type === 'names') {
    return searchResult;
  }

  let matchLen: number | null = null;
  if (searchResult.type === 'words') {
    matchLen = searchResult.matchLen || 1;
  }
  const more = !!searchResult.more;

  let title: string | null = null;
  if (searchResult.type === 'translate') {
    title = text.substr(0, searchResult.textLen);
    if (text.length > searchResult.textLen) {
      title += '...';
    }
  }

  let names: Array<NameResult> | undefined;
  let moreNames: boolean | undefined;
  if (searchResult.type === 'words') {
    names = searchResult.names;
    moreNames = searchResult.moreNames;
  }

  return {
    type: 'words',
    title,
    names,
    moreNames,
    data: parseWordEntries(searchResult),
    matchLen,
    more,
  };
}

function parseWordEntries(
  searchResult: RawWordSearchResult | RawTranslateResult
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
  for (const [dictEntry, reason, romaji] of searchResult.data) {
    const matches = dictEntry.match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
    if (!matches) {
      continue;
    }
    let [kanjiKana, kana, definition] = matches.slice(1);

    // Replace / separators in definition with ;
    definition = definition.replace(/\//g, '; ');

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
      if (romaji) {
        prevEntry.romaji.push(romaji);
      }
      continue;
    }

    const entry: WordEntry = {
      kanjiKana,
      kana: [],
      romaji: [],
      definition,
      reason,
    };
    if (kana) {
      entry.kana.push(kana);
    }
    if (romaji) {
      entry.romaji.push(romaji);
    }
    result.push(entry);
  }

  return result;
}
