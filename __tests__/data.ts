const fs = require('fs');

import Dictionary from '../src/data';

// Mock browser.extension.getURL
global.browser = {
  extension: { getURL: jest.fn(url => url) },
  i18n: {
    getMessage: id => {
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
      fs.readFile(`${__dirname}/../${url}`, function(err, data) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ text: () => data.toString() });
      });
    })
);

// Common dictionary instance to save loading each time
const sharedDict = new Dictionary({ loadNames: true });

describe('Dictionary', () => {
  it('loads', async () => {
    await sharedDict.loaded;
    // Nothing to check
  });

  it('finds an exact match', async () => {
    const result = await sharedDict.wordSearch('蛋白質');

    expect(result.matchLen).toBe(3); // 3 characters long
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0][0]).toMatch(/protein/);
  });

  it('finds a match partially using katakana', async () => {
    const result = await sharedDict.wordSearch('タンパク質');
    expect(result.matchLen).toBe(5);
  });

  it('finds a match partially using half-width katakana', async () => {
    const result = await sharedDict.wordSearch('ﾀﾝﾊﾟｸ質');
    expect(result.matchLen).toBe(6);
  });

  it('finds a match partially using hiragana', async () => {
    const result = await sharedDict.wordSearch('たんぱく質');
    expect(result.matchLen).toBe(5);
  });

  it('finds a match fully using katakana', async () => {
    const result = await sharedDict.wordSearch('タンパクシツ');
    expect(result.matchLen).toBe(6);
  });

  it('finds a match fully using half-width katakana', async () => {
    const result = await sharedDict.wordSearch('ﾀﾝﾊﾟｸｼﾂ');
    expect(result.matchLen).toBe(7);
  });

  it('finds a match fully using hiragana', async () => {
    const result = await sharedDict.wordSearch('たんぱくしつ');
    expect(result.matchLen).toBe(6);
  });

  it('finds a partial match', async () => {
    const result = await sharedDict.wordSearch('蛋白質は');
    expect(result.matchLen).toBe(3);
  });

  it('reports character lengths for half-width katakana normalization', () => {
    const result = sharedDict.normalizeInput('ｶﾞｰﾃﾞﾝ');
    expect(result).toEqual(['がーでん', [0, 2, 3, 5, 6]]);
  });

  it('chooses the right de-inflection for potential and passives', async () => {
    // Ichidan/ru-verb -- られる ending could be potential or passive
    let result = await sharedDict.wordSearch('止められます');
    let match = result.data.find(
      ([item, reason]) => item.indexOf('[とめる]') !== -1
    );
    expect(match[1]).toEqual('< potential or passive < polite');

    // Godan/u-verb -- られる ending is passive
    result = await sharedDict.wordSearch('止まられます');
    match = result.data.find(
      ([item, reason]) => item.indexOf('[とまる]') !== -1
    );
    expect(match[1]).toEqual('< passive < polite');

    // Godan/u-verb -- れる ending is potential
    result = await sharedDict.wordSearch('止まれます');
    match = result.data.find(
      ([item, reason]) => item.indexOf('[とまる]') !== -1
    );
    expect(match[1]).toEqual('< potential < polite');
  });

  it('chooses the right de-inflection for causative and passives', async () => {
    // su-verb -- される ending is passive
    let result = await sharedDict.wordSearch('起こされる');
    let match = result.data.find(
      ([item, reason]) => item.indexOf('[おこす]') !== -1
    );
    expect(match[1]).toEqual('< passive');

    // su-verb -- させる ending is causative
    result = await sharedDict.wordSearch('起こさせる');
    match = result.data.find(
      ([item, reason]) => item.indexOf('[おこす]') !== -1
    );
    expect(match[1]).toEqual('< causative');
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
      const result = await sharedDict.wordSearch(inflected);
      const match = result.data.find(
        ([item, reason]) => item.indexOf(`[${plain}]`) !== -1
      );
      expect(match[1]).toEqual('< causative passive');
    }

    // Check for the exceptions:
    //
    // (1) su-verbs: causative passive is させられる only, される is passive
    let result = await sharedDict.wordSearch('起こさせられる');
    let match = result.data.find(
      ([item, reason]) => item.indexOf('[おこす]') !== -1
    );
    expect(match[1]).toEqual('< causative passive');

    result = await sharedDict.wordSearch('起こされる');
    match = result.data.find(
      ([item, reason]) => item.indexOf('[おこす]') !== -1
    );
    expect(match[1]).toEqual('< passive');

    // (2) ichidan verbs
    result = await sharedDict.wordSearch('食べさせられる');
    match = result.data.find(
      ([item, reason]) => item.indexOf('[たべる]') !== -1
    );
    expect(match[1]).toEqual('< causative passive');

    // (4) kuru verbs
    result = await sharedDict.wordSearch('来させられる');
    match = result.data.find(([item, reason]) => item.indexOf('[くる]') !== -1);
    expect(match[1]).toEqual('< causative passive');

    result = await sharedDict.wordSearch('こさせられる');
    match = result.data.find(([item, reason]) => item.indexOf('[くる]') !== -1);
    expect(match[1]).toEqual('< causative passive');

    // Check combinations
    result = await sharedDict.wordSearch('買わされませんでした');
    match = result.data.find(([item, reason]) => item.indexOf('[かう]') !== -1);
    expect(match[1]).toEqual('< causative passive < polite past negative');
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
      const result = await sharedDict.wordSearch(inflected);
      const match = result.data.find(
        ([item, reason]) => item.indexOf(`${plain}`) !== -1
      );
      expect(match[1]).toEqual(expect.stringMatching(/^< -te oku/));
    }
  });

  it('orders words by priority', async () => {
    const result = await sharedDict.wordSearch('認める');
    expect(result.data[0][0]).toEqual(expect.stringContaining('[みとめる]'));
    expect(result.data[1][0]).toEqual(expect.stringContaining('[したためる]'));
  });

  it('translates sentences', async () => {
    const result = await sharedDict.translate('期間限定発売 秋の膳');
    expect(result.textLen).toBe(10); // 10 characters including the space
    expect(result.data.length).toBe(5);
    expect(result.more).toBe(false);
    const kana = result.data
      .map(word => {
        const matches = word[0].match(/^(.+?)\s+(?:\[(.*?)\])?/);
        return matches[2] || matches[1];
      })
      .join('');
    expect(kana).toBe('きかんげんていはつばいあきのぜん');
  });

  it('looks up kanji', () => {
    const result = sharedDict.kanjiSearch('峠');
    expect(result).toEqual({
      kanji: '峠',
      misc: {
        B: '46',
        DK: '265',
        E: '1663',
        F: '1941',
        G: '8',
        H: '358',
        I: '3o6.3',
        IN: '1351',
        KK: '4',
        L: '773',
        N: '1416',
        P: '1-3-6',
        S: '9',
        U: '5CE0',
        V: '1464',
      },
      miscDisplay: [
        { abbrev: 'H', name: 'Halpern' },
        { abbrev: 'L', name: 'Heisig' },
        { abbrev: 'E', name: 'Henshall' },
        { abbrev: 'KK', name: 'Kanji Kentei' },
        { abbrev: 'DK', name: 'Kanji Learners Dictionary' },
        { abbrev: 'N', name: 'Nelson' },
        { abbrev: 'V', name: 'New Nelson' },
        { abbrev: 'Y', name: 'PinYin' },
        { abbrev: 'P', name: 'Skip Pattern' },
        { abbrev: 'IN', name: 'Tuttle Kanji & Kana' },
        { abbrev: 'I', name: 'Tuttle Kanji Dictionary' },
        { abbrev: 'U', name: 'Unicode' },
      ],
      onkun: ['とうげ'],
      nanori: [],
      bushumei: [],
      radical: '山',
      eigo: 'mountain peak, mountain pass, climax, crest, (kokuji)',
    });
  });

  it('looks up kanji with nanori and bushumei', () => {
    const options = {
      includedReferences: new Set([
        'H',
        'L',
        'E',
        'DK',
        'N',
        'V',
        'Y',
        'P',
        'IN',
        'I',
        'U',
      ]),
      includeKanjiComponents: false,
    };
    const result = sharedDict.kanjiSearch('士', options);
    expect(result).toEqual({
      kanji: '士',
      misc: {
        B: '33',
        DK: '2129',
        E: '494',
        F: '526',
        G: '4',
        H: '3405',
        I: '3p0.1',
        IN: '572',
        KK: '7',
        L: '319',
        N: '1160',
        P: '4-3-2',
        S: '3',
        U: '58EB',
        V: '1117',
        Y: 'shi4',
      },
      miscDisplay: [
        { abbrev: 'H', name: 'Halpern' },
        { abbrev: 'L', name: 'Heisig' },
        { abbrev: 'E', name: 'Henshall' },
        { abbrev: 'DK', name: 'Kanji Learners Dictionary' },
        { abbrev: 'N', name: 'Nelson' },
        { abbrev: 'V', name: 'New Nelson' },
        { abbrev: 'Y', name: 'PinYin' },
        { abbrev: 'P', name: 'Skip Pattern' },
        { abbrev: 'IN', name: 'Tuttle Kanji & Kana' },
        { abbrev: 'I', name: 'Tuttle Kanji Dictionary' },
        { abbrev: 'U', name: 'Unicode' },
      ],
      onkun: ['シ', 'さむらい'],
      nanori: ['お', 'ま'],
      bushumei: ['さむらい'],
      radical: '士',
      eigo: 'gentleman, scholar, samurai, samurai radical (no. 33)',
    });
  });

  it('looks up kanji with multiple readings', () => {
    const result = sharedDict.kanjiSearch('与');
    expect(result).toEqual({
      kanji: '与',
      misc: {
        B: '1',
        DK: '2138',
        E: '1873',
        F: '308',
        G: '8',
        H: '3421',
        I: '0a3.23',
        IN: '539',
        KK: '4',
        L: '1246',
        N: '6',
        P: '4-3-4',
        S: '3',
        U: '4E0E',
        V: '6',
        Y: 'yu3  yu4',
      },
      miscDisplay: [
        { abbrev: 'H', name: 'Halpern' },
        { abbrev: 'L', name: 'Heisig' },
        { abbrev: 'E', name: 'Henshall' },
        { abbrev: 'KK', name: 'Kanji Kentei' },
        { abbrev: 'DK', name: 'Kanji Learners Dictionary' },
        { abbrev: 'N', name: 'Nelson' },
        { abbrev: 'V', name: 'New Nelson' },
        { abbrev: 'Y', name: 'PinYin' },
        { abbrev: 'P', name: 'Skip Pattern' },
        { abbrev: 'IN', name: 'Tuttle Kanji & Kana' },
        { abbrev: 'I', name: 'Tuttle Kanji Dictionary' },
        { abbrev: 'U', name: 'Unicode' },
      ],
      onkun: ['ヨ', 'あた.える', 'あずか.る', 'くみ.する', 'ともに'],
      nanori: ['とも', 'ゆ'],
      bushumei: [],
      radical: '一',
      eigo:
        'bestow, participate in, give, award, impart, provide, cause, gift, godsend',
    });
  });

  it('looks up kanji with kanji components', () => {
    const options = {
      includedReferences: new Set(['H', 'U']),
      includeKanjiComponents: true,
    };
    const result = sharedDict.kanjiSearch('鯖', options);
    expect(result).toEqual({
      kanji: '鯖',
      misc: {
        B: '195',
        I: '11a8.6',
        KK: '1.5',
        L: '2820',
        N: '5301',
        P: '1-11-8',
        U: '9BD6',
        S: '19',
        V: '6883',
        Y: 'qing1  zheng1',
      },
      miscDisplay: [
        { abbrev: 'H', name: 'Halpern' },
        { abbrev: 'U', name: 'Unicode' },
      ],
      components: [
        { radical: '魚', yomi: 'うお', english: 'fish' },
        { radical: '二', yomi: 'に', english: 'two' },
        { radical: '亠', yomi: 'なべぶた', english: 'lid' },
        { radical: '土', yomi: 'つち', english: 'earth' },
        { radical: '月', yomi: 'つき', english: 'moon' },
        { radical: '田', yomi: 'た', english: 'rice field' },
        { radical: '青', yomi: 'あお', english: 'blue' },
        { radical: '灬', yomi: 'れっか', english: 'fire' },
      ],
      onkun: ['セイ', 'ショウ', 'さば'],
      nanori: [],
      bushumei: [],
      radical: '魚',
      eigo: 'mackerel',
    });
  });

  it('looks up names', async () => {
    const result = await sharedDict.wordSearch('あか組４', true);
    expect(result.data[0][0]).toEqual(
      'あか組４ [あかぐみフォー] /(h) Akagumi Four/'
    );
  });
});
