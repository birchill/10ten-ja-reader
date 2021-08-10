import { parseNumber } from './numbers';

describe('parseNumber', () => {
  it('converts various numbers', () => {
    expect(parseNumber('〇')).toEqual(0);
    expect(parseNumber('一')).toEqual(1);

    // Transliterated digits
    expect(parseNumber('五六')).toEqual(56);
    // Powers of ten
    expect(parseNumber('五十六')).toEqual(56);

    // More powers of ten
    expect(parseNumber('五百十六')).toEqual(516);
    expect(parseNumber('五十万一')).toEqual(500001);
    expect(parseNumber('五億五万一')).toEqual(500050001);
    expect(parseNumber('五万億五万一')).toEqual(5000000050001);
    expect(parseNumber('五十万億百万一')).toEqual(50000001000001);

    // Mixing numerals and powers of ten
    expect(parseNumber('8万8千')).toEqual(88000);
    expect(parseNumber('８万８千')).toEqual(88000);

    // More transliterated digits
    expect(parseNumber('七二一三〇六四九')).toEqual(72130649);
    expect(parseNumber('８３０')).toEqual(830);
    expect(parseNumber('830')).toEqual(830);
    expect(parseNumber('43.2')).toEqual(43.2);
    expect(parseNumber('４３．２')).toEqual(43.2);
    expect(parseNumber('４３。２')).toEqual(43.2);

    // Bogus inputs

    // Mixing digits with powers of ten
    expect(parseNumber('七万九千〇五')).toStrictEqual(null);
    // Putting the powers of ten in the wrong order
    expect(parseNumber('七十二百一')).toStrictEqual(null);

    // Completely invalid inputs
    expect(parseNumber('abc')).toStrictEqual(null);
    expect(parseNumber('')).toStrictEqual(null);
  });
});
