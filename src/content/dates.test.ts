import { describe, expect, it, vi } from 'vitest';

import { BackgroundRequest } from '../background/background-request';
import { calculateEraDateTimeSpan } from '../background/calculate-date';

import {
  EraInfoDate,
  getEraInfoTimeSpan,
  parseEraDate,
  startsWithEraName,
} from './dates';

vi.mock('webextension-polyfill', () => ({
  default: {
    runtime: {
      sendMessage: (request: BackgroundRequest) => {
        if (request.type === 'calculateEraDateTimeSpan') {
          return Promise.resolve(calculateEraDateTimeSpan(request));
        }
        return null;
      },
    },
  },
}));

describe('era date conversion', () => {
  it('detects strings that start with an era name', () => {
    expect(startsWithEraName('令和')).toBe(true);
    expect(startsWithEraName('令和元年')).toBe(true);
    expect(startsWithEraName('令元年')).toBe(false);
    expect(startsWithEraName('令')).toBe(false);
    expect(startsWithEraName('')).toBe(false);
    expect(startsWithEraName('㋿2年')).toBe(true);
    expect(startsWithEraName('天平神護')).toBe(true);
  });

  it('parses era dates correctly', () => {
    const cases: Array<
      [
        text: string,
        matchLength?: number,
        era?: string,
        year?: number,
        month?: number,
        day?: number,
      ]
    > = [
      ['  安永  2  年  閏  3  月  10  日xxx', 26, '安永', 2, -3, 10],

      ['令和1年３月二十日', 9, '令和', 1, 3, 20],
      ['令和1年３月二十', 6, '令和', 1, 3],
      ['令和1年３', 4, '令和', 1],
      ['令和1', 3, '令和', 1],
      ['令和元', undefined],
      ['令和元年', 4, '令和', 0],
      ['令和元歳', 4, '令和', 0],
      ['令和1歳', 4, '令和', 1],
      ['㋿1年', 3, '令和', 1],

      // Invalid parts of date
      // Invalid era name
      ['令1年', undefined],
      // There is no 13th month
      ['令和1年13月1日', 4, '令和', 1, undefined],
      // Gregorian era dates don't have leap months
      ['令和1年閏1月1日', 4, '令和', 1, undefined],
    ];

    for (const [text, matchLength, era, year, month, day] of cases) {
      const parsed = { era, year, month, day, matchLength };

      const result = parseEraDate(text);

      if (!matchLength) {
        expect(result).toBeUndefined();
      } else {
        expect(result).toEqual(parsed);
      }
    }
  });

  it('calculates time spans correctly', () => {
    const cases: Array<
      [
        era: string,
        year: number,
        month?: number,
        day?: number,
        dateStart?: EraInfoDate,
        dateEnd?: EraInfoDate,
      ]
    > = [
      // Gregorian eras
      ['令和', 0, 1, 1, { year: 2019, month: 1, day: 1 }],
      ['令和', 1, 1, 1, { year: 2019, month: 1, day: 1 }],
      ['令和', 1, 1, undefined, { year: 2019, month: 1 }],
      ['明治', 6, undefined, undefined, { year: 1873 }],

      // Full non Gregorian date
      ['明治', 5, 6, 15, { year: 1872, month: 7, day: 20 }],

      // First year of era
      [
        '安政',
        0,
        undefined,
        undefined,
        { year: 1855, month: 1, day: 15 },
        { year: 1855, month: 2, day: 16 },
      ],
      [
        '安政',
        1,
        undefined,
        undefined,
        { year: 1855, month: 1, day: 15 },
        { year: 1855, month: 2, day: 16 },
      ],

      // Arbitrary year in between
      [
        '安政',
        4,
        undefined,
        undefined,
        { year: 1857, month: 1, day: 26 },
        { year: 1858, month: 2, day: 13 },
      ],

      // Last year of era
      [
        '安政',
        7,
        undefined,
        undefined,
        { year: 1860, month: 1, day: 23 },
        { year: 1860, month: 4, day: 8 },
      ],

      // Invalid year
      ['安政', 8, undefined],

      // Arbitrary month
      [
        '安政',
        4,
        1,
        undefined,
        { year: 1857, month: 1, day: 26 },
        { year: 1857, month: 2, day: 23 },
      ],

      // Month before leap month
      [
        '安政',
        4,
        5,
        undefined,
        { year: 1857, month: 5, day: 23 },
        { year: 1857, month: 6, day: 21 },
      ],

      // Leap month
      [
        '安政',
        4,
        -5,
        undefined,
        { year: 1857, month: 6, day: 22 },
        { year: 1857, month: 7, day: 20 },
      ],

      // Last month of year
      [
        '安政',
        4,
        12,
        undefined,
        { year: 1858, month: 1, day: 15 },
        { year: 1858, month: 2, day: 13 },
      ],

      // Last month of year is a leap month
      [
        '安永',
        4,
        -12,
        undefined,
        { year: 1776, month: 1, day: 21 },
        { year: 1776, month: 2, day: 18 },
      ],

      // Invalid month
      ['安政', 4, -12, undefined],
    ];

    for (const [era, year, month, day, dateStart, dateEnd] of cases) {
      void getEraInfoTimeSpan({
        era,
        year,
        month,
        day,
        type: 'era',
        matchLen: 0, // not used
      }).then((result) => {
        if (!dateStart && !dateEnd) {
          expect(result).toBeUndefined();
        } else {
          expect(result).toBeDefined();
          expect(result!.dateStart).toEqual(dateStart);
          expect(result!.dateEnd).toEqual(dateEnd);
        }
      });
    }
  });
});
