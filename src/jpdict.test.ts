import { readFile } from 'fs';

class Worker {
  constructor(_stringUrl: string) {}
  postMessage(_msg: string) {}
}

(window as any).Worker = Worker;

import { searchWords, translate } from './jpdict';
import { WordResult, WordSearchResult } from './search-result';

// Mock browser.extension.getURL and browser.i18n.getMessage
global.browser = {
  extension: { getURL: jest.fn((url) => url) },
  i18n: {
    getMessage: (id: string) => {
      switch (id) {
        case 'deinflect_polite_past_negative':
          return 'polite past negative';
        case 'deinflect_polite_negative':
          return 'polite negative';
        case 'deinflect_polite_volitional':
          return 'polite volitional';
        case 'deinflect_chau':
          return '-chau';
        case 'deinflect_sugiru':
          return '-sugiru';
        case 'deinflect_nasai':
          return '-nasai';
        case 'deinflect_polite_past':
          return 'polite past';
        case 'deinflect_tara':
          return '-tara';
        case 'deinflect_tari':
          return '-tari';
        case 'deinflect_causative':
          return 'causative';
        case 'deinflect_potential_or_passive':
          return 'potential or passive';
        case 'deinflect_toku':
          return '-te oku';
        case 'deinflect_sou':
          return '-sou';
        case 'deinflect_tai':
          return '-tai';
        case 'deinflect_polite':
          return 'polite';
        case 'deinflect_past':
          return 'past';
        case 'deinflect_negative':
          return 'negative';
        case 'deinflect_passive':
          return 'passive';
        case 'deinflect_ba':
          return '-ba';
        case 'deinflect_volitional':
          return 'volitional';
        case 'deinflect_potential':
          return 'potential';
        case 'deinflect_causative_passive':
          return 'causative passive';
        case 'deinflect_te':
          return '-te';
        case 'deinflect_zu':
          return '-zu';
        case 'deinflect_imperative':
          return 'imperative';
        case 'deinflect_masu_stem':
          return 'masu stem';
        case 'deinflect_adv':
          return 'adv';
        case 'deinflect_noun':
          return 'noun';
        case 'deinflect_imperative_negative':
          return 'imperative negative';
        default:
          return 'Unrecognized string ID';
      }
    },
  },
};

// Mock fetch
window.fetch = jest.fn().mockImplementation(
  (url) =>
    new Promise((resolve, reject) => {
      readFile(`${__dirname}/../${url}`, function (err, data) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ text: () => data.toString() });
      });
    })
);

describe('searchWords', () => {
  it('finds an exact match', async () => {
    const result = await searchWords({
      input: '蛋白質',
      includeRomaji: true,
    });

    expect(result!.matchLen).toBe(3); // 3 characters long
    expect(result!.data.length).toBeGreaterThanOrEqual(1);
    expect(result!.data[0].s).toContainEqual({
      g: [{ str: 'protein' }],
      match: true,
      pos: ['n'],
    });
    expect(result!.data[0].romaji).toContain('tanpakushitsu');
  });

  it('finds a match partially using katakana', async () => {
    const result = await searchWords({ input: 'タンパク質' });
    expect(result!.matchLen).toBe(5);
  });

  it('finds a match partially using half-width katakana', async () => {
    const result = await searchWords({ input: 'ﾀﾝﾊﾟｸ質' });
    expect(result!.matchLen).toBe(6);
  });

  it('finds a match partially using hiragana', async () => {
    const result = await searchWords({ input: 'たんぱく質' });
    expect(result!.matchLen).toBe(5);
  });

  it('finds a match fully using katakana', async () => {
    const result = await searchWords({ input: 'タンパクシツ' });
    expect(result!.matchLen).toBe(6);
  });

  it('finds a match fully using half-width katakana', async () => {
    const result = await searchWords({ input: 'ﾀﾝﾊﾟｸｼﾂ' });
    expect(result!.matchLen).toBe(7);
  });

  it('finds a match fully using hiragana', async () => {
    const result = await searchWords({ input: 'たんぱくしつ' });
    expect(result!.matchLen).toBe(6);
  });

  it('finds a partial match', async () => {
    const result = await searchWords({ input: '蛋白質は' });
    expect(result!.matchLen).toBe(3);
  });

  it('finds a match with ー', async () => {
    let result = await searchWords({ input: '頑張ろー' });
    expect(result!.matchLen).toBe(4);
    result = await searchWords({ input: 'そーゆー' });
    expect(result!.matchLen).toBe(4);
    result = await searchWords({ input: '食べよー' });
    expect(result!.matchLen).toBe(4);
    result = await searchWords({ input: 'おはよー' });
    expect(result!.matchLen).toBe(4);
    result = await searchWords({ input: '行こー' });
    expect(result!.matchLen).toBe(3);
    result = await searchWords({ input: 'オーサカ' });
    expect(result!.matchLen).toBe(4);
  });

  const hasEntryWithKanji = (
    result: WordSearchResult,
    kanji: string
  ): boolean => {
    return result.data.some(
      (entry) => entry.k && entry.k.some((k) => k.ent === kanji)
    );
  };

  it('does not split yo-on', async () => {
    const result = await searchWords({ input: 'ローマじゃない' });
    // This should NOT match ローマ字
    expect(result!.matchLen).toBe(3);
    expect(hasEntryWithKanji(result!, 'ローマ字')).toBeFalsy();
  });

  const getMatchWithKana = (
    result: WordSearchResult,
    kana: string
  ): WordResult | undefined => {
    return result.data.find((entry) => entry.r.some((r) => r.ent === kana));
  };

  it('chooses the right de-inflection for potential and passives', async () => {
    // Ichidan/ru-verb -- られる ending could be potential or passive
    let result = await searchWords({ input: '止められます' });
    let match = getMatchWithKana(result!, 'とめる');
    expect(match!.reason).toEqual('< potential or passive < polite');

    // Godan/u-verb -- られる ending is passive
    result = await searchWords({ input: '止まられます' });
    match = getMatchWithKana(result!, 'とまる');
    expect(match!.reason).toEqual('< passive < polite');

    // Godan/u-verb -- れる ending is potential
    result = await searchWords({ input: '止まれます' });
    match = getMatchWithKana(result!, 'とまる');
    expect(match!.reason).toEqual('< potential < polite');
  });

  it('chooses the right de-inflection for causative and passives', async () => {
    // su-verb -- される ending is passive
    let result = await searchWords({ input: '起こされる' });
    let match = getMatchWithKana(result!, 'おこす');
    expect(match!.reason).toEqual('< passive');

    // su-verb -- させる ending is causative
    result = await searchWords({ input: '起こさせる' });
    match = getMatchWithKana(result!, 'おこす');
    expect(match!.reason).toEqual('< causative');
  });

  it('chooses the right de-inflection for causative passive', async () => {
    const pairs = [
      ['待たせられる', 'まつ'],
      ['待たされる', 'まつ'],
      ['買わせられる', 'かう'],
      ['買わされる', 'かう'],
      ['焼かせられる', 'やく'],
      ['焼かされる', 'やく'],
      ['泳がせられる', 'およぐ'],
      ['泳がされる', 'およぐ'],
      ['死なせられる', 'しぬ'],
      ['死なされる', 'しぬ'],
      ['遊ばせられる', 'あそぶ'],
      ['遊ばされる', 'あそぶ'],
      ['読ませられる', 'よむ'],
      ['読まされる', 'よむ'],
      ['走らせられる', 'はしる'],
      ['走らされる', 'はしる'],
    ];

    for (const [inflected, plain] of pairs) {
      const result = await searchWords({ input: inflected });
      const match = getMatchWithKana(result!, plain);
      expect(match!.reason).toEqual('< causative passive');
    }

    // Check for the exceptions:
    //
    // (1) su-verbs: causative passive is させられる only, される is passive
    let result = await searchWords({ input: '起こさせられる' });
    let match = getMatchWithKana(result!, 'おこす');
    expect(match!.reason).toEqual('< causative passive');

    result = await searchWords({ input: '起こされる' });
    match = getMatchWithKana(result!, 'おこす');
    expect(match!.reason).toEqual('< passive');

    // (2) ichidan verbs
    result = await searchWords({ input: '食べさせられる' });
    match = getMatchWithKana(result!, 'たべる');
    expect(match!.reason).toEqual('< causative passive');

    // (4) kuru verbs
    result = await searchWords({ input: '来させられる' });
    match = getMatchWithKana(result!, 'くる');
    expect(match!.reason).toEqual('< causative passive');

    result = await searchWords({ input: 'こさせられる' });
    match = getMatchWithKana(result!, 'くる');
    expect(match!.reason).toEqual('< causative passive');

    // Check combinations
    result = await searchWords({ input: '買わされませんでした' });
    match = getMatchWithKana(result!, 'かう');
    expect(match!.reason).toEqual('< causative passive < polite past negative');
  });

  const getMatchWithKanjiOrKana = (
    result: WordSearchResult,
    toMatch: string
  ): WordResult | undefined => {
    return result.data.find(
      (entry) =>
        (entry.k && entry.k.some((k) => k.ent === toMatch)) ||
        entry.r.some((r) => r.ent === toMatch)
    );
  };

  it('chooses the right de-inflection for -te oku', async () => {
    const pairs = [
      ['焼いとく', '焼く'],
      ['急いどく', '急ぐ'],
      ['きとく', '来る'],
      ['来とく', '来る'],
      ['しとく', 'する'],
      ['話しとく', '話す'],
      ['買っとく', '買う'],
      ['待っとく', '待つ'],
      ['帰っとく', '帰る'],
      ['死んどく', '死ぬ'],
      ['遊んどく', '遊ぶ'],
      ['読んどく', '読む'],
      ['読んどきます', '読む'],
    ];

    for (const [inflected, plain] of pairs) {
      const result = await searchWords({ input: inflected });
      const match = getMatchWithKanjiOrKana(result!, plain);
      expect(match!.reason).toEqual(expect.stringMatching(/^< -te oku/));
    }
  });

  it('looks up irregular Yodan verbs', async () => {
    const result = await searchWords({ input: 'のたもうた' });
    expect(getMatchWithKana(result!, 'のたまう')).toBeDefined();
  });

  const getKana = (entry: WordResult): Array<string> =>
    entry.r.map((r) => r.ent);

  it('orders words by priority', async () => {
    const result = await searchWords({ input: '認める' });
    expect(getKana(result!.data[0])).toContain('みとめる');
    expect(getKana(result!.data[1])).toContain('したためる');
  });

  const getKanji = (entry: WordResult): Array<string> =>
    entry.k ? entry.k.map((k) => k.ent) : [];

  it('orders words by priority before truncating the list', async () => {
    const result = await searchWords({
      input: 'せんしゅ',
      max: 5,
    });
    // There should be at least the following common entries that match:
    //
    // - 先取
    // - 船主
    // - 選手
    //
    // If we trim the list before sorting, however, we'll fail to include 選手.
    const allKanji = result!.data
      .map(getKanji)
      .reduce((acc, val) => acc.concat(val), []);
    expect(allKanji).toContain('選手');

    // Check that we still respect the max-length limit though
    expect(result!.data).toHaveLength(5);
  });
});

describe('translate', () => {
  it('translates sentences', async () => {
    const result = await translate({ text: '期間限定発売 秋の膳' });
    expect(result!.textLen).toBe(10); // 10 characters including the space
    expect(result!.data.length).toBe(5);
    expect(result!.more).toBe(false);
    const kana = result!.data.map((match) => match.r[0].ent).join('');
    expect(kana).toBe('きかんげんていはつばいあきのぜん');
  });
});
