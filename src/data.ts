// @format
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

import { Bugsnag } from 'bugsnag-js';

// Katakana -> Hiragana conversion tables

// prettier-ignore
const HANKAKU_KATAKANA_TO_HIRAGANA = [
  0x3092, 0x3041, 0x3043, 0x3045, 0x3047, 0x3049, 0x3083, 0x3085, 0x3087,
  0x3063, 0x30fc, 0x3042, 0x3044, 0x3046, 0x3048, 0x304a, 0x304b, 0x304d,
  0x304f, 0x3051, 0x3053, 0x3055, 0x3057, 0x3059, 0x305b, 0x305d, 0x305f,
  0x3061, 0x3064, 0x3066, 0x3068, 0x306a, 0x306b, 0x306c, 0x306d, 0x306e,
  0x306f, 0x3072, 0x3075, 0x3078, 0x307b, 0x307e, 0x307f, 0x3080, 0x3081,
  0x3082, 0x3084, 0x3086, 0x3088, 0x3089, 0x308a, 0x308b, 0x308c, 0x308d,
  0x308f, 0x3093,
];
// prettier-ignore
const VOICED_KATAKANA_TO_HIRAGANA = [
  0x30f4, 0xff74, 0xff75, 0x304c, 0x304e, 0x3050, 0x3052, 0x3054, 0x3056,
  0x3058, 0x305a, 0x305c, 0x305e, 0x3060, 0x3062, 0x3065, 0x3067, 0x3069,
  0xff85, 0xff86, 0xff87, 0xff88, 0xff89, 0x3070, 0x3073, 0x3076, 0x3079,
  0x307c,
];
// prettier-ignore
const SEMIVOICED_KATAKANA_TO_HIRAGANA = [
  0x3071, 0x3074, 0x3077, 0x307a, 0x307d
];

export const REF_ABBREVIATIONS = [
  /*
  C: 'Classical Radical',
  DR: 'Father Joseph De Roo Index',
  DO: 'P.G. O\'Neill Index',
  O: 'P.G. O\'Neill Japanese Names Index',
  Q: 'Four Corner Code',
  MN: 'Morohashi Daikanwajiten Index',
  MP: 'Morohashi Daikanwajiten Volume/Page',
  K: 'Gakken Kanji Dictionary Index',
  W: 'Korean Reading',
  */
  { abbrev: 'H', name: 'Halpern' },
  { abbrev: 'L', name: 'Heisig' },
  { abbrev: 'E', name: 'Henshall' },
  { abbrev: 'DK', name: 'Kanji Learners Dictionary' },
  { abbrev: 'N', name: 'Nelson' },
  { abbrev: 'V', name: 'New Nelson' },
  { abbrev: 'Y', name: 'PinYin' },
  { abbrev: 'P', name: 'Skip Pattern' },
  { abbrev: 'IN', name: 'Tuttle Kanji & Kana' },
  { abbrev: 'I', name: 'Tuttle Kanji Dictionary' },
  { abbrev: 'U', name: 'Unicode' },
];

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

interface DeinflectRule {
  from: string;
  to: string;
  // Unlike the type in the CandidateWord, this is a 16-bit integer where the
  // lower 8 bits represent the from type while the upper 8 bits represent the
  // to type(s).
  //
  // For example, 遊びすぎる would match the びすぎる→ぶ rule where the from
  // type is an ichidan/ru-verb while the to type is a godan/u-verb.
  //
  // The type for this rule is calculated as follows:
  //
  //   from-type = WordType.IchidanVerb = 1 << 0 = 00000001
  //   to-type   = WordType.GodanVerb   = 1 << 1 = 00000010
  //   type      = [to-type] [from-type]
  //             = 00000010 00000001
  //               \______/ \______/
  //                  to      from
  //             = 513
  //
  // When the from type accepts anything BUT one of the above word types (e.g.
  // a verb stem), the highest bit is set. For example, consider the
  // deinflection rule that allows 食べ (imperative) to be de-inflected to
  // 食べる: べ→べる.
  //
  // In this case, the to type is an ichidan/ru-verb, while the from type is
  // basically anything but NOT the result of any other deinflection (since they
  // never produce verb stems). For this case the highest bit of the from-type
  // is set so that it does NOT match any of the existing word types but it DOES
  // match when we compare with 0xff (the mask we use for the initial input).
  //
  // i.e. from-type = 10000000
  //      to-type   = WordType.IchidanVerb = 1
  //      type      = 00000001 10000000
  //                = 384
  //
  // Note that the to-type is a bitfield since multiple possible word types can
  // be produced.
  //
  // For example, for the rule ませんでした→る the deinflected word could be an
  // ichidan/ru-verb (e.g. 食べる) but it could also be the special verb 来る
  // (when it is written in hiragana a different rule will match). As a result,
  // the to-type needs to represent both of these possibilities.
  //
  // i.e. to-type   = WordType.IchidanVerb & WordType.KuruVerb
  //                = 00000001 & 00001000
  //                = 00001001
  //      from-type = Verb stem (i.e. anything but one of the WordTypes)
  //                = 10000000
  //      type      = 00001001 10000000
  //                = 2432
  //
  type: number;
  reason: number;
}
type DeinflectRuleGroup = Array<DeinflectRule> & { fromLen: number };

// Helper to initialize a new DeinflectRuleGroup
const createDeinflectRuleGroup = (fromLen: number): DeinflectRuleGroup => {
  const result: any = [];
  result.fromLen = fromLen;
  return result as DeinflectRuleGroup;
};

interface CandidateWord {
  // The de-inflected candidate word
  word: string;
  // An optional string describing the relationship of |word| to its
  // de-inflected version, e.g. 'past'
  reason: string | null;
  // For a de-inflected word, this is a bitfield comprised of flags from the
  // WordType enum describing the possible types of word this could represent
  // (e.g. godan verb, i-adj). If a word looked up in the dictionary does not
  // match this type, it should be ignored since the deinflection is not valid
  // in that case.
  //
  // See the extended notes for DeinflectRule.rule.
  type: number;
}

interface KanjiSearchOptions {
  // Lists the references that should be included in KanjiEntry.misc.
  includedReferences: Set<string>;

  // Set to true if the components that make up the kanji should be returned in
  // the result.
  includeKanjiComponents: boolean;
}

export class Dictionary {
  loaded: Promise<any>;
  nameDict: string;
  nameIndex: string;
  wordDict: string;
  wordIndex: string;
  kanjiData: string;
  radData: string[];
  deinflectReasons: string[];
  deinflectRules: DeinflectRuleGroup[];
  bugsnag?: Bugsnag.Client;

  constructor(options: DictionaryOptions) {
    this.bugsnag = options.bugsnag;

    const dictionaryLoaded = this.loadDictionary();
    const deinflectLoaded = this.loadDeinflectData();

    this.loaded = Promise.all<any>([dictionaryLoaded, deinflectLoaded]);
  }

  async readFile(url: string): Promise<string> {
    let attempts = 0;

    // Bugsnag only gives us 30 characters for the breadcrumb but its the
    // end of the url we really want to record.
    const makeBreadcrumb = (prefix: string, url: string): string => {
      const urlStart = Math.max(0, url.length - (30 - prefix.length - 1));
      return prefix + '…' + url.substring(urlStart);
    };

    while (true) {
      try {
        const response = await fetch(url);
        const responseText = response.text();
        if (this.bugsnag) {
          this.bugsnag.leaveBreadcrumb(makeBreadcrumb('Loaded: ', url));
        }
        return responseText;
      } catch (e) {
        if (this.bugsnag) {
          this.bugsnag.leaveBreadcrumb(
            makeBreadcrumb(`Failed(#${attempts}): `, url)
          );
        }

        if (++attempts >= 3) {
          throw e;
        }

        // Wait for a (probably) increasing interval before trying again
        const intervalToWait = Math.round(Math.random() * attempts * 800);
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

  // Note: These are mostly flat text files; loaded as one continous string to
  // reduce memory use
  loadDictionary(): Promise<any> {
    const dataFiles: { [key: string]: string } = {
      wordDict: 'dict.dat',
      wordIndex: 'dict.idx',
      nameDict: 'names.dat',
      nameIndex: 'names.idx',
      kanjiData: 'kanji.dat',
      radData: 'radicals.dat',
    };

    const readPromises = [];
    for (const [key, file] of Object.entries(dataFiles)) {
      const reader: (url: string) => Promise<string | string[]> =
        key === 'radData'
          ? this.readFileIntoArray.bind(this)
          : this.readFile.bind(this);
      const readPromise = reader(browser.extension.getURL(`data/${file}`)).then(
        text => {
          // TODO: Make the following typesafe
          this[key as keyof Dictionary] = text;
        }
      );
      readPromises.push(readPromise);
    }

    return Promise.all(readPromises);
  }

  async loadDeinflectData() {
    this.deinflectReasons = [];
    this.deinflectRules = [];

    const buffer = await this.readFileIntoArray(
      browser.extension.getURL('data/deinflect.dat')
    );

    // We group rules whose 'from' parts have equal length together
    let prevLen: number = -1;
    let ruleGroup: DeinflectRuleGroup;
    buffer.forEach((line, index) => {
      // Skip header
      if (index === 0) {
        return;
      }

      const fields = line.split('\t');

      if (fields.length === 1) {
        this.deinflectReasons.push(fields[0]);
      } else if (fields.length === 4) {
        const rule: DeinflectRule = {
          from: fields[0],
          to: fields[1],
          type: parseInt(fields[2]),
          reason: parseInt(fields[3]),
        };

        if (prevLen !== rule.from.length) {
          prevLen = rule.from.length;
          ruleGroup = createDeinflectRuleGroup(prevLen);
          this.deinflectRules.push(ruleGroup);
        }
        ruleGroup.push(rule);
      }
    });
  }

  // Returns an array of possible de-inflected versions of |word|.
  deinflect(word: string): CandidateWord[] {
    const result: Array<CandidateWord> = [];
    const resultIndex: { [index: string]: number } = {};

    const original: CandidateWord = {
      word,
      // Initially we don't know what type of word we have so we set the type
      // mask to match all rules.
      type: 0xff,
      reason: '',
    };
    result.push(original);
    resultIndex[word] = 0;

    let i = 0;
    do {
      const word = result[i].word;
      const type = result[i].type;

      for (const ruleGroup of this.deinflectRules) {
        if (ruleGroup.fromLen <= word.length) {
          const ending = word.substr(-ruleGroup.fromLen);

          for (const rule of ruleGroup) {
            if (type & rule.type && ending === rule.from) {
              const newWord =
                word.substr(0, word.length - rule.from.length) + rule.to;
              if (newWord.length <= 1) {
                continue;
              }

              // If we already have a candidate for this word with the same
              // to type(s), expand the possible reasons.
              //
              // If the to type(s) differ, then we'll add a separate candidate
              // and just hope that when we go to match against dictionary words
              // we'll filter out the mismatching one(s).
              if (resultIndex[newWord]) {
                const candidate = result[resultIndex[newWord]];
                if (candidate.type === rule.type >> 8) {
                  candidate.reason = `${
                    this.deinflectReasons[rule.reason]
                  } or ${candidate.reason}`;
                  continue;
                }
              }
              resultIndex[newWord] = result.length;

              let reason: string = this.deinflectReasons[rule.reason];
              if (result[i].reason && result[i].reason!.length) {
                reason += ` < ${result[i].reason}`;
                // This is a bit hacky but the alternative is to add the
                // full-form causative passive inflections to the deinflection
                // dictionary and then try to merge the results.
                reason = reason.replace(
                  'causative < potential or passive',
                  'causative passive'
                );
              }
              const candidate: CandidateWord = {
                reason,
                type: rule.type >> 8,
                word: newWord,
              };

              result.push(candidate);
            }
          }
        }
      }
    } while (++i < result.length);

    return result;
  }

  async wordSearch(
    input: string,
    doNames: boolean = false,
    max = 0
  ): Promise<WordSearchResult | null> {
    let [word, inputLengths] = this.normalizeInput(input);

    let maxResults = doNames ? NAMES_MAX_ENTRIES : WORDS_MAX_ENTRIES;
    if (max > 0) {
      maxResults = Math.min(maxResults, max);
    }

    const [dict, index] = await this._getDictAndIndex(doNames);
    const result: WordSearchResult | null = this._lookupInput(
      word,
      inputLengths,
      dict,
      index,
      maxResults,
      !doNames
    );

    if (result && doNames) {
      result.names = true;
    }

    return result;
  }

  // half & full-width katakana to hiragana conversion
  // note: katakana vu is never converted to hiragana
  //
  // Returns the normalized input and an array that maps each character
  // in the normalized input to the corresponding length in the original input.
  //
  // e.g. If the input string is ｶﾞｰﾃﾞﾝ the result will be
  //
  //   [ "がーでん", [ 0, 2, 3, 5, 6 ] ]
  //
  // Returns [ normalized input, array with length mapping ]
  //
  // TODO: Translate this range https://en.wikipedia.org/wiki/Enclosed_Ideographic_Supplement
  // TODO: Translate the first part of this range: https://en.wikipedia.org/wiki/CJK_Compatibility
  normalizeInput(input: string): [string, number[]] {
    let inputLengths = [0];
    let previous = 0;
    let result = '';

    for (let i = 0; i < input.length; ++i) {
      let originalChar = input.charCodeAt(i);
      let c = originalChar;

      if (c <= 0x3002) {
        break;
      }

      // full-width katakana to hiragana
      if (c >= 0x30a1 && c <= 0x30f3) {
        c -= 0x60;
      } else if (c >= 0xff66 && c <= 0xff9d) {
        // half-width katakana to hiragana
        c = HANKAKU_KATAKANA_TO_HIRAGANA[c - 0xff66];
      } else if (c == 0xff9e) {
        // voiced (used in half-width katakana) to hiragana
        if (previous >= 0xff73 && previous <= 0xff8e) {
          result = result.slice(0, -1);
          c = VOICED_KATAKANA_TO_HIRAGANA[previous - 0xff73];
        }
      } else if (c == 0xff9f) {
        // semi-voiced (used in half-width katakana) to hiragana
        if (previous >= 0xff8a && previous <= 0xff8e) {
          result = result.slice(0, -1);
          c = SEMIVOICED_KATAKANA_TO_HIRAGANA[previous - 0xff8a];
        }
      } else if (c == 0xff5e && i > 0) {
        // ignore ～ (but only if it's in the middle/end of a word)
        previous = 0;
        continue;
      }

      result += String.fromCharCode(c);
      inputLengths[result.length] = i + 1; // need to keep real length because
      // of the half-width semi/voiced
      // conversion
      previous = originalChar;
    }

    return [result, inputLengths];
  }

  async _getDictAndIndex(doNames: boolean) {
    await this.loaded;

    if (doNames) {
      return [this.nameDict, this.nameIndex];
    }

    return [this.wordDict, this.wordIndex];
  }

  // Looks for dictionary entries in |dict| (using |index|) that match some
  // portion of |input| after de-inflecting it (if |deinflect| is true).
  // Only entries that match from the beginning of |input| are checked.
  //
  // e.g. if |input| is '子犬は' then the entry for '子犬' will match but
  // '犬' will not.
  _lookupInput(
    input: string,
    inputLengths: number[],
    dict: string,
    index: string,
    maxResults: number,
    deinflect: boolean
  ): LookupResult | null {
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
      const showInf: boolean = count != 0;
      // TODO: Split inflection handling out into a separate method
      const candidates = deinflect
        ? this.deinflect(input)
        : [{ word: input, type: 0xff, reason: null }];

      for (let i = 0; i < candidates.length; i++) {
        const candidate: CandidateWord = candidates[i];
        let ix: number[] | undefined = cache[candidate.word];
        if (!ix) {
          const lookupResult = this.find(index, candidate.word + ',');
          if (!lookupResult) {
            cache[candidate.word] = [];
            continue;
          }
          ix = lookupResult.split(',').map(Number);
          cache[candidate.word] = ix;
        }

        for (let j = 1; j < ix.length; ++j) {
          const ofs = ix[j];
          if (have.has(ofs)) {
            continue;
          }

          var dentry = dict.substring(ofs, dict.indexOf('\n', ofs));
          var ok = true;

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

            const fragments = dentry.split(/[,()]/);

            // Start at the end and go backwards. I don't know why.
            let fragmentIndex = Math.min(fragments.length - 1, 10);
            for (; fragmentIndex >= 0; --fragmentIndex) {
              const fragment = fragments[fragmentIndex];
              if (candidate.type & WordType.IchidanVerb && fragment == 'v1') {
                break;
              }
              if (
                candidate.type & WordType.GodanVerb &&
                fragment.substr(0, 2) == 'v5'
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
            if (count >= maxResults) {
              result.more = true;
              break;
            }

            have.add(ofs);
            ++count;

            longestMatch = Math.max(longestMatch, inputLengths[input.length]);

            let reason: string | null = null;
            if (candidate.reason) {
              reason = `< ${candidate.reason}`;
              if (showInf) {
                reason += ` < ${input}`;
              }
            }

            result.data.push([dentry, reason]);
          }
        } // for j < ix.length

        if (count >= maxResults) {
          break;
        }
      } // for i < trys.length

      if (count >= maxResults) {
        break;
      }
      input = input.substr(0, input.length - 1);
    } // while input.length > 0

    if (!result.data.length) {
      return null;
    }

    result.matchLen = longestMatch;
    return result;
  }

  async translate(text: string): Promise<TranslateResult | null> {
    const result: TranslateResult = {
      data: [],
      textLen: text.length,
      more: false,
    };

    let skip: number;
    while (text.length > 0) {
      const searchResult = await this.wordSearch(text, false, 1);
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

  kanjiSearch(kanji: string, options?: KanjiSearchOptions): KanjiEntry | null {
    const codepoint = kanji.charCodeAt(0);
    if (codepoint < 0x3000) return null;

    const dictEntry = this.find(this.kanjiData, kanji);
    if (!dictEntry) return null;

    const fields = dictEntry.split('|');
    if (fields.length != 6) return null;

    // Separate space-separated lists with an ideographic comma (、) and space
    const splitWords = (str: string) => {
      const result = str.split(' ');
      // split() has this odd behavior where:
      //
      //   ''.split('') => []
      //
      // but:
      //
      //   ''.split(' ') => [ '' ]
      //
      return result.length === 1 && result[0].trim() === '' ? [] : result;
    };
    const entry: KanjiEntry = {
      kanji: fields[0],
      misc: {},
      miscDisplay: [],
      onkun: splitWords(fields[2]),
      nanori: splitWords(fields[3]),
      bushumei: splitWords(fields[4]),
      radical: '', // Fill in later
      eigo: fields[5],
    };

    // Store hex-representation
    const hex = '0123456789ABCDEF';
    entry.misc['U'] =
      hex[(codepoint >>> 12) & 15] +
      hex[(codepoint >>> 8) & 15] +
      hex[(codepoint >>> 4) & 15] +
      hex[codepoint & 15];

    // Parse other kanji references
    const refs = fields[1].split(' ');
    for (let i = 0; i < refs.length; ++i) {
      if (refs[i].match(/^([A-Z]+)(.*)/)) {
        if (!entry.misc[RegExp.$1]) {
          entry.misc[RegExp.$1] = RegExp.$2;
        } else {
          entry.misc[RegExp.$1] += `  ${RegExp.$2}`;
        }
      }
    }

    // Fill in display order and information for other kanji references
    for (let ref of REF_ABBREVIATIONS) {
      if (!options || options.includedReferences.has(ref.abbrev)) {
        entry.miscDisplay.push(ref);
      }
    }

    // Fill in radical
    entry.radical = this.radData[Number(entry.misc.B) - 1].charAt(0);

    // Kanji components
    if (options && options.includeKanjiComponents) {
      entry.components = [];

      const addRadicalFromRow = (row: string) => {
        const fields: string[] = row.split('\t');
        if (fields.length >= 4) {
          entry.components!.push({
            radical: fields[0],
            yomi: fields[2],
            english: fields[3],
          });
        }
      };

      addRadicalFromRow(this.radData[Number(entry.misc.B) - 1]);
      this.radData.forEach((row: string, index: number) => {
        if (
          index === Number(entry.misc.B) - 1 ||
          row.indexOf(entry.kanji) === -1
        ) {
          return;
        }
        addRadicalFromRow(row);
      });
    }

    return entry;
  }
}

export default Dictionary;
