import Bugsnag from '@birchill/bugsnag-zero';
import {
  DataSeries,
  DataSeriesState,
  DataVersion,
  UpdateErrorState,
  UpdateState,
  getKanji,
  getWords as idbGetWords,
} from '@birchill/jpdict-idb';
import { kanaToHiragana } from '@birchill/normal-jp';
import browser from 'webextension-polyfill';

import { normalizeInput } from '../utils/normalize-input';
import { JpdictWorkerBackend } from '../worker/jpdict-worker-backend';

import { FlatFileDatabaseLoadState, FlatFileDatabaseLoader } from './flat-file';
import { JpdictBackend, JpdictLocalBackend } from './jpdict-backend';
import { JpdictEvent } from './jpdict-events';
import { nameSearch } from './name-search';
import {
  KanjiSearchResult,
  NameSearchResult,
  TranslateResult,
  WordSearchResult,
} from './search-result';
import { GetWordsFunction, wordSearch } from './word-search';

//
// Exported types
//

export type JpdictState = {
  words: { state: DataSeriesState; version: DataVersion | null };
  kanji: { state: DataSeriesState; version: DataVersion | null };
  radicals: { state: DataSeriesState; version: DataVersion | null };
  names: { state: DataSeriesState; version: DataVersion | null };
  updateState: UpdateState;
  updateError?: UpdateErrorState;
};

export type JpdictStateWithFallback = Omit<JpdictState, 'words'> & {
  words: JpdictState['words'] & { fallbackState: FlatFileDatabaseLoadState };
};

//
// Minimum amount of time to wait before checking for database updates.
//

const UPDATE_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12 hours

//
// Backend setup
//

const backend: JpdictBackend =
  'Worker' in self ? new JpdictWorkerBackend() : new JpdictLocalBackend();

// Local state tracking
//
// We track some state locally because we want to avoid querying the database
// when it is being updated since this can block for several seconds.

let dbState: JpdictStateWithFallback = {
  words: { state: 'init', version: null, fallbackState: 'unloaded' },
  kanji: { state: 'init', version: null },
  radicals: { state: 'init', version: null },
  names: { state: 'init', version: null },
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

let initPromise: Promise<void> | undefined;
let initComplete = false;

export async function initDb({
  lang,
  onUpdate,
}: {
  lang: string;
  onUpdate: (status: JpdictStateWithFallback) => void;
}) {
  if (initPromise) {
    await initPromise;
    return;
  }

  let resolveInitPromise: () => void;
  initPromise = new Promise((resolve) => {
    resolveInitPromise = resolve;
  });

  lastUpdateTime = await getLastUpdateTime();
  Bugsnag.leaveBreadcrumb(`Got last update time of ${lastUpdateTime}`);

  // Register the listener
  backend.addEventListener(async (event: JpdictEvent) => {
    switch (event.type) {
      case 'dbstateupdated':
        {
          // Prepare the new state while preserving the existing fallback state.
          const state = {
            ...event.state,
            words: {
              ...event.state.words,
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

          try {
            onUpdate(state);
          } catch (e) {
            void Bugsnag.notify(e);
          }

          if (!initComplete) {
            initComplete = true;
            resolveInitPromise();
          }
        }
        break;

      case 'dbupdatecomplete':
        if (event.lastCheck) {
          void setLastUpdateTime(event.lastCheck.getTime());
        }
        break;

      case 'breadcrumb':
        Bugsnag.leaveBreadcrumb(event.message);
        break;

      case 'error':
        {
          const error = new Error(event.message);
          error.name = event.name;
          error.stack = event.stack;
          void Bugsnag.notify(error, { severity: event.severity });
        }
        break;
    }
  });

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
  backend.queryState();

  // If we updated within the minimum window then we don't need to update
  if (lastUpdateTime && Date.now() - lastUpdateTime < UPDATE_THRESHOLD_MS) {
    Bugsnag.leaveBreadcrumb('Downloaded data is up-to-date');
  } else {
    updateDb({ lang, force: false });
  }

  await initPromise;
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
    console.warn('Failed to get last update time from storage');
  }

  return null;
}

async function setLastUpdateTime(time: number | null) {
  // Make sure to update the local version too.
  lastUpdateTime = time;

  // Extension storage can randomly fail with "An unexpected error occurred".
  try {
    if (time) {
      await browser.storage.local.set({ lastDbUpdateTime: time });
    } else {
      await browser.storage.local.remove('lastDbUpdateTime');
    }

    // Try to remove any old value we stored so we don't end up using it
    // accidentally.
    browser.storage.local.remove('lastUpdateKanjiDb').catch(() => {
      /* Ignore */
    });
  } catch {
    // Don't notify Bugsnag because this is a common error in Firefox.
  }
}

export function updateDb(params: { lang: string; force: boolean }) {
  backend.updateDb(params);
}

export function cancelUpdateDb() {
  backend.cancelUpdateDb();
}

export function deleteDb() {
  backend.deleteDb();
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
    dbStatus: 'updating' | 'unavailable' | undefined,
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
  input: string
): Promise<KanjiSearchResult | null | 'unavailable' | 'updating'> {
  const kanjiStatus = getDataSeriesStatus('kanji');
  const radicalStatus = getDataSeriesStatus('radicals');
  if (kanjiStatus === 'unavailable' || radicalStatus === 'unavailable') {
    return 'unavailable';
  }

  if (kanjiStatus === 'updating' || radicalStatus === 'updating') {
    return 'updating';
  }

  // Normalize the input in order to be able to parse radicals as kanji.
  const [normalized] = normalizeInput(input);

  // Do some very elementary filtering on kanji
  //
  // We know that the input should be mostly Japanese so we just do some very
  // basic filtering to drop any hiragana / katakana.
  //
  // We _could_ do a more thoroughgoing check based on all the different Unicode
  // ranges but they're constantly being expanded and if some obscure character
  // ends up in the kanji database we want to show it even if it doesn't match
  // our expectations of what characters are kanji.
  const kanjiLastIndex = new Map<string, number>();
  const kanji = [
    ...new Set(
      [...normalized].filter((c, i) => {
        const cp = c.codePointAt(0)!;
        const isKanji =
          // Don't bother looking up Latin text
          cp >= 0x3000 &&
          // Or hiragana (yeah, 0x1b0001 is also hiragana but this is good enough)
          !(cp >= 0x3040 && cp <= 0x309f) &&
          // Or katakana
          !(cp >= 0x30a0 && cp <= 0x30ff) &&
          !(cp >= 0x31f0 && cp <= 0x31ff) &&
          // Or half-width katakana
          !(cp >= 0xff65 && cp <= 0xff9f);
        if (isKanji) {
          kanjiLastIndex.set(c, i);
        }

        return isKanji;
      })
    ),
  ];

  const logWarningMessage = (message: string) => {
    // Ignore certain warnings that are not currently meaningful
    if (message.startsWith("Couldn't find a radical or kanji entry for")) {
      return;
    }

    void Bugsnag.notify(message, { severity: 'warning' });
  };

  let result;
  try {
    result = await getKanji({
      kanji,
      lang: dbState.kanji.version?.lang ?? 'en',
      logWarningMessage,
    });
  } catch (e) {
    console.error('Error looking up kanji', e);
    void Bugsnag.notify(e || '(Error looking up kanji)');
    return null;
  }

  if (!result.length) {
    return null;
  }

  // Work out what the last matched character was
  const matchLen =
    Math.max(...result.map((r) => kanjiLastIndex.get(r.c) || 0)) + 1;

  return { type: 'kanji', data: result, matchLen };
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
