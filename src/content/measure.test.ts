import { describe, expect, it } from 'vitest';

import { extractMeasureMetadata } from './measure';

describe('extractMeasureMetadata', () => {
  it('recognizes various jou measures', () => {
    expect(extractMeasureMetadata('6畳。')).toEqual({
      type: 'measure',
      unit: '畳',
      value: 6,
      matchLen: 2,
    });
    expect(extractMeasureMetadata('六畳')).toEqual({
      type: 'measure',
      unit: '畳',
      value: 6,
      matchLen: 2,
    });
    expect(extractMeasureMetadata('６畳')).toEqual({
      type: 'measure',
      unit: '畳',
      value: 6,
      matchLen: 2,
    });
    expect(extractMeasureMetadata('六〇畳')).toEqual({
      type: 'measure',
      unit: '畳',
      value: 60,
      matchLen: 3,
    });
    expect(extractMeasureMetadata('六十畳')).toEqual({
      type: 'measure',
      unit: '畳',
      value: 60,
      matchLen: 3,
    });
    expect(extractMeasureMetadata('四畳半')).toEqual({
      type: 'measure',
      unit: '畳',
      value: 4.5,
      matchLen: 3,
    });
    expect(extractMeasureMetadata('6 畳です')).toEqual({
      type: 'measure',
      unit: '畳',
      value: 6,
      matchLen: 3,
    });
    expect(extractMeasureMetadata('1.5 帖 です')).toEqual({
      type: 'measure',
      unit: '帖',
      value: 1.5,
      matchLen: 5,
    });
  });

  it('recognizes various square metre measures', () => {
    expect(extractMeasureMetadata('6m2')).toEqual({
      type: 'measure',
      unit: 'm2',
      value: 6,
      matchLen: 3,
    });
    expect(extractMeasureMetadata('6 ㎡')).toEqual({
      type: 'measure',
      unit: 'm2',
      value: 6,
      matchLen: 3,
    });
    expect(extractMeasureMetadata('6m²')).toEqual({
      type: 'measure',
      unit: 'm2',
      value: 6,
      matchLen: 3,
    });
    expect(extractMeasureMetadata('22.5平方メートル')).toEqual({
      type: 'measure',
      unit: 'm2',
      value: 22.5,
      matchLen: 10,
    });
    expect(extractMeasureMetadata('22.5平方ﾒｰﾄﾙ')).toEqual({
      type: 'measure',
      unit: 'm2',
      value: 22.5,
      matchLen: 10,
    });
    expect(extractMeasureMetadata('22.5平方㍍')).toEqual({
      type: 'measure',
      unit: 'm2',
      value: 22.5,
      matchLen: 7,
    });
    expect(extractMeasureMetadata('22.5平㍍')).toEqual({
      type: 'measure',
      unit: 'm2',
      value: 22.5,
      matchLen: 6,
    });
    expect(extractMeasureMetadata('22.5平米')).toEqual({
      type: 'measure',
      unit: 'm2',
      value: 22.5,
      matchLen: 6,
    });
    expect(extractMeasureMetadata('十二平方米')).toEqual({
      type: 'measure',
      unit: 'm2',
      value: 12,
      matchLen: 5,
    });
  });
});
