import { kanjiToNumber } from './numbers';

describe('kanjiToNumber', () => {
  it('converts various numbers', () => {
    expect(kanjiToNumber('一')).toEqual(1);
    expect(kanjiToNumber('五十六')).toEqual(56);
    expect(kanjiToNumber('五百十六')).toEqual(516);
    expect(kanjiToNumber('五十万一')).toEqual(500001);
    expect(kanjiToNumber('五億五万一')).toEqual(500050001);
    expect(kanjiToNumber('五万億五万一')).toEqual(5000000050001);
    expect(kanjiToNumber('五十万億百万一')).toEqual(50000001000001);
    expect(kanjiToNumber('七二一三五六四九')).toStrictEqual(null);
    expect(kanjiToNumber('七十二百一')).toStrictEqual(null);
    expect(kanjiToNumber('abc')).toStrictEqual(null);
    expect(kanjiToNumber('')).toStrictEqual(null);
  });
});
