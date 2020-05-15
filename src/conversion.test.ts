import { normalizeKana, normalizeInput } from './conversion';

describe('normalizeKana', () => {
  it('converts full-width katakana', () => {
    expect(normalizeKana('ガーデン')).toEqual(['がーでん', [0, 1, 2, 3, 4]]);
    // Does some extended characters too
    expect(normalizeKana('ヴヵヶ')).toEqual(['ゔゕゖ', [0, 1, 2, 3]]);
  });

  it('converts half-width katakana', () => {
    expect(normalizeKana('ｶﾞｰﾃﾞﾝ')).toEqual(['がーでん', [0, 2, 3, 5, 6]]);
    expect(normalizeKana('･ｰ')).toEqual(['・ー', [0, 1, 2]]);
  });

  it('converts iteration marks', () => {
    expect(normalizeKana('ヽヾ')).toEqual(['ゝゞ', [0, 1, 2]]);
  });

  it("does not convert katakana which don't have hiragana equivalents", () => {
    expect(normalizeKana('ヷヸヹヺ・ーア')).toEqual([
      'ヷヸヹヺ・ーあ',
      [0, 1, 2, 3, 4, 5, 6, 7],
    ]);
  });

  it('converts decomposed forms', () => {
    expect(normalizeInput('ダイエット')).toEqual([
      'だいえっと',
      [0, 2, 3, 4, 5, 6],
    ]);

    // The following case covers all the decomposed characters in Unicode that
    // include 0x3099 or 0x309A.
    //
    // Critically, it includes the four katakana that cannot be converted into
    // hiragana:
    //
    //   ヷヸヹヺ
    //
    // so we can test that they DON'T get converted to hiragana in the process
    // of replacing them with their composed equivalents.

    // prettier-ignore
    expect(normalizeInput(
      '\u304b\u3099\u304d\u3099\u304f\u3099\u3051\u3099\u3053\u3099' +
      '\u3055\u3099\u3057\u3099\u3059\u3099\u305b\u3099\u305d\u3099' +
      '\u305f\u3099\u3061\u3099\u3064\u3099\u3066\u3099\u3068\u3099' +
      '\u306f\u3099\u3072\u3099\u3075\u3099\u3078\u3099\u307b\u3099' +
      '\u3046\u3099\u309d\u3099\u30ab\u3099\u30ad\u3099\u30af\u3099' +
      '\u30b1\u3099\u30b3\u3099\u30b5\u3099\u30b7\u3099\u30b9\u3099' +
      '\u30bb\u3099\u30bd\u3099\u30bf\u3099\u30c1\u3099\u30c4\u3099' +
      '\u30c6\u3099\u30c8\u3099\u30cf\u3099\u30d2\u3099\u30d5\u3099' +
      '\u30d8\u3099\u30db\u3099\u30a6\u3099\u30ef\u3099\u30f0\u3099' +
      '\u30f1\u3099\u30f2\u3099\u306f\u309a\u3072\u309a\u3075\u309a' +
      '\u3078\u309a\u307b\u309a\u30cf\u309a\u30d2\u309a\u30d5\u309a' +
      '\u30d8\u309a\u30db\u309a'
    )).toEqual([
      '\u304c\u304e\u3050\u3052\u3054\u3056\u3058\u305a\u305c\u305e\u3060' +
      '\u3062\u3065\u3067\u3069\u3070\u3073\u3076\u3079\u307c\u3094\u309e' +
      '\u304c\u304e\u3050\u3052\u3054\u3056\u3058\u305a\u305c\u305e\u3060' +
      '\u3062\u3065\u3067\u3069\u3070\u3073\u3076\u3079\u307c\u3094\u30f7' +
      '\u30f8\u30f9\u30fa\u3071\u3074\u3077\u307a\u307d\u3071\u3074\u3077' +
      '\u307a\u307d',
      [
        0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34,
        36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68,
        70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100,
        102, 104, 106, 108, 110, 112, 114
      ],
    ]);
  });
});

describe('normalizeInput', () => {
  it('trims input at the first out-of-range character', () => {
    expect(normalizeInput('ｶﾞｰﾃﾞﾝ。')).toEqual(['がーでん', [0, 2, 3, 5, 6]]);
  });
});
