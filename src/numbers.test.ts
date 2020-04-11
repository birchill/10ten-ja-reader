import { kanjiToNumber } from './numbers';

describe('kanjiToNumber', () => {
  it('converts various numbers', () => {
    expect(kanjiToNumber('一')).toEqual(1);
    expect(kanjiToNumber('五十六')).toEqual(56);
    expect(kanjiToNumber('五十万一')).toEqual(500001);
    expect(kanjiToNumber('abc')).toStrictEqual(null);
    expect(kanjiToNumber('')).toStrictEqual(null);
  });
});
