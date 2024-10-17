import { describe, expect, it } from 'vitest';

import { extractNumberMetadata, parseNumber } from './numbers';

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
    expect(parseNumber('9万8800')).toEqual(98800);
    expect(parseNumber('100億')).toEqual(10000000000);
    expect(parseNumber('100億123万3')).toEqual(10001230003);

    // This is bogus but we happen to make sense of it anyway
    //
    // (This function is not intended to correctness check the input, it's just
    // supposed to try and make sense of whatever input it encounters.)
    expect(parseNumber('七万九千〇五')).toStrictEqual(79005);

    // More transliterated digits
    expect(parseNumber('七二一三〇六四九')).toEqual(72130649);
    expect(parseNumber('８３０')).toEqual(830);
    expect(parseNumber('830')).toEqual(830);
    expect(parseNumber('43.2')).toEqual(43.2);
    expect(parseNumber('４３．２')).toEqual(43.2);
    expect(parseNumber('４３。２')).toEqual(43.2);

    // Decimals and kanji
    expect(parseNumber('43.2万')).toEqual(432_000);
    expect(parseNumber('4.2万')).toEqual(42_000);
    expect(parseNumber('0.2万')).toEqual(2_000);
    expect(parseNumber('54.321万')).toEqual(543_210);
    expect(parseNumber('987.654321万')).toBeCloseTo(9_876_543.21, 5);
    expect(parseNumber('1.2億')).toEqual(120000000);
    // As seen here: https://www.athome.co.jp/kodate/1008941087/
    expect(parseNumber('39,800万')).toEqual(398_000_000);
    // https://github.com/birchill/10ten-ja-reader/issues/1399
    expect(parseNumber('11,786百万')).toEqual(11_786_000_000);
    expect(parseNumber('123,456,789百万')).toEqual(123_456_789_000_000);

    // Bogus inputs

    // Putting the powers of ten in the wrong order
    expect(parseNumber('七十二百一')).toStrictEqual(null);

    // Don't handle metric suffixes for bare numbers--we only allow them when
    // part of a currency.
    expect(parseNumber('40k')).toStrictEqual(null);

    // Completely invalid inputs
    expect(parseNumber('abc')).toStrictEqual(null);
    expect(parseNumber('')).toStrictEqual(null);
  });
});

describe('extractNumberMetadata', () => {
  it('extracts numbers', () => {
    // Needs to be at least two characters long
    expect(extractNumberMetadata('1')).toStrictEqual(undefined);
    expect(extractNumberMetadata('0')).toStrictEqual(undefined);
    expect(extractNumberMetadata('二')).toStrictEqual(undefined);
    expect(extractNumberMetadata('十')).toStrictEqual(undefined);
    expect(extractNumberMetadata('〇')).toStrictEqual(undefined);

    // Needs to have at least one kanji character
    expect(extractNumberMetadata('123')).toStrictEqual(undefined);
    expect(extractNumberMetadata('8,800')).toStrictEqual(undefined);
    expect(extractNumberMetadata('43.2')).toStrictEqual(undefined);
    expect(extractNumberMetadata('４３．２')).toStrictEqual(undefined);
    expect(extractNumberMetadata('４３。２')).toStrictEqual(undefined);
    expect(extractNumberMetadata('40k')).toStrictEqual(undefined);

    // Shouldn't be zero
    expect(extractNumberMetadata('〇〇〇')).toStrictEqual(undefined);

    // Successful cases
    expect(extractNumberMetadata('二十')).toStrictEqual({
      type: 'number',
      value: 20,
      src: '二十',
      matchLen: 2,
    });
    expect(extractNumberMetadata('2十')).toStrictEqual({
      type: 'number',
      value: 20,
      src: '2十',
      matchLen: 2,
    });
    expect(extractNumberMetadata('8万8千')).toStrictEqual({
      type: 'number',
      value: 88000,
      src: '8万8千',
      matchLen: 4,
    });
    expect(extractNumberMetadata('3,600億')).toStrictEqual({
      type: 'number',
      value: 360000000000,
      src: '3,600億',
      matchLen: 6,
    });
    expect(extractNumberMetadata('43.2万')).toStrictEqual({
      type: 'number',
      value: 432_000,
      src: '43.2万',
      matchLen: 5,
    });
    expect(extractNumberMetadata('4,321.0万')).toStrictEqual({
      type: 'number',
      value: 43_210_000,
      src: '4,321.0万',
      matchLen: 8,
    });
    expect(extractNumberMetadata('25.301億')).toStrictEqual({
      type: 'number',
      value: 2530100000,
      src: '25.301億',
      matchLen: 7,
    });

    // Produces correct src / matchLen
    expect(extractNumberMetadata('二十キロメートル')).toStrictEqual({
      type: 'number',
      value: 20,
      src: '二十',
      matchLen: 2,
    });
  });
});
