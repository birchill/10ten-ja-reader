import { describe, expect, it } from 'vitest';

import { getDob } from './age';

describe('annotateAge', () => {
  it('recognizes the age of a living person', () => {
    expect(getDob('Oota Hikari (1965.5.13-)')).toEqual({
      date: new Date(1965, 4, 13),
      approx: false,
    });
  });
  it('recognizes the age of a person with other annotations', () => {
    expect(getDob('Taro Kono (1963.1.10-; Japanese politician)')).toEqual({
      date: new Date(1963, 0, 10),
      approx: false,
    });
  });
  it('recognizes an approximate age', () => {
    expect(getDob('Edano Yukio (1964.5-)')).toEqual({
      date: new Date(1964, 4, 1),
      approx: true,
    });
  });
  it('recognizes a backwards age', () => {
    expect(
      getDob('Kei Komuro (10.5.1991-; lawyer who married Princess Mako)')
    ).toEqual({ date: new Date(1991, 9, 5), approx: false });
    expect(
      getDob('Mako Komuro (10.31.1991-; former imperial princess)')
    ).toEqual({ date: new Date(1991, 9, 31), approx: false });
  });
  it('ignores the age of a deceased person', () => {
    expect(getDob('Tsutomu Hata (1935.8.24-2017.8.28)')).toBe(null);
  });
  it('ignores an age with only a year', () => {
    expect(getDob('Shōten (1966-; TV comedy program)')).toBe(null);
  });
});
