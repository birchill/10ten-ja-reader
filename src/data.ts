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

const REF_ABBREVIATIONS = [
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
  loadNames: boolean;
}

interface DeinflectRule {
  from: string;
  to: string;
  type: number;
  reason: number;
}
type DeinflectRuleGroup = Array<DeinflectRule> & { fromLen?: number };

interface CandidateWord {
  // The de-inflected candidate word
  word: string;
  // A string describing the relationship of |word| to its de-inflected version,
  // e.g. 'past'
  reason: string;
  // A bitfield describing the type of the de-inflected word (e.g. group 5 verb)
  type: number;
}

interface KanjiSearchOptions {
  // Lists the references that should be included in KanjiEntry.misc.
  includedReferences: Set<string>;

  // Set to true if the components that make up the kanji should be returned in
  // the result.
  includeKanjiComponents: boolean;
}

class Dictionary {
  loaded: Promise<any>;
  nameDict: string;
  nameIndex: string;
  wordDict: string;
  wordIndex: string;
  kanjiData: string;
  radData: string[];
  deinflectReasons: string[];
  deinflectRules: DeinflectRuleGroup[];

  constructor(options: DictionaryOptions) {
    const dictionaryLoaded = this.loadDictionary();
    const namesLoaded = options.loadNames
      ? this.loadNames()
      : Promise.resolve();
    const deinflectLoaded = this.loadDeinflectData();

    this.loaded = Promise.all<any>([
      dictionaryLoaded,
      namesLoaded,
      deinflectLoaded,
    ]);
  }

  fileRead(url: string): Promise<string> {
    return fetch(url).then(response => response.text());
  }

  fileReadArray(name: string): Promise<string[]> {
    return this.fileRead(name).then(text =>
      text.split('\n').filter(line => line.length)
    );
  }

  // Does a binary search of a linefeed delimited string, |data|, for |text|.
  find(data, text): string | null {
    const tlen: number = text.length;
    let start: number = 0;
    let end: number = data.length - 1;

    while (start < end) {
      const midpoint: number = (start + end) >> 1;
      const i: number = data.lastIndexOf('\n', midpoint) + 1;

      const candidate: string = data.substr(i, tlen);
      if (text < candidate) end = i - 1;
      else if (text > candidate) start = data.indexOf('\n', midpoint + 1) + 1;
      else return data.substring(i, data.indexOf('\n', midpoint + 1));
    }

    return null;
  }

  loadNames() {
    if (this.nameDict && this.nameIndex) {
      return Promise.resolve();
    }

    const readNameDict = this.fileRead(
      browser.extension.getURL('data/names.dat')
    ).then(text => {
      this.nameDict = text;
    });
    const readNameIndex = this.fileRead(
      browser.extension.getURL('data/names.idx')
    ).then(text => {
      this.nameIndex = text;
    });

    return Promise.all([readNameDict, readNameIndex]);
  }

  // Note: These are mostly flat text files; loaded as one continous string to
  // reduce memory use
  loadDictionary(): Promise<any> {
    const dataFiles = {
      wordDict: 'dict.dat',
      wordIndex: 'dict.idx',
      kanjiData: 'kanji.dat',
      radData: 'radicals.dat',
    };

    const readPromises = [];
    for (const key in dataFiles) {
      if (dataFiles.hasOwnProperty(key)) {
        const reader: (url: string) => Promise<any> =
          key === 'radData'
            ? this.fileReadArray.bind(this)
            : this.fileRead.bind(this);
        const readPromise = reader(
          browser.extension.getURL(`data/${dataFiles[key]}`)
        ).then(text => {
          this[key] = text;
        });
        readPromises.push(readPromise);
      }
    }

    return Promise.all(readPromises);
  }

  async loadDeinflectData() {
    this.deinflectReasons = [];
    this.deinflectRules = [];

    const buffer = await this.fileReadArray(
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
          ruleGroup = [];
          ruleGroup.fromLen = prevLen;
          this.deinflectRules.push(ruleGroup);
        }
        ruleGroup.push(rule);
      }
    });
  }

  // Returns an array of possible de-inflected versions of |word|.
  deinflect(word): CandidateWord[] {
    const result: Array<CandidateWord> = [];
    const resultIndex: { [index: string]: number } = {};

    const original: CandidateWord = {
      word,
      type: 0xff,
      reason: '',
    };
    result.push(original);
    resultIndex[word] = 0;

    let i = 0;
    do {
      const word = result[i].word;
      const type = result[i].type;

      for (let ruleGroup of this.deinflectRules) {
        if (ruleGroup.fromLen <= word.length) {
          const ending = word.substr(-ruleGroup.fromLen);

          for (let rule of ruleGroup) {
            if (type & rule.type && ending === rule.from) {
              const newWord =
                word.substr(0, word.length - rule.from.length) + rule.to;
              if (newWord.length <= 1) {
                continue;
              }

              if (resultIndex[newWord]) {
                const candidate = result[resultIndex[newWord]];
                candidate.type |= rule.type >> 8;
                continue;
              }
              resultIndex[newWord] = result.length;

              let reason: string = this.deinflectReasons[rule.reason];
              if (result[i].reason.length) {
                reason += ` < ${result[i].reason}`;
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

  async wordSearch(input, doNames, max = 0): Promise<WordSearchResult | null> {
    let [word, inputLengths] = this.normalizeInput(input);

    let maxResults = doNames ? NAMES_MAX_ENTRIES : WORDS_MAX_ENTRIES;
    if (max > 0) {
      maxResults = Math.min(maxResults, max);
    }

    const [dict, index] = await this._getDictAndIndex(doNames);
    const result: WordSearchResult = this._lookupInput(
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
  normalizeInput(input: string) {
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
      } else if (c == 0xff5e) {
        // ignore ～
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

  async _getDictAndIndex(doNames) {
    if (doNames) {
      await this.loadNames();
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
    input,
    inputLengths,
    dict,
    index,
    maxResults,
    deinflect
  ): LookupResult | null {
    let count = 0;
    let longestMatch = 0;
    let cache = [];
    let have = [];

    let result: LookupResult = {
      data: [],
      more: false,
      matchLen: 0,
    };

    while (input.length > 0) {
      var showInf = count != 0;
      // TODO: Split inflection handling out into a separate method
      const trys = deinflect
        ? this.deinflect(input)
        : [{ word: input, type: 0xff, reason: null }];

      for (let i = 0; i < trys.length; i++) {
        const u = trys[i];
        var ix = cache[u.word];
        if (!ix) {
          ix = this.find(index, u.word + ',');
          if (!ix) {
            cache[u.word] = [];
            continue;
          }
          ix = ix.split(',');
          cache[u.word] = ix;
        }

        for (let j = 1; j < ix.length; ++j) {
          var ofs = ix[j];
          if (have[ofs]) {
            continue;
          }

          var dentry = dict.substring(ofs, dict.indexOf('\n', ofs));
          var ok = true;

          if (i > 0) {
            // > 0 a de-inflected word

            // ex:
            // /(io) (v5r) to finish/to close/
            // /(v5r) to finish/to close/(P)/
            // /(aux-v,v1) to begin to/(P)/
            // /(adj-na,exp,int) thank you/many thanks/
            // /(adj-i) shrill/

            var w;
            var x = dentry.split(/[,()]/);
            var y = u.type;
            var z = Math.min(x.length - 1, 10);
            for (; z >= 0; --z) {
              w = x[z];
              if (y & 1 && w == 'v1') break;
              if (y & 4 && w == 'adj-i') break;
              if (y & 2 && w.substr(0, 2) == 'v5') break;
              if (y & 16 && w.substr(0, 3) == 'vs-') break;
              if (y & 8 && w == 'vk') break;
            }
            ok = z != -1;
          }

          if (ok) {
            if (count >= maxResults) {
              result.more = true;
              break;
            }

            have[ofs] = 1;
            ++count;

            longestMatch = Math.max(longestMatch, inputLengths[input.length]);

            let r;
            if (trys[i].reason) {
              r = `< ${trys[i].reason}`;
              if (showInf) {
                r += ` < ${input}`;
              }
            } else {
              r = null;
            }

            result.data.push([dentry, r]);
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

  async translate(text): Promise<TranslateResult> | null {
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
    const splitWords = str => {
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
          entry.components.push({
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

  makeText(entry, max) {
    var e;
    var b;
    var i, j;
    var t;

    if (entry == null) return '';

    b = [];

    if (entry.kanji) {
      b.push(entry.kanji + '\n');
      b.push((entry.eigo.length ? entry.eigo : '-') + '\n');

      b.push(entry.onkun.replace(/\.([^\u3001]+)/g, '\uFF08$1\uFF09') + '\n');
      if (entry.nanori.length) {
        b.push('\u540D\u4E57\u308A\t' + entry.nanori + '\n');
      }
      if (entry.bushumei.length) {
        b.push('\u90E8\u9996\u540D\t' + entry.bushumei + '\n');
      }

      for (let ref of REF_ABBREVIATIONS) {
        const refValue = entry.misc[ref.abbrev];
        b.push(`${ref.name}\t${refValue || '-'}\n`);
      }
    } else {
      if (max > entry.data.length) max = entry.data.length;
      for (i = 0; i < max; ++i) {
        e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
        if (!e) continue;

        if (e[2]) {
          b.push(e[1] + '\t' + e[2]);
        } else {
          b.push(e[1]);
        }

        t = e[3].replace(/\//g, '; ');
        b.push('\t' + t + '\n');
      }
    }
    return b.join('');
  }
}

interface Module {
  exports: any;
}
declare let module: Module;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dictionary;
}
