import { describe, expect, it } from 'vitest';

import type { WordResult } from '../../background/search-result';

import { resolveNameTtsParams, resolveTtsParams } from './tts-params';

describe('resolveNameTtsParams', () => {
  it('uses the first kanji form for every displayed reading', () => {
    expect(
      resolveNameTtsParams({
        k: ['秋篠宮', '秋篠の宮'],
        r: ['あきしのみや', 'あきしののみや'],
      })
    ).toEqual([
      { kanji: '秋篠宮', reading: 'あきしのみや' },
      { kanji: '秋篠宮', reading: 'あきしののみや' },
    ]);
  });

  it('uses reading-only requests for kana-only names', () => {
    expect(resolveNameTtsParams({ r: ['ノコノコ', 'のこ'] })).toEqual([
      { reading: 'ノコノコ' },
      { reading: 'のこ' },
    ]);
  });
});

describe('resolveTtsParams', () => {
  it('returns the displayed kana verbatim with no kanji for a kana-only entry', () => {
    const entry = createEntry([kana('スゴイ')]);

    expect(resolveTtsParams(entry)).toEqual([{ reading: 'スゴイ' }]);
  });

  it('extracts pitchAccentPos from a bare number accent', () => {
    const entry = createEntry([kana('あめ', { a: 1 })]);

    expect(resolveTtsParams(entry)).toEqual([
      { reading: 'あめ', pitchAccentPos: 1 },
    ]);
  });

  it('extracts pitchAccentPos from the first entry of an array accent', () => {
    const entry = createEntry([kana('あめ', { a: [{ i: 2 }, { i: 5 }] })]);

    expect(resolveTtsParams(entry)).toEqual([
      { reading: 'あめ', pitchAccentPos: 2 },
    ]);
  });

  it('selects the first eligible non-sK kanji when app is unset', () => {
    const entry = createEntry(
      [kana('そうさく')],
      [kanji('搜索', { i: ['sK'] }), kanji('捜索'), kanji('搜尋')]
    );

    expect(resolveTtsParams(entry)).toEqual([
      { reading: 'そうさく', kanji: '捜索' },
    ]);
  });

  it("uses the reading's app bitmask to select the second kanji headword", () => {
    const entry = createEntry(
      [kana('はいる', { app: 0b10 })],
      [kanji('入る'), kanji('這入る')]
    );

    expect(resolveTtsParams(entry)).toEqual([
      { reading: 'はいる', kanji: '這入る' },
    ]);
  });

  it('evaluates the app bitmask against the unfiltered kanji array', () => {
    const entry = createEntry(
      [kana('そうさく', { app: 0b10 })],
      [kanji('搜索', { i: ['sK'] }), kanji('捜索')]
    );

    expect(resolveTtsParams(entry)).toEqual([
      { reading: 'そうさく', kanji: '捜索' },
    ]);
  });

  it('omits kanji when the app bitmask matches no headword', () => {
    const entry = createEntry(
      [kana('はいる', { app: 0 })],
      [kanji('入る'), kanji('這入る')]
    );

    expect(resolveTtsParams(entry)).toEqual([{ reading: 'はいる' }]);
  });

  it('resolves only the kana the popup displays', () => {
    const entry = createEntry(
      [
        kana('ふんいき'),
        kana('ふいんき', { match: false }),
        kana('フンイキ', { i: ['sk'] }),
      ],
      [kanji('雰囲気')]
    );

    expect(resolveTtsParams(entry)).toEqual([
      { reading: 'ふんいき', kanji: '雰囲気' },
    ]);
  });

  it('returns every displayed reading in display order and preserves pitch accent 0', () => {
    const entry = createEntry(
      [kana('はいる', { a: 1 }), kana('いる', { a: 0 })],
      [kanji('入る')]
    );

    expect(resolveTtsParams(entry)).toEqual([
      { reading: 'はいる', kanji: '入る', pitchAccentPos: 1 },
      { reading: 'いる', kanji: '入る', pitchAccentPos: 0 },
    ]);
  });
});

function kana(
  ent: string,
  overrides: Partial<WordResult['r'][number]> = {}
): WordResult['r'][number] {
  return { ent, romaji: '', match: true, ...overrides };
}

function kanji(
  ent: string,
  overrides: Partial<WordResult['k'][number]> = {}
): WordResult['k'][number] {
  return { ent, match: true, ...overrides };
}

function createEntry(r: WordResult['r'], k: WordResult['k'] = []): WordResult {
  return { id: 1, k, r, s: [], matchLen: 1 };
}
