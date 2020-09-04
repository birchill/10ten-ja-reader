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

import { replaceChoonpu } from './choon';
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

let kanjiDbLang = 'en';

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
  const lastUpdateTime = await getLastUpdateTime();
  Bugsnag.leaveBreadcrumb(`Got last update time of ${lastUpdateTime}`);

  // Register the listener
  jpdictWorker.onmessage = async (evt: MessageEvent) => {
    switch ((evt.data as JpdictWorkerMessage).type) {
      case 'dbstateupdated':
        {
          // Update the local language setting cache
          kanjiDbLang = evt.data.state.kanji.dataVersion?.lang ?? 'en';

          // Fill out the lastCheck field in the updateState.
          //
          // This value will only be set if we already did a check this session.
          // It is _not_ a stored value.  So, if it is not set, use the value we
          // stored instead.
          const state = { ...evt.data.state };
          if (state.updateState.lastCheck === null) {
            const lastUpdateTime = await getLastUpdateTime();
            if (lastUpdateTime) {
              state.updateState.lastCheck = new Date(lastUpdateTime);
            }
          }

          onUpdate(evt.data.state);
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

async function setLastUpdateTime(time: Date | null) {
  // Extension storage can randomly fail with "An unexpected error occurred".
  try {
    if (time) {
      await browser.storage.local.set({
        lastDbUpdateTime: time.getTime(),
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
      lang: kanjiDbLang,
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

  let result = await doNameSearch({ input: normalized, inputLengths });

  // If the input string has ー in it, try expanding it and re-querying.
  const expanded = choonExpandedVariation(normalized);
  if (expanded) {
    const expandedResult = await doNameSearch({
      input: expanded,
      inputLengths,
    });

    if (
      !result ||
      (expandedResult && expandedResult.matchLen > result.matchLen)
    ) {
      result = expandedResult;
    }
  }

  return result;
}

function choonExpandedVariation(input: string): string | null {
  if (input.indexOf('ー') === -1) {
    return null;
  }

  const expanded = replaceChoonpu(input);
  return expanded !== input ? expanded : null;
}

async function doNameSearch({
  input,
  inputLengths,
}: {
  input: string;
  inputLengths: Array<number>;
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
