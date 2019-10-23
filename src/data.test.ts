import { readFile } from 'fs';
import { Dictionary } from './data';

// Mock browser.extension.getURL and browser.i18n.getMessage
global.browser = {
  extension: { getURL: jest.fn(url => url) },
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
  url =>
    new Promise((resolve, reject) => {
      readFile(`${__dirname}/../${url}`, function(err, data) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ text: () => data.toString() });
      });
    })
);

// Common dictionary instance to save loading each time
const sharedDict = new Dictionary({});

describe('Dictionary', () => {
  it('loads', async () => {
    await sharedDict.loaded;
    // Nothing to check
  });

  it('finds an exact match', async () => {
    const result = await sharedDict.wordSearch({
      input: '蛋白質',
      includeRomaji: true,
    });

    expect(result!.matchLen).toBe(3); // 3 characters long
    expect(result!.data.length).toBeGreaterThanOrEqual(1);
    expect(result!.data[0][0]).toMatch(/protein/);
    expect(result!.data[0][2]).toMatch(/tanpakushitsu/);
  });

  it('finds a match partially using katakana', async () => {
    const result = await sharedDict.wordSearch({ input: 'タンパク質' });
    expect(result!.matchLen).toBe(5);
  });

  it('finds a match partially using half-width katakana', async () => {
    const result = await sharedDict.wordSearch({ input: 'ﾀﾝﾊﾟｸ質' });
    expect(result!.matchLen).toBe(6);
  });

  it('finds a match partially using hiragana', async () => {
    const result = await sharedDict.wordSearch({ input: 'たんぱく質' });
    expect(result!.matchLen).toBe(5);
  });

  it('finds a match fully using katakana', async () => {
    const result = await sharedDict.wordSearch({ input: 'タンパクシツ' });
    expect(result!.matchLen).toBe(6);
  });

  it('finds a match fully using half-width katakana', async () => {
    const result = await sharedDict.wordSearch({ input: 'ﾀﾝﾊﾟｸｼﾂ' });
    expect(result!.matchLen).toBe(7);
  });

  it('finds a match fully using hiragana', async () => {
    const result = await sharedDict.wordSearch({ input: 'たんぱくしつ' });
    expect(result!.matchLen).toBe(6);
  });

  it('finds a partial match', async () => {
    const result = await sharedDict.wordSearch({ input: '蛋白質は' });
    expect(result!.matchLen).toBe(3);
  });

  it('chooses the right de-inflection for potential and passives', async () => {
    // Ichidan/ru-verb -- られる ending could be potential or passive
    let result = await sharedDict.wordSearch({ input: '止められます' });
    let match = result!.data.find(([item]) => item.indexOf('[とめる]') !== -1);
    expect(match![1]).toEqual('< potential or passive < polite');

    // Godan/u-verb -- られる ending is passive
    result = await sharedDict.wordSearch({ input: '止まられます' });
    match = result!.data.find(([item]) => item.indexOf('[とまる]') !== -1);
    expect(match![1]).toEqual('< passive < polite');

    // Godan/u-verb -- れる ending is potential
    result = await sharedDict.wordSearch({ input: '止まれます' });
    match = result!.data.find(([item]) => item.indexOf('[とまる]') !== -1);
    expect(match![1]).toEqual('< potential < polite');
  });

  it('chooses the right de-inflection for causative and passives', async () => {
    // su-verb -- される ending is passive
    let result = await sharedDict.wordSearch({ input: '起こされる' });
    let match = result!.data.find(([item]) => item.indexOf('[おこす]') !== -1);
    expect(match![1]).toEqual('< passive');

    // su-verb -- させる ending is causative
    result = await sharedDict.wordSearch({ input: '起こさせる' });
    match = result!.data.find(([item]) => item.indexOf('[おこす]') !== -1);
    expect(match![1]).toEqual('< causative');
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
      const result = await sharedDict.wordSearch({ input: inflected });
      const match = result!.data.find(
        ([item]) => item.indexOf(`[${plain}]`) !== -1
      );
      expect(match![1]).toEqual('< causative passive');
    }

    // Check for the exceptions:
    //
    // (1) su-verbs: causative passive is させられる only, される is passive
    let result = await sharedDict.wordSearch({ input: '起こさせられる' });
    let match = result!.data.find(([item]) => item.indexOf('[おこす]') !== -1);
    expect(match![1]).toEqual('< causative passive');

    result = await sharedDict.wordSearch({ input: '起こされる' });
    match = result!.data.find(([item]) => item.indexOf('[おこす]') !== -1);
    expect(match![1]).toEqual('< passive');

    // (2) ichidan verbs
    result = await sharedDict.wordSearch({ input: '食べさせられる' });
    match = result!.data.find(([item]) => item.indexOf('[たべる]') !== -1);
    expect(match![1]).toEqual('< causative passive');

    // (4) kuru verbs
    result = await sharedDict.wordSearch({ input: '来させられる' });
    match = result!.data.find(([item]) => item.indexOf('[くる]') !== -1);
    expect(match![1]).toEqual('< causative passive');

    result = await sharedDict.wordSearch({ input: 'こさせられる' });
    match = result!.data.find(([item]) => item.indexOf('[くる]') !== -1);
    expect(match![1]).toEqual('< causative passive');

    // Check combinations
    result = await sharedDict.wordSearch({ input: '買わされませんでした' });
    match = result!.data.find(
      ([item, reason]) => item.indexOf('[かう]') !== -1
    );
    expect(match![1]).toEqual('< causative passive < polite past negative');
  });

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
      const result = await sharedDict.wordSearch({ input: inflected });
      const match = result!.data.find(
        ([item]) => item.indexOf(`${plain}`) !== -1
      );
      expect(match![1]).toEqual(expect.stringMatching(/^< -te oku/));
    }
  });

  it('looks up irregular Yodan verbs', async () => {
    const result = await sharedDict.wordSearch({ input: 'のたもうた' });
    expect(result!.data[0][0]).toEqual(expect.stringContaining('[のたまう]'));
  });

  it('orders words by priority', async () => {
    const result = await sharedDict.wordSearch({ input: '認める' });
    expect(result!.data[0][0]).toEqual(expect.stringContaining('[みとめる]'));
    expect(result!.data[1][0]).toEqual(expect.stringContaining('[したためる]'));
  });

  it('orders words by priority before truncating the list', async () => {
    const result = await sharedDict.wordSearch({
      input: 'せんしゅ',
      doNames: false,
      max: 5,
    });
    // There should be at least the following common entries that match:
    //
    // - 先取
    // - 船主
    // - 選手
    //
    // If we trim the list before sorting, however, we'll fail to include 選手.
    expect(
      result!.data
        .map(row => row[0])
        .some(entry => entry.indexOf('選手') !== -1)
    ).toBeTruthy();

    // Check that we still respect the max-length limit though
    expect(result!.data).toHaveLength(5);
  });

  it('translates sentences', async () => {
    const result = await sharedDict.translate({ text: '期間限定発売 秋の膳' });
    expect(result!.textLen).toBe(10); // 10 characters including the space
    expect(result!.data.length).toBe(5);
    expect(result!.more).toBe(false);
    const kana = result!.data
      .map(word => {
        const matches = word[0].match(/^(.+?)\s+(?:\[(.*?)\])?/);
        return matches![2] || matches![1];
      })
      .join('');
    expect(kana).toBe('きかんげんていはつばいあきのぜん');
  });

  it('looks up names', async () => {
    const result = await sharedDict.wordSearch({
      input: 'あか組４',
      doNames: true,
    });
    expect(result!.data[0][0]).toEqual(
      'あか組４ [あかぐみフォー] /(h) Akagumi Four/'
    );
  });
});
