import Bugsnag from '@bugsnag/browser';
import {
  DataSeries,
  DataSeriesState,
  DataVersion,
  getKanji,
  getWords as idbGetWords,
  UpdateErrorState,
  UpdateState,
} from '@birchill/jpdict-idb';
import { kanaToHiragana } from '@birchill/normal-jp';
import browser from 'webextension-polyfill';

import { ExtensionStorageError } from '../common/extension-storage-error';
import { normalizeInput } from '../utils/normalize-input';
import { JpdictWorkerMessage } from '../worker/jpdict-worker-messages';
import * as messages from '../worker/jpdict-worker-messages';

import { FlatFileDatabaseLoader, FlatFileDatabaseLoadState } from './flat-file';
import {
  KanjiSearchResult,
  NameSearchResult,
  TranslateResult,
  WordSearchResult,
} from './search-result';
import { GetWordsFunction, wordSearch } from './word-search';
import { nameSearch } from './name-search';

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

const jpdictWorker = new Worker('./10ten-ja-jpdict.js', { type: 'module' });

jpdictWorker.onmessageerror = (event: MessageEvent) => {
  console.error(`Worker error: ${JSON.stringify(event)}`);
  Bugsnag.notify(`Worker error: ${JSON.stringify(event)}`);
};

// Local state tracking
//
// We track some state locally because we want to avoid querying the database
// when it is being updated since this can block for several seconds.

let dbState: JpdictStateWithFallback = {
  words: {
    state: 'init',
    version: null,
    fallbackState: 'unloaded',
  },
  kanji: {
    state: 'init',
    version: null,
  },
  radicals: {
    state: 'init',
    version: null,
  },
  names: {
    state: 'init',
    version: null,
  },
  updateState: { type: 'idle', lastCheck: null },
};

// Is the IDB database available for the given series?
//
// We structure the tables and access them in a way that means we _should_ be
// able to use, e.g., the 'words' table in a performant manner while the 'names'
// table is being updated, but this doesn't appear to work for Chrome which
// suffers significant lag when any tables in the database are being accessed.
//
// As a result we simply don't touch IDB while it's being updated.
function getDataSeriesStatus(
  series: DataSeries
): 'ok' | 'updating' | 'unavailable' {
  // If we're unavailable or initializing, treat the database as unavailable
  // regardless of whether or not we're updating.
  if (
    dbState[series].state === 'unavailable' ||
    dbState[series].state === 'init'
  ) {
    return 'unavailable';
  }

  // Otherwise, whether we're empty or ok, check if we're updating.
  if (dbState.updateState.type !== 'idle') {
    return 'updating';
  }

  // Otherwise treat empty as unavailable.
  return dbState[series].state === 'ok' ? 'ok' : 'unavailable';
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
  jpdictWorker.onmessage = async (event: MessageEvent) => {
    const message = event.data as JpdictWorkerMessage;
    switch (message.type) {
      case 'dbstateupdated':
        {
          // Prepare the new state while preserving the existing fallback state.
          const state = {
            ...message.state,
            words: {
              ...message.state.words,
              fallbackState: dbState.words.fallbackState,
            },
          };

          // Fill out the lastCheck field in the updateState.
          //
          // This value will only be set if we already did a check this session.
          // It is _not_ a stored value.  So, if it is not set, use the value we
          // stored instead.
          if (state.updateState.lastCheck === null && lastUpdateTime) {
            state.updateState.lastCheck = new Date(lastUpdateTime);
          }

          dbState = state;

          onUpdate(state);
        }
        break;

      case 'dbupdatecomplete':
        if (message.lastCheck) {
          void setLastUpdateTime(message.lastCheck.getTime());
        }
        break;

      case 'breadcrumb':
        Bugsnag.leaveBreadcrumb(message.message);
        break;

      case 'error':
        {
          const error = new Error(message.message);
          error.name = message.name;
          error.stack = message.stack;
          Bugsnag.notify(error, (event) => {
            event.severity = message.severity as 'error' | 'warning';
          });
        }
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
  } catch {
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
  } catch {
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
  void setLastUpdateTime(null);
}

// ---------------------------------------------------------------------------
//
// Words
//
// ---------------------------------------------------------------------------

const WORDS_MAX_ENTRIES = 7;

export async function searchWords({
  input,
  abortSignal,
  includeRomaji = false,
  max = 0,
}: {
  input: string;
  abortSignal?: AbortSignal;
  includeRomaji?: boolean;
  max?: number;
}): Promise<
  [
    result: WordSearchResult | null,
    dbStatus: 'updating' | 'unavailable' | undefined
  ]
> {
  let [word, inputLengths] = normalizeInput(input);

  const maxResults =
    max > 0 ? Math.min(WORDS_MAX_ENTRIES, max) : WORDS_MAX_ENTRIES;

  // Determine which dictionary to use: The IndexedDB one or the flat-file
  // fallback dictionary.
  let getWords: GetWordsFunction;
  const dbStatus = getDataSeriesStatus('words');
  if (dbStatus === 'ok') {
    getWords = ({ input, maxResults }: { input: string; maxResults: number }) =>
      idbGetWords(input, { matchType: 'exact', limit: maxResults });
  } else {
    try {
      const flatFileDatabase = await fallbackDatabaseLoader.database;
      getWords = flatFileDatabase.getWords.bind(flatFileDatabase);
      // The IDB database handles kana variations but for the flat file database
      // we need to do it ourselves.
      word = kanaToHiragana(word);
    } catch {
      return [null, dbStatus];
    }
  }

  return [
    await wordSearch({
      abortSignal,
      getWords,
      input: word,
      inputLengths,
      maxResults,
      includeRomaji,
    }),
    dbStatus !== 'ok' ? dbStatus : undefined,
  ];
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
    const [searchResult, dbStatus] = await searchWords({
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

    if (searchResult && dbStatus) {
      result.dbStatus = dbStatus;
    }

    text = text.substring(skip);
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
): Promise<KanjiSearchResult | null | 'unavailable' | 'updating'> {
  // Pre-check (might not be needed anymore)
  const codepoint = kanji.codePointAt(0);
  if (!codepoint || codepoint < 0x3000) {
    return null;
  }

  const kanjiStatus = getDataSeriesStatus('kanji');
  const radicalStatus = getDataSeriesStatus('radicals');
  if (kanjiStatus === 'unavailable' || radicalStatus === 'unavailable') {
    return 'unavailable';
  }

  if (kanjiStatus === 'updating' || radicalStatus === 'updating') {
    return 'updating';
  }

  const logWarningMessage = (message: string) => {
    // Ignore certain warnings that are not currently meaningful
    if (message.startsWith("Couldn't find a radical or kanji entry for")) {
      return;
    }

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
  abortSignal,
  input,
  minLength,
}: {
  abortSignal?: AbortSignal;
  input: string;
  minLength?: number;
}): Promise<NameSearchResult | null | 'unavailable' | 'updating'> {
  const dbStatus = getDataSeriesStatus('names');
  if (dbStatus !== 'ok') {
    return dbStatus;
  }

  const [normalized, inputLengths] = normalizeInput(input);

  return nameSearch({
    abortSignal,
    input: normalized,
    inputLengths,
    minInputLength: minLength,
    maxResults: NAMES_MAX_ENTRIES,
  });
}
