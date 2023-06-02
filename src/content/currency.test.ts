import { describe, expect, it } from 'vitest';
import { extractCurrencyMetadata } from './currency';

describe('extractCurrencyMetadata', () => {
  it('recognizes various currency values', () => {
    expect(extractCurrencyMetadata('8万8千円')).toEqual({
      type: 'currency',
      value: 88000,
      matchLen: 5,
    });
    expect(extractCurrencyMetadata('¥88,000')).toEqual({
      type: 'currency',
      value: 88000,
      matchLen: 7,
    });
    expect(extractCurrencyMetadata('￥88、000')).toEqual({
      type: 'currency',
      value: 88000,
      matchLen: 7,
    });
    expect(extractCurrencyMetadata('￥８８０００')).toEqual({
      type: 'currency',
      value: 88000,
      matchLen: 6,
    });
    expect(extractCurrencyMetadata('88,000 円')).toEqual({
      type: 'currency',
      value: 88000,
      matchLen: 8,
    });
    expect(extractCurrencyMetadata('¥ 88,000')).toEqual({
      type: 'currency',
      value: 88000,
      matchLen: 8,
    });
    expect(extractCurrencyMetadata('88,000 円です')).toEqual({
      type: 'currency',
      value: 88000,
      matchLen: 8,
    });
    expect(extractCurrencyMetadata('八万八千円')).toEqual({
      type: 'currency',
      value: 88000,
      matchLen: 5,
    });
    expect(extractCurrencyMetadata('八八〇〇〇円')).toEqual({
      type: 'currency',
      value: 88000,
      matchLen: 6,
    });

    // Fractional amounts
    expect(extractCurrencyMetadata('123.45円')).toEqual({
      type: 'currency',
      value: 123.45,
      matchLen: 7,
    });
    expect(extractCurrencyMetadata('１２３．４５円')).toEqual({
      type: 'currency',
      value: 123.45,
      matchLen: 7,
    });
    expect(extractCurrencyMetadata('１２３。４５円')).toEqual({
      type: 'currency',
      value: 123.45,
      matchLen: 7,
    });
    expect(extractCurrencyMetadata('123.45万円')).toEqual({
      type: 'currency',
      value: 1_234_500,
      matchLen: 8,
    });

    // Very large amounts
    expect(extractCurrencyMetadata('8兆8億円')).toEqual({
      type: 'currency',
      value: 8000800000000,
      matchLen: 5,
    });
    expect(extractCurrencyMetadata('￥8兆8億')).toEqual({
      type: 'currency',
      value: 8000800000000,
      matchLen: 5,
    });

    // Mixed kanji and half-width
    expect(extractCurrencyMetadata('9万8800円')).toEqual({
      type: 'currency',
      value: 98800,
      matchLen: 7,
    });
    expect(extractCurrencyMetadata('100億円')).toEqual({
      type: 'currency',
      value: 10000000000,
      matchLen: 5,
    });
  });
});
