/** @public */
export const halfWidthNumbers = /[0-9]/;

// U+FF01~U+FF5E is for full-width alphanumerics (includes some punctuation
// like ＆ and ～ because they appear in the kanji headwords for some entries)
//
// Note that U+FF5E is full-width tilde ～ (not 〜 which is a wave dash).
//
// U+FF61~U+FF65 is some halfwidth ideographic symbols, e.g. ｡ but we skip them
// (although previous rikai-tachi included them) since they're mostly going to
// be delimiters
/** @public */
export const fullWidthAlphanumerics = /[\uff01-\uff5e]/;

// On some platforms, Google Docs puts zero-width joiner characters between
// _all_ the characters so we need to match on them in order to match runs of
// characters.
/** @public */
export const zeroWidthNonJoiner = /[\u200c]/;

// * U+25CB is 'white circle' often used to represent a blank
//   (U+3007 is an ideographic zero that is also sometimes used for this
//   purpose, but this is included in the U+3001~U+30FF range.)
/** @public */
export const whiteCircle = /[\u25cb]/;

// U+2E80~U+2EF3 is the CJK radicals supplement block
// U+2F00~U+2FD5 is the Kangxi radicals block
/** @public */
export const radicals = /[\u2e80-\u2ef3\u2f00-\u2fd5]/u;

// * U+3000~U+3039 is ideographic punctuation but we skip:
//
//    U+3000 (ideographic space),
//    U+3001 (、 ideographic comma),
//    U+3002 (。 ideographic full stop),
//    U+3003 (〃 ditto mark),
//    U+3008,U+3009 (〈〉),
//    U+300A,U+300B (《》),
//    U+300C,U+300D (「」 corner brackets for quotations),
//                  [ENAMDICT actually uses this in one entry,
//                  "ウィリアム「バッファロービル」コーディ", but I think we
//                  can live without being able to recognize that)
//    U+300E,U+300F (『 』), and
//    U+3010,U+3011 (【 】),
//
//   since these are typically only going to delimit words.
/** @public */
export const nonDelimitingIdeographicPunctuation =
  /[\u3004-\u3007\u3012-\u3039]/;

// U+3041~U+309F is the hiragana range
/** @public */
export const hiragana = /[\u3041-\u309f\u{1b001}]/u;

// U+30A0~U+30FF is the katakana range
/** @public */
export const katakana = /[\u30a0-\u30ff\u{1b000}]/u;

// * U+3220~U+3247 is various enclosed characters like ㈵
// * U+3280~U+32B0 is various enclosed characters like ㊞
// * U+32D0~U+32FF is various enclosed characters like ㋐ and ㋿.
const enclosedChars = /[\u3220-\u3247\u3280-\u32b0\u32d0-\u32ff]/;

// U+3300~U+3357 is various shorthand characters from the CJK compatibility
// block like ㍍
const shorthandChars = /[\u3300-\u3357]/;

// U+3358~U+3370 is numbers composed with 点 e.g. ㍘
const tenChars = /[\u3358-\u3370]/;

// U+337B~U+337E is various era names e.g. ㍻
const eraChars = /[\u337B-\u337E]/;

// U+337F is ㍿
const kabushikiGaisha = /[\u337F]/;

// U+4E00~U+9FFF is the CJK Unified Ideographs block ("the kanji")
/** @public */
export const kanji = /[\u4e00-\u9fff]/;

// * U+3400~U+4DBF is the CJK Unified Ideographs Extension A block (rare
//   kanji)
// * U+F900~U+FAFF is the CJK Compatibility Ideographs block (random odd
//   kanji, because standards)
// * U+20000~U+2A6DF is CJK Unified Ideographs Extension B (more rare kanji)
/** @public */
export const rareKanji = /[\u3400-\u4dbf\uf900-\ufaff\u{20000}-\u{2a6df}]/u;

// U+FF66~U+FF9F is halfwidth katakana
/** @public */
export const halfwidthKatakanaChar = /[\uff66-\uff9f]/;

// U+1B002-U+1B0FF is hentaigana
/** @public */
export const hentaigana = /[\u{1b002}-\u{1b0ff}]/u;

// U+1F200-U+1F2FF is the Enclosed Ideographic Supplement block
/** @public */
export const enclosedIdeographicSupplement = /[\u{1f200}-\u{1f2ff}]/u;

export function getCombinedCharRange(ranges: Array<RegExp>): RegExp {
  let source = '[';
  let flags = '';

  for (const range of ranges) {
    // Check we have a character class
    if (!isCharacterClassRange(range)) {
      throw new Error(`Expected a character class range, got: ${range.source}`);
    }

    // Check it is not negated
    if (range.source[1] === '^') {
      throw new Error(
        `Expected a non-negated character class range, got ${range.source}`
      );
    }

    source += range.source.substring(1, range.source.length - 1);
    if (range.flags.indexOf('u') !== -1) {
      flags = 'u';
    }
  }

  source += ']';

  return new RegExp(source, flags);
}

// This is far from complete but all the RegExps we deal with are ones we've
// written so hopefully it's a good-enough sanity check.
function isCharacterClassRange(re: RegExp): boolean {
  return (
    re.source.length >= 2 &&
    re.source.startsWith('[') &&
    re.source.endsWith(']')
  );
}

// "Japanese" here simply means any character we treat as worth attempting to
// translate, including full-width alphanumerics etc. but NOT characters that
// typically delimit words.
/** @public */
export const japaneseChar = getCombinedCharRange([
  // We include half-width numbers so we can recognize things like 小1
  halfWidthNumbers,
  fullWidthAlphanumerics,
  zeroWidthNonJoiner,
  whiteCircle,
  radicals,
  nonDelimitingIdeographicPunctuation,
  hiragana,
  katakana,
  enclosedChars,
  shorthandChars,
  tenChars,
  eraChars,
  kabushikiGaisha,
  kanji,
  rareKanji,
  halfwidthKatakanaChar,
  hentaigana,
  enclosedIdeographicSupplement,
]);

export function getNegatedCharRange(range: RegExp): RegExp {
  // Check if we got a character class range
  if (!isCharacterClassRange(range)) {
    throw new Error(`Expected a character class range, got: ${range.source}`);
  }

  const negated = range.source[1] === '^';

  const source = `[${negated ? '' : '^'}${range.source.substring(
    negated ? 2 : 1,
    range.source.length - 1
  )}]`;

  return new RegExp(source, range.flags);
}

export const nonJapaneseChar = getNegatedCharRange(japaneseChar);

export function hasKatakana(text: string): boolean {
  return katakana.test(text);
}

export function startsWithDigit(input: string): boolean {
  const c = input.length ? input.charCodeAt(0) : 0;
  return (c >= 48 && c <= 57) || (c >= 65296 && c <= 65305);
}

const kanjiNumerals = [
  '〇',
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '百',
  '千',
  '万',
  '億',
  '兆',
  '京',
];

export function startsWithNumeral(input: string): boolean {
  return (
    startsWithDigit(input) ||
    (!!input.length && kanjiNumerals.includes(input[0]))
  );
}

const onlyDigits = /^[0-9０-９,，、.．]+$/;

export function isOnlyDigits(input: string): boolean {
  return onlyDigits.test(input);
}
