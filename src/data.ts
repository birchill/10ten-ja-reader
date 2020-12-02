/*

  Rikaichamp
  by Brian Birtles
  https://github.com/birtles/rikaichamp

  ---

  Originally based on Rikaikun
  by Erek Speed
  http://code.google.com/p/rikaikun/

  ---

  Originally based on Rikaichan 1.07
  by Jonathan Zarate
  http://www.polarcloud.com/

  ---

  Originally based on RikaiXUL 0.4 by Todd Rudick
  http://www.rikai.com/
  http://rikaixul.mozdev.org/

  ---

  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 2 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

  ---

  Please do not change or remove any of the copyrights or links to web pages
  when modifying any of the files. - Jon

*/

import { Client as BugsnagClient } from '@bugsnag/browser';
import { expandChoon, kanaToHiragana } from '@birchill/normal-jp';

import { deinflect, deinflectL10NKeys, CandidateWord } from './deinflect';
import { normalizeInput } from './conversion';
import { toRomaji } from './romaji';
import { toWordResult, RawWordRecord } from './raw-word-record';
import { sortMatchesByPriority } from './word-match-sorting';
import { PartOfSpeech } from './word-result';
import { endsInYoon } from './yoon';

const WORDS_MAX_ENTRIES = 7;

interface DictionaryOptions {
  // Although the v7 API of bugsnag-js can operate on a singleton client we
  // still need to pass this in so that we can avoid trying to call bugsnag
  // when running unit tests (and trying to do so would trigger errors because
  // we failed to call start anyway).
  bugsnag?: BugsnagClient;
}

export const enum WordType {
  IchidanVerb = 1 << 0, // i.e. ru-verbs
  GodanVerb = 1 << 1, // i.e. u-verbs
  IAdj = 1 << 2,
  KuruVerb = 1 << 3,
  SuruVerb = 1 << 4,
  NounVS = 1 << 5,
}

export class Dictionary {
  loaded: Promise<any>;
  wordDict: string;
  wordIndex: string;
  bugsnag?: BugsnagClient;

  constructor(options: DictionaryOptions) {
    this.bugsnag = options.bugsnag;
    this.loaded = this.loadDictionary();
  }

  // Note: These are flat text files; loaded as one continuous string to reduce
  // memory use
  private async loadDictionary(): Promise<void> {
    // Read in series to reduce contention
    this.wordDict = await readFileWithAutoRetry(
      browser.extension.getURL('data/words.ljson'),
      this.bugsnag
    );
    this.wordIndex = await readFileWithAutoRetry(
      browser.extension.getURL('data/words.idx'),
      this.bugsnag
    );
  }

  async wordSearch({
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

    let maxResults = WORDS_MAX_ENTRIES;
    if (max > 0) {
      maxResults = Math.min(maxResults, max);
    }

    await this.loaded;

    const candidateWords = [word, ...expandChoon(word)];

    let result: WordSearchResult | null = null;
    for (const candidate of candidateWords) {
      const thisResult = this.lookupInput({
        input: candidate,
        inputLengths,
        maxResults,
        includeRomaji,
      });

      if (!result || (thisResult && thisResult.matchLen > result.matchLen)) {
        result = thisResult;
      }
    }

    return result;
  }

  // Looks for dictionary entries in |dict| (using |index|) that match some
  // portion of |input| after de-inflecting it.
  // Only entries that match from the beginning of |input| are checked.
  //
  // e.g. if |input| is '子犬は' then the entry for '子犬' will match but
  // '犬' will not.
  private lookupInput({
    input,
    inputLengths,
    maxResults,
    includeRomaji,
  }: {
    input: string;
    inputLengths: number[];
    maxResults: number;
    includeRomaji: boolean;
  }): WordSearchResult | null {
    let count: number = 0;
    let longestMatch: number = 0;
    let cache: { [index: string]: number[] } = {};
    let have: Set<number> = new Set();

    let result: WordSearchResult = {
      type: 'words',
      data: [],
      more: false,
      matchLen: 0,
    };

    while (input.length > 0) {
      const showInflections: boolean = count != 0;
      const candidates: Array<CandidateWord> = deinflect(input);

      for (let i = 0; i < candidates.length; i++) {
        const candidate: CandidateWord = candidates[i];
        let offsets: number[] | undefined = cache[candidate.word];
        if (!offsets) {
          const lookupResult = findLineStartingWith({
            source: this.wordIndex,
            text: candidate.word + ',',
          });
          if (!lookupResult) {
            cache[candidate.word] = [];
            continue;
          }
          offsets = lookupResult.split(',').slice(1).map(Number);
          cache[candidate.word] = offsets;
        }

        // We temporarily store the set of matches for the current candidate
        // in a separate array since we want to sort them by priority before
        // adding them to the result array.
        const matches: Array<WordResult> = [];

        for (const offset of offsets) {
          if (have.has(offset)) {
            continue;
          }

          const entry = JSON.parse(
            this.wordDict.substring(offset, this.wordDict.indexOf('\n', offset))
          ) as RawWordRecord;

          // The first candidate is the full string, anything after that is
          // a possible deinflection.
          //
          // The deinflection code, however, doesn't know anything about the
          // actual words. It just produces possible deinflections along with
          // a type that says what kind of a word (e.g. godan verb, i-adjective
          // etc.) it must be in order for that deinflection to be valid.
          //
          // So, if we have a possible deinflection, we need to check that it
          // matches the kind of word we looked up.
          if (i > 0 && !entryMatchesType(entry, candidate.type)) {
            continue;
          }

          have.add(offset);
          ++count;

          longestMatch = Math.max(longestMatch, inputLengths[input.length]);

          let reason: string | undefined;
          if (candidate.reasons.length) {
            reason =
              '< ' +
              candidate.reasons
                .map((reasonList) =>
                  reasonList
                    .map((reason) =>
                      browser.i18n.getMessage(deinflectL10NKeys[reason])
                    )
                    .join(' < ')
                )
                .join(browser.i18n.getMessage('deinflect_alternate'));
            if (showInflections) {
              reason += ` < ${input}`;
            }
          }

          let romaji: Array<string> | undefined;
          if (includeRomaji) {
            romaji = entry.r.map(toRomaji);
          }

          matches.push(
            toWordResult({
              entry,
              matchingText: candidate.word,
              reason,
              romaji,
            })
          );
        } // for offset of offsets

        // Sort preliminary results
        sortMatchesByPriority(matches);

        // Trim to max results AFTER sorting (so that we make sure to favor
        // common words in the trimmed result).
        if (count >= maxResults) {
          result.more = true;
          matches.splice(matches.length - count + maxResults);
        }

        result.data.push(...matches);

        if (count >= maxResults) {
          break;
        }
      } // for i < trys.length

      if (count >= maxResults) {
        break;
      }

      // Shorten input, but don't split a ようおん (e.g. きゃ).
      const lengthToShorten = endsInYoon(input) ? 2 : 1;
      input = input.substr(0, input.length - lengthToShorten);
    } // while input.length > 0

    if (!result.data.length) {
      return null;
    }

    result.matchLen = longestMatch;
    return result;
  }

  async translate({
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
      const searchResult = await this.wordSearch({
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
}

async function readFileWithAutoRetry(
  url: string,
  bugsnag?: BugsnagClient
): Promise<string> {
  let attempts = 0;

  // Bugsnag only gives us 30 characters for the breadcrumb but its the
  // end of the url we really want to record.
  const makeBreadcrumb = (prefix: string, url: string): string => {
    const urlStart = Math.max(0, url.length - (30 - prefix.length - 1));
    return prefix + '…' + url.substring(urlStart);
  };

  if (bugsnag) {
    bugsnag.leaveBreadcrumb(makeBreadcrumb(`Loading: `, url));
  }

  while (true) {
    // We seem to occasionally hit loads that never finish (particularly on
    // Linux and particularly on startup / upgrade). Set a timeout so that
    // we can at least abort and try again.
    const TIMEOUT_MS = 4 * 1000;
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
          if (bugsnag) {
            bugsnag.leaveBreadcrumb(makeBreadcrumb('Aborting: ', url));
          }
          controller.abort();
        } else {
          // TODO: This error doesn't actually propagate and do anything
          // useful yet. But for now at least it means Firefox 56 doesn't
          // break altogether.
          if (bugsnag) {
            bugsnag.notify('[Pre FF57] Load timed out');
          }
          throw new Error(`Load of ${url} timed out.`);
        }
      }, TIMEOUT_MS * (attempts + 1));

      const response = await fetch(url, requestOptions);
      const responseText = await response.text();

      clearTimeout(timeoutId);
      if (bugsnag) {
        bugsnag.leaveBreadcrumb(makeBreadcrumb('Loaded: ', url));
      }

      return responseText;
    } catch (e) {
      if (typeof timeoutId === 'number') {
        clearTimeout(timeoutId);
      }

      if (bugsnag) {
        bugsnag.leaveBreadcrumb(
          makeBreadcrumb(`Failed(#${attempts + 1}): `, url)
        );
      }

      if (++attempts >= 3) {
        console.error(`Failed to load ${url} after ${attempts} attempts`);
        throw e;
      }

      // Wait for a (probably) increasing interval before trying again
      const intervalToWait = Math.round(Math.random() * attempts * 1000);
      console.log(`Failed to load ${url}. Trying again in ${intervalToWait}ms`);
      await new Promise((resolve) => setTimeout(resolve, intervalToWait));
    }
  }
}

// Does a binary search of a linefeed delimited string, |data|, for |text|.
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

// Tests if a given entry matches the type of a generated deflection
function entryMatchesType(entry: RawWordRecord, type: number): boolean {
  const hasMatchingSense = (test: (pos: PartOfSpeech) => boolean) =>
    entry.s.some((sense) => sense.pos?.some(test));

  if (
    type & WordType.IchidanVerb &&
    hasMatchingSense((pos) => pos.startsWith('v1'))
  ) {
    return true;
  }

  if (
    type & WordType.GodanVerb &&
    hasMatchingSense((pos) => pos.startsWith('v5') || pos.startsWith('v4'))
  ) {
    return true;
  }

  if (
    type & WordType.IAdj &&
    hasMatchingSense((pos) => pos.startsWith('adj-i'))
  ) {
    return true;
  }

  if (type & WordType.KuruVerb && hasMatchingSense((pos) => pos === 'vk')) {
    return true;
  }

  if (
    type & WordType.SuruVerb &&
    hasMatchingSense((pos) => pos.startsWith('vs-'))
  ) {
    return true;
  }

  if (type & WordType.NounVS && hasMatchingSense((pos) => pos === 'vs')) {
    return true;
  }

  return false;
}
