import { describe, expect, it } from 'vitest';

import { normalizeInput } from '../utils/normalize';

import type { DictionaryWordResult } from './search-result';
import { wordSearch } from './word-search';

describe('wordSearch', () => {
  it('does not split inside indivisible ranges while shortening', async () => {
    const input = 'けんせいしてたすけに';
    const [normalized, inputLengths] = normalizeInput(input);
    const lookups: Array<string> = [];

    const result = await wordSearch({
      getWords: async ({ input }) => {
        lookups.push(input);
        return input === 'けんせいして'
          ? [makeWordResult({ id: 1, reading: input })]
          : [];
      },
      input: normalized,
      inputLengths,
      indivisibleRanges: [{ start: 6, end: 8 }],
      maxResults: 10,
    });

    expect(result?.matchLen).toBe(6);
    expect(lookups).toContain('けんせいして');
    expect(lookups).not.toContain('けんせいしてた');
  });

  it('allows shortening at center-dot boundaries between indivisible ranges', async () => {
    const input = 'あ・い・う';
    const [normalized, inputLengths] = normalizeInput(input);
    const lookups: Array<string> = [];

    const result = await wordSearch({
      getWords: async ({ input }) => {
        lookups.push(input);
        return input === 'あ・い'
          ? [makeWordResult({ id: 2, reading: input })]
          : [];
      },
      input: normalized,
      inputLengths,
      indivisibleRanges: [
        { start: 0, end: 1 },
        { start: 2, end: 3 },
        { start: 4, end: 5 },
      ],
      maxResults: 10,
    });

    expect(result?.matchLen).toBe(3);
    expect(lookups).toContain('あ・い');
  });

  it('does not split a trailing yoon when shortening', async () => {
    const [normalized, inputLengths] = normalizeInput('きゃ');
    const lookups: Array<string> = [];

    await wordSearch({
      getWords: async ({ input }) => {
        lookups.push(input);
        return [];
      },
      input: normalized,
      inputLengths,
      maxResults: 10,
    });

    expect(lookups).toContain('きゃ');
    expect(lookups).not.toContain('き');
  });

  it('tries choon-expanded variants', async () => {
    const [normalized, inputLengths] = normalizeInput('そーゆー');
    const lookups: Array<string> = [];

    const result = await wordSearch({
      getWords: async ({ input }) => {
        lookups.push(input);
        return input === 'そうゆう'
          ? [makeWordResult({ id: 3, reading: input })]
          : [];
      },
      input: normalized,
      inputLengths,
      maxResults: 10,
    });

    expect(result?.matchLen).toBe(4);
    expect(lookups).toContain('そうゆう');
  });

  it('tries 旧字体 to 新字体 variants', async () => {
    const [normalized, inputLengths] = normalizeInput('國語');
    const lookups: Array<string> = [];

    const result = await wordSearch({
      getWords: async ({ input }) => {
        lookups.push(input);
        return input === '国語'
          ? [makeWordResult({ id: 4, reading: input })]
          : [];
      },
      input: normalized,
      inputLengths,
      maxResults: 10,
    });

    expect(result?.matchLen).toBe(2);
    expect(lookups).toContain('国語');
  });
});

function makeWordResult({
  id,
  reading,
}: {
  id: number;
  reading: string;
}): DictionaryWordResult {
  return {
    id,
    k: [],
    r: [{ ent: reading, app: 0, matchRange: [0, reading.length] }],
    s: [{ g: ['test'], match: true }],
  } as unknown as DictionaryWordResult;
}
