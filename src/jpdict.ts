import Bugsnag from '@bugsnag/browser';
import {
  DataSeriesState,
  DataVersion,
  NameResult,
  UpdateErrorState,
  UpdateState,
  getKanji,
  getNames,
} from '@birchill/hikibiki-data';
import { expandChoon } from '@birchill/normal-jp';

import { normalizeInput } from './conversion';
import { ExtensionStorageError } from './extension-storage-error';
import { JpdictWorkerMessage } from './jpdict-worker-messages';
import * as messages from './jpdict-worker-messages';
import { endsInYoon } from './yoon';

//
// Exported types
//

export type JpdictState = {
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

let dbState: JpdictState = {
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

function kanjiDbLang(): string {
  return dbState.kanji.version?.lang ?? 'en';
}

function isNamesDbAvailable(): boolean {
  return (
    dbState.names.state === DataSeriesState.Ok &&
    (dbState.updateState.state === 'idle' ||
      dbState.updateState.series !== 'names')
  );
}

// We also need to track the lastUpdateTime locally. That's because if
// we tried to read it from extension storage when we get worker messages,
// because the API is async, on Chrome we can get situations where we actually
// end up apply the database state messages in the wrong order.

let lastUpdateTime: number | null = null;

//
// Public API
//

export async function initDb({
  lang,
  onUpdate,
}: {
  lang: string;
  onUpdate: (status: JpdictState) => void;
}) {
  lastUpdateTime = await getLastUpdateTime();
  Bugsnag.leaveBreadcrumb(`Got last update time of ${lastUpdateTime}`);

  // Register the listener
  jpdictWorker.onmessage = async (evt: MessageEvent) => {
    switch ((evt.data as JpdictWorkerMessage).type) {
      case 'dbstateupdated':
        {
          // Fill out the lastCheck field in the updateState.
          //
          // This value will only be set if we already did a check this session.
          // It is _not_ a stored value.  So, if it is not set, use the value we
          // stored instead.
          const state = { ...evt.data.state };
          if (state.updateState.lastCheck === null && lastUpdateTime) {
            state.updateState.lastCheck = new Date(lastUpdateTime);
          }
          dbState = state;

          onUpdate(state);
        }
        break;

      case 'dbupdatecomplete':
        if (evt.data.lastCheck) {
          setLastUpdateTime(evt.data.lastCheck.getTime());
        }

      case 'error':
        Bugsnag.notify(evt.data.message, (event) => {
          event.severity = evt.data.severity;
        });
        break;
    }
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
  const keysToTry = ['lastDbUpdateTime', 'lastUpdateKanjiDb'];

  for (const key of keysToTry) {
    try {
      const getResult = await browser.storage.local.get(key);
      if (typeof getResult[key] === 'number') {
        return getResult[key] as number;
      }
    } catch (_) {
      // Extension storage can sometimes randomly fail with 'An unexpected error
      // occurred'. Ignore, but log it.
      Bugsnag.notify(
        new ExtensionStorageError({
          key,
          action: 'get',
        }),
        (event) => {
          event.severity = 'warning';
        }
      );
    }
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

export async function searchKanji(
  kanji: string
): Promise<KanjiSearchResult | null> {
  // Pre-check (might not be needed anymore)
  const codepoint = kanji.charCodeAt(0);
  if (codepoint < 0x3000) {
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
      lang: kanjiDbLang(),
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

const NAMES_MAX_ENTRIES = 20;

export async function searchNames(
  input: string
): Promise<NameSearchResult | null> {
  let [normalized, inputLengths] = normalizeInput(input);

  // Setup a list of strings to try that includes all the possible expansions of
  // ー characters.
  const candidates = [normalized, ...expandChoon(normalized)];

  let result: NameSearchResult | null = null;
  for (const candidate of candidates) {
    let thisResult = await doNameSearch({ input: candidate, inputLengths });

    if (!result || (thisResult && thisResult.matchLen > result.matchLen)) {
      result = thisResult;
    }
  }

  return result;
}

async function doNameSearch({
  input,
  inputLengths,
}: {
  input: string;
  inputLengths: Array<number>;
}): Promise<NameSearchResult | null> {
  if (!isNamesDbAvailable()) {
    return null;
  }

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
    let names: Array<NameResult>;
    try {
      names = await getNames(currentString);
    } catch (e) {
      console.error(e);
      Bugsnag.notify(e || '(Error looking up names)');
      return null;
    }

    if (names.length) {
      longestMatch = Math.max(longestMatch, inputLengths[currentString.length]);
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
        result.data.push(name);
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
