/*

  Rikai champ
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

import { Bugsnag } from '@bugsnag/js';
import { deinflect, deinflectL10NKeys, CandidateWord } from './deinflect';
import { normalizeInput } from './conversion';
import { toRomaji } from './romaji';

const WORDS_MAX_ENTRIES = 7;
const NAMES_MAX_ENTRIES = 20;

interface DictionaryOptions {
  bugsnag?: Bugsnag.Client;
}

const enum WordType {
  IchidanVerb = 1 << 0, // i.e. ru-verbs
  GodanVerb = 1 << 1, // i.e. u-verbs
  IAdj = 1 << 2,
  KuruVerb = 1 << 3,
  SuruVerb = 1 << 4,
}

export class Dictionary {
  loaded: Promise<any>;
  nameDict: string;
  nameIndex: string;
  wordDict: string;
  wordIndex: string;
  bugsnag?: Bugsnag.Client;

  constructor(options: DictionaryOptions) {
    this.bugsnag = options.bugsnag;
    this.loaded = this.loadDictionary();
  }

  async readFile(url: string): Promise<string> {
    let attempts = 0;

    // Bugsnag only gives us 30 characters for the breadcrumb but its the
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
            if (this.bugsnag) {
              this.bugsnag.leaveBreadcrumb(makeBreadcrumb('Aborting: ', url));
            }
            controller.abort();
          } else {
            // TODO: This error doesn't actually propagate and do anything
            // useful yet. But for now at least it means Firefox 56 doesn't
            // break altogether.
            if (this.bugsnag) {
              this.bugsnag.notify('[Pre FF57] Load timed out', {
                severity: 'error',
              });
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

        // Wait for a (probably) increasing interval before trying again
        const intervalToWait = Math.round(Math.random() * attempts * 1000);
        console.log(
          `Failed to load ${url}. Trying again in ${intervalToWait}ms`
        );
        await new Promise(resolve => setTimeout(resolve, intervalToWait));
      }
    }
  }

  readFileIntoArray(name: string): Promise<string[]> {
    return this.readFile(name).then(text =>
      text.split('\n').filter(line => line.length)
    );
  }

  // Does a binary search of a linefeed delimited string, |data|, for |text|.
  find(data: string, text: string): string | null {
    const tlen: number = text.length;
    let start: number = 0;
    let end: number = data.length - 1;

    while (start < end) {
      const midpoint: number = (start + end) >> 1;
      const i: number = data.lastIndexOf('\n', midpoint) + 1;

      const candidate: string = data.substr(i, tlen);
      if (text < candidate) {
        end = i - 1;
      } else if (text > candidate) {
        start = data.indexOf('\n', midpoint + 1) + 1;
      } else {
        return data.substring(i, data.indexOf('\n', midpoint + 1));
      }
    }

    return null;
  }

  // Note: These are mostly flat text files; loaded as one continuous string to
  // reduce memory use
  async loadDictionary(): Promise<void> {
    type fileEntry = { key: keyof Dictionary; file: string };
    const dataFiles: Array<fileEntry> = [
      { key: 'wordDict', file: 'dict.dat' },
      { key: 'wordIndex', file: 'dict.idx' },
      { key: 'nameDict', file: 'names.dat' },
      { key: 'nameIndex', file: 'names.idx' },
    ];

    const readBatch = (files: Array<fileEntry>): Promise<any> => {
      const readPromises = [];
      for (const { key, file } of files) {
        const readPromise = this.readFile(
          browser.extension.getURL(`data/${file}`)
        ).then(text => {
          (this[key] as string | string[]) = text;
        });
        readPromises.push(readPromise);
      }

      return Promise.all(readPromises);
    };

    // Batch into two groups to reduce contention
    const midpoint = Math.floor(dataFiles.length / 2);
    await readBatch(dataFiles.slice(0, midpoint));
    await readBatch(dataFiles.slice(midpoint));
  }

  async wordSearch({
    input,
    doNames = false,
    max = 0,
    includeRomaji = false,
  }: {
    input: string;
    doNames?: boolean;
    max?: number;
    includeRomaji?: boolean;
  }): Promise<WordSearchResult | null> {
    let [word, inputLengths] = normalizeInput(input);

    let maxResults = doNames ? NAMES_MAX_ENTRIES : WORDS_MAX_ENTRIES;
    if (max > 0) {
      maxResults = Math.min(maxResults, max);
    }

    const [dict, index] = await this._getDictAndIndex(doNames);
    let result = this._lookupInput({
      input: word,
      inputLengths,
      dict,
      index,
      maxResults,
      deinflectWord: !doNames,
      includeRomaji,
    });

    result = this.tryReplacingChoonpu({
      input: word,
      inputLengths,
      dict,
      index,
      maxResults,
      deinflectWord: !doNames,
      includeRomaji,
      existingResult: result,
    });

    const wordSearchResult: WordSearchResult | null = result;
    if (wordSearchResult && doNames) {
      wordSearchResult.names = true;
    }

    return wordSearchResult;
  }

  tryReplacingChoonpu({
    input,
    inputLengths,
    dict,
    index,
    maxResults,
    deinflectWord,
    includeRomaji,
    existingResult,
  }: {
    input: string;
    inputLengths: number[];
    dict: string;
    index: string;
    maxResults: number;
    deinflectWord: boolean;
    includeRomaji: boolean;
    existingResult: LookupResult | null;
  }): LookupResult | null {
    if (input.indexOf('ー') === -1) {
      return existingResult;
    }

    // We don't deal with おー meaning おお. Technically the pronunciation is
    // different. おお as in 大阪 is pronounced as two distinct お sounds,
    // unlike おう which is pronounced as 長音. Still some people do write
    // オーサカ but it's rare enough that we simply don't deal with it yet.
    const barLessWord = input
      .replace(/([おこそとほもよろをうくすつぬふむゆる])ー/g, '$1う')
      .replace(/([あかさたなはまやらわ])ー/g, '$1あ')
      .replace(/([いきしちにひみり])ー/g, '$1い')
      .replace(/([えけせてねへめれ])ー/g, '$1え');
    if (barLessWord === input) {
      return existingResult;
    }

    // Since we are just doing single-character replacement, the
    // `inputLengths` should not change.
    const barLessResult: WordSearchResult | null = this._lookupInput({
      input: barLessWord,
      inputLengths,
      dict,
      index,
      maxResults,
      deinflectWord,
      includeRomaji,
    });

    return !existingResult ||
      (barLessResult && barLessResult.matchLen > existingResult.matchLen)
      ? barLessResult
      : existingResult;
  }

  async _getDictAndIndex(doNames: boolean) {
    await this.loaded;

    if (doNames) {
      return [this.nameDict, this.nameIndex];
    }

    return [this.wordDict, this.wordIndex];
  }

  // Looks for dictionary entries in |dict| (using |index|) that match some
  // portion of |input| after de-inflecting it (if |deinflectWord| is true).
  // Only entries that match from the beginning of |input| are checked.
  //
  // e.g. if |input| is '子犬は' then the entry for '子犬' will match but
  // '犬' will not.
  _lookupInput({
    input,
    inputLengths,
    dict,
    index,
    maxResults,
    deinflectWord,
    includeRomaji,
  }: {
    input: string;
    inputLengths: number[];
    dict: string;
    index: string;
    maxResults: number;
    deinflectWord: boolean;
    includeRomaji: boolean;
  }): LookupResult | null {
    let count: number = 0;
    let longestMatch: number = 0;
    let cache: { [index: string]: number[] } = {};
    let have: Set<number> = new Set();

    let result: LookupResult = {
      data: [],
      more: false,
      matchLen: 0,
    };

    while (input.length > 0) {
      const showInflections: boolean = count != 0;
      // TODO: Split inflection handling out into a separate method
      const candidates: Array<CandidateWord> = deinflectWord
        ? deinflect(input)
        : [{ word: input, type: 0xff, reasons: [] }];

      for (let i = 0; i < candidates.length; i++) {
        const candidate: CandidateWord = candidates[i];
        let offsets: number[] | undefined = cache[candidate.word];
        if (!offsets) {
          const lookupResult = this.find(index, candidate.word + ',');
          if (!lookupResult) {
            cache[candidate.word] = [];
            continue;
          }
          offsets = lookupResult
            .split(',')
            .slice(1)
            .map(Number);
          cache[candidate.word] = offsets;
        }

        // We temporarily store the set of entries for the current candidate
        // in a separate array since we want to sort them by priority before
        // adding them to the result array.
        type EntryType = [string, string | null, string | null];
        const entries: Array<EntryType> = [];

        for (const offset of offsets) {
          if (have.has(offset)) {
            continue;
          }

          const entry = dict.substring(offset, dict.indexOf('\n', offset));
          let ok = true;

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
          if (i > 0) {
            // Parse the word kind information from the entry:
            //
            // Example entries:
            //
            //   /(io) (v5r) to finish/to close/
            //   /(v5r) to finish/to close/(P)/
            //   /(aux-v,v1) to begin to/(P)/
            //   /(adj-na,exp,int) thank you/many thanks/
            //   /(adj-i) shrill/

            const fragments = entry.split(/[,()]/);

            // Start at the end and go backwards. I don't know why.
            let fragmentIndex = Math.min(fragments.length - 1, 10);
            for (; fragmentIndex >= 0; --fragmentIndex) {
              const fragment = fragments[fragmentIndex];
              if (candidate.type & WordType.IchidanVerb && fragment == 'v1') {
                break;
              }
              if (
                candidate.type & WordType.GodanVerb &&
                (fragment.substr(0, 2) == 'v5' || fragment.substr(0, 2) == 'v4')
              ) {
                break;
              }
              if (candidate.type & WordType.IAdj && fragment == 'adj-i') {
                break;
              }
              if (candidate.type & WordType.KuruVerb && fragment == 'vk') {
                break;
              }
              if (
                candidate.type & WordType.SuruVerb &&
                fragment.substr(0, 3) == 'vs-'
              ) {
                break;
              }
            }
            ok = fragmentIndex != -1;
          }

          if (ok) {
            have.add(offset);
            ++count;

            longestMatch = Math.max(longestMatch, inputLengths[input.length]);

            let reason: string | null = null;
            if (candidate.reasons.length) {
              reason =
                '< ' +
                candidate.reasons
                  .map(reasonList =>
                    reasonList
                      .map(reason =>
                        browser.i18n.getMessage(deinflectL10NKeys[reason])
                      )
                      .join(' < ')
                  )
                  .join(' or ');
              if (showInflections) {
                reason += ` < ${input}`;
              }
            }

            // This is really really bad. We duplicate this logic
            // (imperfectly) in both content script and background script.
            // This will also change soon, hopefully, however so for now it
            // should be sufficient to prove this feature.
            let romaji = null;
            if (includeRomaji) {
              const matches = entry.match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
              if (matches) {
                const kana = matches[2] || matches[1];
                romaji = toRomaji(kana);
              }
            }

            entries.push([entry, reason, romaji]);
          }
        } // for offset of offsets

        // Sort preliminary results
        const isCommon = (entry: EntryType): boolean =>
          entry[0].endsWith('/(P)/');
        entries.sort((a: EntryType, b: EntryType): number => {
          return Number(isCommon(b)) - Number(isCommon(a));
        });

        // Trim to max results AFTER sorting (so that we make sure to favor
        // common words in the trimmed result).
        if (count >= maxResults) {
          result.more = true;
          entries.splice(entries.length - count + maxResults);
        }

        result.data.push(...entries);

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
      data: [],
      textLen: text.length,
      more: false,
    };

    let skip: number;
    while (text.length > 0) {
      const searchResult = await this.wordSearch({
        input: text,
        doNames: false,
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

// きしちにひみりぎじびぴ
const yoonStart = [
  0x304d,
  0x3057,
  0x3061,
  0x306b,
  0x3072,
  0x307f,
  0x308a,
  0x304e,
  0x3058,
  0x3073,
  0x3074,
];
// ゃゅょ
const smallY = [0x3083, 0x3085, 0x3087];

function endsInYoon(input: string): boolean {
  return (
    input.length > 1 &&
    smallY.includes(input.charCodeAt(input.length - 1)) &&
    yoonStart.includes(input.charCodeAt(input.length - 2))
  );
}
