// Katakana -> Hiragana conversion tables

// prettier-ignore
const HANKAKU_KATAKANA_TO_HIRAGANA = [
  0x30fb, 0x3092, 0x3041, 0x3043, 0x3045, 0x3047, 0x3049, 0x3083, 0x3085,
  0x3087, 0x3063, 0x30fc, 0x3042, 0x3044, 0x3046, 0x3048, 0x304a, 0x304b,
  0x304d, 0x304f, 0x3051, 0x3053, 0x3055, 0x3057, 0x3059, 0x305b, 0x305d,
  0x305f, 0x3061, 0x3064, 0x3066, 0x3068, 0x306a, 0x306b, 0x306c, 0x306d,
  0x306e, 0x306f, 0x3072, 0x3075, 0x3078, 0x307b, 0x307e, 0x307f, 0x3080,
  0x3081, 0x3082, 0x3084, 0x3086, 0x3088, 0x3089, 0x308a, 0x308b, 0x308c,
  0x308d, 0x308f, 0x3093,
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

// Half & full-width katakana to hiragana conversion
//
// Returns the hiragana input and an array that maps each character
// in the hiragana output to the corresponding length in the original input.
//
// e.g. If the input string is ｶﾞｰﾃﾞﾝ the result will be
//
//   [ "がーでん", [ 0, 2, 3, 5, 6 ] ]
//
// Returns [ hiragana output, array with length mapping ]
//
// TODO: Translate this range https://en.wikipedia.org/wiki/Enclosed_Ideographic_Supplement
//
// TODO: Translate the first part of this range: https://en.wikipedia.org/wiki/CJK_Compatibility
export function kanaToHiragana(input: string): [string, number[]] {
  let inputLengths = [0];
  let previous = 0;
  let result = '';

  for (let i = 0; i < input.length; ++i) {
    let originalChar = input.charCodeAt(i);
    let c = originalChar;

    // Full-width katakana to hiragana
    if ((c >= 0x30a1 && c <= 0x30f6) || c === 0x30fd || c === 0x30fe) {
      c -= 0x60;
    } else if (c >= 0xff65 && c <= 0xff9d) {
      // Half-width katakana to hiragana
      c = HANKAKU_KATAKANA_TO_HIRAGANA[c - 0xff65];
    } else if (c == 0xff9e) {
      // Voiced (used in half-width katakana) to hiragana
      if (previous >= 0xff73 && previous <= 0xff8e) {
        result = result.slice(0, -1);
        c = VOICED_KATAKANA_TO_HIRAGANA[previous - 0xff73];
      }
    } else if (c == 0xff9f) {
      // Semi-voiced (used in half-width katakana) to hiragana
      if (previous >= 0xff8a && previous <= 0xff8e) {
        result = result.slice(0, -1);
        c = SEMIVOICED_KATAKANA_TO_HIRAGANA[previous - 0xff8a];
      }
    } else if (c == 0xff5e && i > 0) {
      // Ignore ～ (but only if it's in the middle/end of a word)
      previous = 0;
      continue;
    }

    result += String.fromCharCode(c);
    // Need to keep real length because of the half-width semi/voiced conversion
    inputLengths[result.length] = i + 1;
    previous = originalChar;
  }

  return [result, inputLengths];
}

export function normalizeInput(input: string): [string, number[]] {
  let [normalized, inputLengths] = kanaToHiragana(input);

  // Truncate if we find characters outside the expected range.
  for (let i = 0; i < input.length; ++i) {
    // If we find a character out of range, we need to trim both normalized
    // and inputLengths
    if (input.charCodeAt(i) <= 0x3002) {
      let outputIndex = 0;
      while (inputLengths[outputIndex] < i) {
        outputIndex++;
      }
      normalized = normalized.substr(0, outputIndex);
      inputLengths = inputLengths.slice(0, outputIndex + 1);
      break;
    }
  }

  return [normalized, inputLengths];
}
