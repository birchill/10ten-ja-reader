import { Client as BugsnagClient } from '@bugsnag/browser';
import {
  Gloss,
  GlossType,
  RawKanjiMeta,
  RawReadingMeta,
  RawWordSense,
  GLOSS_TYPE_MAX,
} from '@birchill/hikibiki-data';
import { kanaToHiragana } from '@birchill/normal-jp';
import { LRUMap } from 'lru_map';

import { DictionaryWordResult, Sense } from './search-result';
import { stripFields } from './strip-fields';
import { sortMatchesByPriority } from './word-match-sorting';

interface FlatFileDatabaseOptions {
  // Although the v7 API of bugsnag-js can operate on a singleton client we
  // still need to pass this in so that we can avoid trying to call bugsnag
  // when running unit tests (and trying to do so would trigger errors because
  // we failed to call start anyway).
  bugsnag?: BugsnagClient;
}

type FlatFileDatabaseEvent =
  | { type: 'loaded' }
  | { type: 'error'; error: any; willRetry: boolean };

type FlatFileDatabaseListener = (evt: FlatFileDatabaseEvent) => void;

export class FlatFileDatabase {
  bugsnag?: BugsnagClient;
  listeners: Array<FlatFileDatabaseListener> = [];
  loaded: Promise<any>;
  lookupCache = new LRUMap<string, Array<number>>(500);
  wordDict: string;
  wordIndex: string;

  constructor(options: FlatFileDatabaseOptions) {
    this.bugsnag = options.bugsnag;
    this.loaded = this.loadData();
  }

  //
  // Loading
  //

  private async loadData(): Promise<void> {
    try {
      // Read in series to reduce contention
      this.wordDict = await this.readFileWithAutoRetry(
        browser.extension.getURL('data/words.ljson')
      );
      this.wordIndex = await this.readFileWithAutoRetry(
        browser.extension.getURL('data/words.idx')
      );

      this.notifyListeners({ type: 'loaded' });
    } catch (e) {
      this.notifyListeners({ type: 'error', error: e, willRetry: false });
    }
  }

  private async readFileWithAutoRetry(url: string): Promise<string> {
    let attempts = 0;

    // Bugsnag only gives us 30 characters for the breadcrumb but it's the
    // end of the url we really want to record.
    const makeBreadcrumb = (prefix: string, url: string): string => {
      const urlStart = Math.max(0, url.length - (30 - prefix.length - 1));
      return prefix + '…' + url.substring(urlStart);
    };

    if (this.bugsnag) {
      this.bugsnag.leaveBreadcrumb(makeBreadcrumb(`Loading: `, url));
    }

    while (true) {
      // We seem to occasionally hit loads that never finish (particularly on
      // Linux and particularly on startup / upgrade). Set a timeout so that
      // we can at least abort and try again.
      const TIMEOUT_MS = 5 * 1000;
      let timeoutId: number | undefined;

      try {
        let controller: AbortController | undefined;
        let requestOptions: RequestInit | undefined;

        // It turns out some people are still using Firefox < 57. :/
        if (typeof AbortController === 'function') {
          controller = new AbortController();
          requestOptions = { signal: controller.signal };
        }

        timeoutId = window.setTimeout(() => {
          timeoutId = undefined;
          if (controller) {
            console.error(`Load of ${url} timed out. Aborting.`);
            if (this.bugsnag) {
              this.bugsnag.leaveBreadcrumb(makeBreadcrumb('Aborting: ', url));
            }
            controller.abort();
          } else {
            // TODO: This error doesn't actually propagate and do anything
            // useful yet. But for now at least it means Firefox 56 doesn't
            // break altogether.
            if (this.bugsnag) {
              this.bugsnag.notify('[Pre FF57] Load timed out');
            }
            throw new Error(`Load of ${url} timed out.`);
          }
        }, TIMEOUT_MS * (attempts + 1));

        const response = await fetch(url, requestOptions);
        const responseText = await response.text();

        clearTimeout(timeoutId);
        if (this.bugsnag) {
          this.bugsnag.leaveBreadcrumb(makeBreadcrumb('Loaded: ', url));
        }

        return responseText;
      } catch (e) {
        if (typeof timeoutId === 'number') {
          clearTimeout(timeoutId);
        }

        if (this.bugsnag) {
          this.bugsnag.leaveBreadcrumb(
            makeBreadcrumb(`Failed(#${attempts + 1}): `, url)
          );
        }

        if (++attempts >= 3) {
          console.error(`Failed to load ${url} after ${attempts} attempts`);
          throw e;
        }

        this.notifyListeners({ type: 'error', error: e, willRetry: true });

        // Wait for a (probably) increasing interval before trying again
        const intervalToWait = Math.round(Math.random() * attempts * 1000);
        console.log(
          `Failed to load ${url}. Trying again in ${intervalToWait}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, intervalToWait));
      }
    }
  }

  //
  // Searching
  //

  async getWords({
    input,
    maxResults,
  }: {
    input: string;
    maxResults: number;
  }): Promise<Array<DictionaryWordResult>> {
    await this.loaded;

    let offsets = this.lookupCache.get(input);
    if (!offsets) {
      const lookupResult = findLineStartingWith({
        source: this.wordIndex,
        text: input + ',',
      });
      if (!lookupResult) {
        this.lookupCache.set(input, []);
        return [];
      }
      offsets = lookupResult.split(',').slice(1).map(Number);
      this.lookupCache.set(input, offsets);
    }

    const result: Array<DictionaryWordResult> = [];

    for (const offset of offsets) {
      const entry = JSON.parse(
        this.wordDict.substring(offset, this.wordDict.indexOf('\n', offset))
      ) as RawWordRecord;

      result.push(
        toDictionaryWordResult({ entry, matchingText: input, offset })
      );
    }

    // Sort before capping the number of results
    sortMatchesByPriority(result);
    result.splice(maxResults);

    return result;
  }

  //
  // Listeners
  //

  addListener(listener: FlatFileDatabaseListener) {
    if (this.listeners.includes(listener)) {
      return;
    }

    this.listeners.push(listener);
  }

  removeListener(listener: FlatFileDatabaseListener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  notifyListeners(evt: FlatFileDatabaseEvent) {
    const listenersCopy = this.listeners.slice();
    for (const listener of listenersCopy) {
      listener(evt);
    }
  }
}

// Performs a binary search of a linefeed delimited string, |data|, for |text|.
function findLineStartingWith({
  source,
  text,
}: {
  source: string;
  text: string;
}): string | null {
  const tlen: number = text.length;
  let start: number = 0;
  let end: number = source.length - 1;

  while (start < end) {
    const midpoint: number = (start + end) >> 1;
    const i: number = source.lastIndexOf('\n', midpoint) + 1;

    const candidate: string = source.substr(i, tlen);
    if (text < candidate) {
      end = i - 1;
    } else if (text > candidate) {
      start = source.indexOf('\n', midpoint + 1) + 1;
    } else {
      return source.substring(i, source.indexOf('\n', midpoint + 1));
    }
  }

  return null;
}

// This type matches the structure of the records in the flat file database
// (which, incidentally, differ slightly from the data format used by
// hikibiki-data since, for example, they don't include the ID field).
//
// As a result it is only used as part of the fallback mechanism.

interface RawWordRecord {
  k?: Array<string>;
  km?: Array<0 | RawKanjiMeta>;
  r: Array<string>;
  rm?: Array<0 | RawReadingMeta>;
  s: Array<RawWordSense>;
}

export function toDictionaryWordResult({
  entry,
  matchingText,
  offset,
}: {
  entry: RawWordRecord;
  matchingText: string;
  offset: number;
}): DictionaryWordResult {
  const kanjiMatch =
    !!entry.k && entry.k.some((k) => kanaToHiragana(k) === matchingText);
  const kanaMatch =
    !kanjiMatch && entry.r.some((r) => kanaToHiragana(r) === matchingText);

  return {
    id: offset,
    k: mergeMeta(entry.k, entry.km, (key, meta) => ({
      ent: key,
      ...meta,
      match:
        (kanjiMatch && kanaToHiragana(key) === matchingText) || !kanjiMatch,
      matchRange:
        kanaToHiragana(key) === matchingText ? [0, key.length] : undefined,
    })),
    r: mergeMeta(entry.r, entry.rm, (key, meta) => ({
      ent: key,
      ...meta,
      match: (kanaMatch && kanaToHiragana(key) === matchingText) || !kanaMatch,
      matchRange:
        kanaToHiragana(key) === matchingText ? [0, key.length] : undefined,
    })),
    s: expandSenses(entry.s),
  };
}

function mergeMeta<MetaType extends RawKanjiMeta | RawReadingMeta, MergedType>(
  keys: Array<string> | undefined,
  metaArray: Array<0 | MetaType> | undefined,
  merge: (key: string, meta?: MetaType) => MergedType
): Array<MergedType> {
  const result: Array<MergedType> = [];

  for (const [i, key] of (keys || []).entries()) {
    const meta: MetaType | undefined =
      metaArray && metaArray.length >= i + 1 && metaArray[i] !== 0
        ? (metaArray[i] as MetaType)
        : undefined;
    result.push(merge(key, meta));
  }

  return result;
}

function expandSenses(senses: Array<RawWordSense>): Array<Sense> {
  return senses.map((sense) => ({
    g: expandGlosses(sense),
    ...stripFields(sense, ['g', 'gt']),
    match: true,
  }));
}

const BITS_PER_GLOSS_TYPE = Math.floor(Math.log2(GLOSS_TYPE_MAX)) + 1;

function expandGlosses(sense: RawWordSense): Array<Gloss> {
  // Helpers to work out the gloss type
  const gt = sense.gt || 0;
  const typeMask = (1 << BITS_PER_GLOSS_TYPE) - 1;
  const glossTypeAtIndex = (i: number): GlossType => {
    return (gt >> (i * BITS_PER_GLOSS_TYPE)) & typeMask;
  };

  return sense.g.map((gloss, i) => {
    // This rather convoluted mess is because our test harness differentiates
    // between properties that are not set and those that are set to
    // undefined.
    const result: Gloss = { str: gloss };

    const type = glossTypeAtIndex(i);
    if (type !== GlossType.None) {
      result.type = type;
    }

    return result;
  });
}

// ---------------------------------------------------------------------------
//
// Loader utility
//
// ---------------------------------------------------------------------------

// This is all a bit complicated. It comes about because we want the following
// behavior:
//
// If we are looking up words and need to fallback to the flat file dictionary
// we should wait for it to load. However, if it fails to load the first time
// we should retry automatically but NOT make callers wait for those retries.
//
// However, if one of those automatic retries succeeds, subsequent calls to get
// the database should use the resolved promise.

export type FlatFileDatabaseLoadState =
  | 'unloaded'
  | 'loading'
  | 'retrying'
  | 'error'
  | 'ok';

export type FlatFileDatabaseLoadCallback = (
  state: FlatFileDatabaseLoadState
) => void;

export class FlatFileDatabaseLoader {
  loadState: FlatFileDatabaseLoadState = 'unloaded';
  onUpdate: FlatFileDatabaseLoadCallback | undefined;

  private bugsnag?: BugsnagClient;
  private flatFileDatabase: FlatFileDatabase | undefined;
  private loadError: any;

  private loadPromise: Promise<FlatFileDatabase> | undefined;
  private resolveLoad: (db: FlatFileDatabase) => void;
  private rejectLoad: (e: any) => void;

  constructor(options: FlatFileDatabaseOptions) {
    this.bugsnag = options.bugsnag;
    this.onFlatFileDatabaseUpdated = this.onFlatFileDatabaseUpdated.bind(this);
  }

  resetIfNotLoaded(): void {
    if (this.loadState === 'ok') {
      return;
    }

    if (this.flatFileDatabase) {
      this.flatFileDatabase.removeListener(this.onFlatFileDatabaseUpdated);
      this.flatFileDatabase = undefined;
    }

    this.loadState = 'unloaded';
  }

  load(): Promise<FlatFileDatabase> {
    if (this.flatFileDatabase && this.loadPromise) {
      return this.loadPromise;
    }

    this.flatFileDatabase = new FlatFileDatabase({ bugsnag: this.bugsnag });
    this.flatFileDatabase.addListener(this.onFlatFileDatabaseUpdated);

    this.loadPromise = new Promise<FlatFileDatabase>((resolve, reject) => {
      this.resolveLoad = resolve;
      this.rejectLoad = reject;
    });

    this.loadState = 'loading';
    if (this.onUpdate) {
      this.onUpdate(this.loadState);
    }

    return this.loadPromise;
  }

  private onFlatFileDatabaseUpdated(evt: FlatFileDatabaseEvent) {
    switch (evt.type) {
      case 'loaded':
        this.loadState = 'ok';
        this.loadError = undefined;

        // If this is the initial load, make sure to resolve the load promise.
        //
        // (If it is NOT the initial load, resolveLoad will be a no-op since
        // rejectLoad will have already been called.)
        if (this.resolveLoad && this.flatFileDatabase) {
          this.resolveLoad(this.flatFileDatabase);
        }

        // If this is not the initial load, make sure to replace the loadPromise
        // so that anyone who waits on it from now on will get the resolved
        // database.
        if (this.flatFileDatabase) {
          this.loadPromise = Promise.resolve(this.flatFileDatabase);
        }
        break;

      case 'error':
        if (evt.willRetry) {
          this.loadState = 'retrying';
        } else {
          this.loadState = 'error';
          // Reset the flat file database so that subsequence calls to load()
          // will retry loading.
          this.flatFileDatabase?.removeListener(this.onFlatFileDatabaseUpdated);
          this.flatFileDatabase = undefined;
        }
        this.loadError = evt.error;
        if (this.rejectLoad) {
          this.rejectLoad(evt.error);
        }
        break;
    }

    if (this.onUpdate) {
      this.onUpdate(this.loadState);
    }
  }

  get database(): Promise<FlatFileDatabase> {
    switch (this.loadState) {
      case 'unloaded':
        return this.load();

      case 'loading':
        return this.loadPromise!;

      case 'retrying':
      // This should fail since we don't want the caller to wait on retries

      case 'error':
        return Promise.reject(this.loadError);

      case 'ok':
        return Promise.resolve(this.flatFileDatabase!);
    }
  }
}
