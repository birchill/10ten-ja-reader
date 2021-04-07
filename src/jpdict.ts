import Bugsnag from '@bugsnag/browser';
import {
  DataSeries,
  DataSeriesState,
  DataVersion,
  NameResult,
  UpdateErrorState,
  UpdateState,
  getKanji,
  getNames,
  getWords as idbGetWords,
} from '@birchill/hikibiki-data';
import { expandChoon, kanaToHiragana } from '@birchill/normal-jp';

import { normalizeInput } from './conversion';
import { ExtensionStorageError } from './extension-storage-error';
import { FlatFileDatabaseLoader, FlatFileDatabaseLoadState } from './flat-file';
import { JpdictWorkerMessage } from './jpdict-worker-messages';
import * as messages from './jpdict-worker-messages';
import {
  KanjiSearchResult,
  NameSearchResult,
  TranslateResult,
  WordSearchResult,
} from './search-result';
import { GetWordsFunction, wordSearch } from './word-search';
import { endsInYoon } from './yoon';

//
// Exported types
//

export type JpdictState = {
  words: {
    state: DataSeriesState;
    version: DataVersion | null;
  };
  kanji: {
    state: DataSeriesState;
    version: DataVersion | null;
  };
  radicals: {
    state: DataSeriesState;
    version: DataVersion | null;
  };
  names: {
    state: DataSeriesState;
    version: DataVersion | null;
  };
  updateState: UpdateState;
  updateError?: UpdateErrorState;
};

export type JpdictStateWithFallback = Omit<JpdictState, 'words'> & {
  words: JpdictState['words'] & {
    fallbackState: FlatFileDatabaseLoadState;
  };
};

//
// Minimum amount of time to wait before checking for database updates.
//

const UPDATE_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

//
// Worker setup
//

const jpdictWorker = new Worker('./rikaichamp-jpdict.js', { type: 'module' });

jpdictWorker.onmessageerror = (evt: MessageEvent) => {
  console.log(`Worker error: ${JSON.stringify(evt)}`);
  Bugsnag.notify(`Worker error: ${JSON.stringify(evt)}`);
};

// Local state tracking
//
// We track some state locally because we want to avoid querying the database
// when it is being updated since this can block for several seconds.

let dbState: JpdictStateWithFallback = {
  words: {
    state: DataSeriesState.Initializing,
    version: null,
    fallbackState: 'unloaded',
  },
  kanji: {
    state: DataSeriesState.Initializing,
    version: null,
  },
  radicals: {
    state: DataSeriesState.Initializing,
    version: null,
  },
  names: {
    state: DataSeriesState.Initializing,
    version: null,
  },
  updateState: { state: 'idle', lastCheck: null },
};

// We treat the names and words dictionaries as unavailable when they are being
// updated because otherwise we can block for seconds waiting to read from them.
function isDataSeriesAvailable(series: DataSeries): boolean {
  return (
    dbState[series].state === DataSeriesState.Ok &&
    (dbState.updateState.state === 'idle' ||
      dbState.updateState.series !== series)
  );
}

// Fallback words database to use if we can't read the IndexedDB one (e.g.
// because we hit a quota error, or because it is currently being updated).

const fallbackDatabaseLoader = new FlatFileDatabaseLoader({
  // If 'process' is defined, we're running in a node environment, which
  // which probably means we're running in a test environment and should not
  // bother trying to call bugsnag.
  bugsnag: typeof process === 'object' ? undefined : Bugsnag,
});

// We also need to track the lastUpdateTime locally. That's because if
// we tried to read it from extension storage when we get worker messages,
// because the API is async, on Chrome we can get situations where we actually
// end up applying the database state messages in the wrong order.

let lastUpdateTime: number | null = null;

//
// Public API
//

export async function initDb({
  lang,
  onUpdate,
}: {
  lang: string;
  onUpdate: (status: JpdictStateWithFallback) => void;
}) {
  lastUpdateTime = await getLastUpdateTime();
  Bugsnag.leaveBreadcrumb(`Got last update time of ${lastUpdateTime}`);

  // Register the listener
  jpdictWorker.onmessage = async (evt: MessageEvent) => {
    const message = evt.data as JpdictWorkerMessage;
    switch (message.type) {
      case 'dbstateupdated':
        {
          // Fill out the lastCheck field in the updateState.
          //
          // This value will only be set if we already did a check this session.
          // It is _not_ a stored value.  So, if it is not set, use the value we
          // stored instead.
          const state = {
            ...message.state,
            words: {
              ...message.state.words,
              fallbackState: dbState.words.fallbackState,
            },
          };
          if (state.updateState.lastCheck === null && lastUpdateTime) {
            state.updateState.lastCheck = new Date(lastUpdateTime);
          }
          dbState = state;

          onUpdate(state);
        }
        break;

      case 'dbupdatecomplete':
        if (message.lastCheck) {
          setLastUpdateTime(message.lastCheck.getTime());
        }
        break;

      case 'breadcrumb':
        Bugsnag.leaveBreadcrumb(message.message);
        break;

      case 'error':
        Bugsnag.notify(
          { name: message.name, message: message.message },
          (event) => {
            event.severity = message.severity as 'error' | 'warning';
          }
        );
        break;
    }
  };

  // Make sure updates to the fallback database loading state are also reported.
  //
  // But first, reset any loads that might have errored or hung so that the
  // user can retry the load by disabling/enabling the add-on.
  fallbackDatabaseLoader.resetIfNotLoaded();
  fallbackDatabaseLoader.onUpdate = (
    fallbackDatabaseState: FlatFileDatabaseLoadState
  ) => {
    dbState.words.fallbackState = fallbackDatabaseState;
    onUpdate(dbState);
  };

  // Fetch the initial state
  jpdictWorker.postMessage(messages.queryState());

  // If we updated within the minimum window then we're done.
  if (lastUpdateTime && Date.now() - lastUpdateTime < UPDATE_THRESHOLD_MS) {
    Bugsnag.leaveBreadcrumb('Downloaded data is up-to-date');
    return;
  }

  updateDb({ lang, force: false });
}

async function getLastUpdateTime(): Promise<number | null> {
  try {
    const getResult = await browser.storage.local.get('lastDbUpdateTime');
    if (typeof getResult.lastDbUpdateTime === 'number') {
      return getResult.lastDbUpdateTime as number;
    }
  } catch (_) {
    // Extension storage can sometimes randomly fail with 'An unexpected error
    // occurred'. Ignore, but log it.
    Bugsnag.notify(
      new ExtensionStorageError({
        key: 'lastDbUpdateTime',
        action: 'get',
      }),
      (event) => {
        event.severity = 'warning';
      }
    );
  }

  return null;
}

async function setLastUpdateTime(time: number | null) {
  // Make sure to update the local version too.
  lastUpdateTime = time;

  // Extension storage can randomly fail with "An unexpected error occurred".
  try {
    if (time) {
      await browser.storage.local.set({
        lastDbUpdateTime: time,
      });
    } else {
      await browser.storage.local.remove('lastDbUpdateTime');
    }

    // Try to remove any old value we stored so we don't end up using it
    // accidentally.
    browser.storage.local.remove('lastUpdateKanjiDb').catch(() => {
      /* Ignore */
    });
  } catch (e) {
    Bugsnag.notify(
      new ExtensionStorageError({
        key: 'lastDbUpdateTime',
        action: 'set',
      }),
      (event) => {
        event.severity = 'warning';
      }
    );
  }
}

export function updateDb({ lang, force }: { lang: string; force: boolean }) {
  jpdictWorker.postMessage(messages.updateDb({ lang, force }));
}

export function cancelUpdateDb() {
  jpdictWorker.postMessage(messages.cancelDbUpdate());
}

export function deleteDb() {
  jpdictWorker.postMessage(messages.deleteDb());
  setLastUpdateTime(null);
}

// ---------------------------------------------------------------------------
//
// Words
//
// ---------------------------------------------------------------------------

const WORDS_MAX_ENTRIES = 7;

export async function searchWords({
  input,
  max = 0,
  includeRomaji = false,
}: {
  input: string;
  max?: number;
  includeRomaji?: boolean;
}): Promise<WordSearchResult | null> {
  let [word, inputLengths] = normalizeInput(input);
  word = kanaToHiragana(word);

  const maxResults =
    max > 0 ? Math.min(WORDS_MAX_ENTRIES, max) : WORDS_MAX_ENTRIES;

  // Determine which dictionary to use: The IndexedDB one or the flat-file
  // fallback dictionary.
  let getWords: GetWordsFunction;
  if (isDataSeriesAvailable('words')) {
    getWords = ({ input, maxResults }: { input: string; maxResults: number }) =>
      idbGetWords(input, { matchType: 'exact', limit: maxResults });
  } else {
    try {
      const flatFileDatabase = await fallbackDatabaseLoader.database;
      getWords = flatFileDatabase.getWords.bind(flatFileDatabase);
    } catch (_) {
      return null;
    }
  }

  // Setup a list of strings to try that includes all the possible expansions of
  // ー characters.
  const candidateWords = [word, ...expandChoon(word)];

  let result: WordSearchResult | null = null;
  for (const candidate of candidateWords) {
    // Try this particular expansion of any choon
    const thisResult = await wordSearch({
      getWords,
      input: candidate,
      inputLengths,
      maxResults,
      includeRomaji,
    });

    // Replace the result if we got a longer match
    if (!result || (thisResult && thisResult.matchLen > result.matchLen)) {
      result = thisResult;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
//
// Translate
//
// ---------------------------------------------------------------------------

export async function translate({
  text,
  includeRomaji = false,
}: {
  text: string;
  includeRomaji?: boolean;
}): Promise<TranslateResult | null> {
  const result: TranslateResult = {
    type: 'translate',
    data: [],
    textLen: text.length,
    more: false,
  };

  let skip: number;
  while (text.length > 0) {
    const searchResult = await searchWords({
      input: text,
      max: 1,
      includeRomaji,
    });

    if (searchResult && searchResult.data) {
      if (result.data.length >= WORDS_MAX_ENTRIES) {
        result.more = true;
        break;
      }

      // Just take first match
      result.data.push(searchResult.data[0]);
      skip = searchResult.matchLen;
    } else {
      skip = 1;
    }
    text = text.substr(skip, text.length - skip);
  }

  if (result.data.length === 0) {
    return null;
  }

  result.textLen -= text.length;
  return result;
}

// ---------------------------------------------------------------------------
//
// Kanji
//
// ---------------------------------------------------------------------------

export async function searchKanji(
  kanji: string
): Promise<KanjiSearchResult | null> {
  // Pre-check (might not be needed anymore)
  const codepoint = kanji.charCodeAt(0);
  if (codepoint < 0x3000) {
    return null;
  }

  if (
    dbState.kanji.state !== DataSeriesState.Ok ||
    dbState.radicals.state !== DataSeriesState.Ok
  ) {
    return null;
  }

  const logWarningMessage = (message: string) => {
    Bugsnag.notify(message, (event) => {
      event.severity = 'warning';
    });
  };

  let result;
  try {
    result = await getKanji({
      kanji: [kanji],
      lang: dbState.kanji.version?.lang ?? 'en',
      logWarningMessage,
    });
  } catch (e) {
    console.error(e);
    Bugsnag.notify(e || '(Error looking up kanji)');
    return null;
  }

  if (!result.length) {
    return null;
  }

  if (result.length > 1) {
    logWarningMessage(`Got more than one result for ${kanji}`);
  }

  return {
    type: 'kanji',
    data: result[0],
    matchLen: 1,
  };
}

// ---------------------------------------------------------------------------
//
// Names
//
// ---------------------------------------------------------------------------

const NAMES_MAX_ENTRIES = 20;

export async function searchNames({
  input,
  minLength,
}: {
  input: string;
  minLength?: number;
}): Promise<NameSearchResult | null> {
  if (!isDataSeriesAvailable('names')) {
    return null;
  }

  let [normalized, inputLengths] = normalizeInput(input);

  // Setup a list of strings to try that includes all the possible expansions of
  // ー characters.
  const candidates = [normalized, ...expandChoon(normalized)];

  let result: NameSearchResult | null = null;
  for (const candidate of candidates) {
    let thisResult = await doNameSearch({
      input: candidate,
      inputLengths,
      minInputLength: minLength,
    });

    if (!result || (thisResult && thisResult.matchLen > result.matchLen)) {
      result = thisResult;
    }
  }

  return result;
}

async function doNameSearch({
  input,
  inputLengths,
  minInputLength,
}: {
  input: string;
  inputLengths: Array<number>;
  minInputLength?: number;
}): Promise<NameSearchResult | null> {
  let result: NameSearchResult = {
    type: 'names',
    data: [],
    more: false,
    matchLen: 0,
  };

  // Record the position of existing entries for grouping purposes
  let existingItems = new Map<string, number>();

  let currentString = input;
  let longestMatch = 0;

  while (currentString.length > 0) {
    const currentInputLength = inputLengths[currentString.length];
    if (minInputLength && minInputLength > currentInputLength) {
      break;
    }

    let names: Array<NameResult>;
    try {
      names = await getNames(currentString);
    } catch (e) {
      console.error(e);
      Bugsnag.notify(e || '(Error looking up names)');
      return null;
    }

    if (names.length) {
      longestMatch = Math.max(longestMatch, currentInputLength);
    }

    for (const name of names) {
      // We group together entries where the kana readings and translation
      // details are all equal.
      const nameContents =
        name.r.join('-') +
        '#' +
        name.tr
          .map(
            (tr) =>
              `${(tr.type || []).join(',')}-${tr.det.join(',')}${
                tr.cf ? '-' + tr.cf.join(',') : ''
              }`
          )
          .join(';');

      // Check for an existing entry to combine with
      const existingIndex = existingItems.get(nameContents);
      if (typeof existingIndex !== 'undefined') {
        const existingEntry = result.data[existingIndex];
        if (name.k) {
          if (!existingEntry.k) {
            existingEntry.k = [];
          }
          existingEntry.k.push(...name.k);
        }
      } else {
        result.data.push({ ...name, matchLen: currentInputLength });
        existingItems.set(nameContents, result.data.length - 1);
      }

      if (result.data.length >= NAMES_MAX_ENTRIES) {
        break;
      }
    }

    if (result.data.length >= NAMES_MAX_ENTRIES) {
      break;
    }

    // Shorten input, but don't split a ようおん (e.g. きゃ).
    const lengthToShorten = endsInYoon(currentString) ? 2 : 1;
    currentString = currentString.substr(
      0,
      currentString.length - lengthToShorten
    );
  }

  if (!result.data.length) {
    return null;
  }

  result.matchLen = longestMatch;
  return result;
}
