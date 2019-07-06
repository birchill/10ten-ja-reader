import { kanaToHiragana, normalizeInput } from './conversion';

describe('kanaToHiragana', () => {
  it('converts full-width katakana', () => {
    expect(kanaToHiragana('ガーデン')).toEqual(['がーでん', [0, 1, 2, 3, 4]]);
    // Does some extended characters too
    expect(kanaToHiragana('ヴヵヶ')).toEqual(['ゔゕゖ', [0, 1, 2, 3]]);
  });

  it('converts half-width katakana', () => {
    expect(kanaToHiragana('ｶﾞｰﾃﾞﾝ')).toEqual(['がーでん', [0, 2, 3, 5, 6]]);
    expect(kanaToHiragana('･ｰ')).toEqual(['・ー', [0, 1, 2]]);
  });

  it('converts iteration marks', () => {
    expect(kanaToHiragana('ヽヾ')).toEqual(['ゝゞ', [0, 1, 2]]);
  });

  it("does not convert katakana which don't have hiragana equivalents", () => {
    expect(kanaToHiragana('ヷヸヹヺ・ーア')).toEqual([
      'ヷヸヹヺ・ーあ',
      [0, 1, 2, 3, 4, 5, 6, 7],
    ]);
  });
});

describe('normalizeInput', () => {
  it('trims input at the first out-of-range character', () => {
    expect(normalizeInput('ｶﾞｰﾃﾞﾝ。')).toEqual(['がーでん', [0, 2, 3, 5, 6]]);
  });
});
