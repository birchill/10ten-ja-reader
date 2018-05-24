const fs = require('fs');

import Dictionary from '../src/data';

// Mock browser.extension.getURL
global.browser = { extension: { getURL: jest.fn(url => url) } };

// Mock fetch
window.fetch = jest.fn().mockImplementation(
  url =>
    new Promise((resolve, reject) => {
      fs.readFile(`${__dirname}/../extension/${url}`, function(err, data) {
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

  it('performs de-inflection', () => {
    const result = sharedDict.deinflect('走ります');
    const match = result.find(candidate => candidate.word === '走る');
    expect(match).toEqual({ reason: 'polite', type: 2, word: '走る' });
  });

  it('performs de-inflection recursively', () => {
    const result = sharedDict.deinflect('踊りたくなかった');
    const match = result.find(candidate => candidate.word === '踊る');
    expect(match).toEqual({
      reason: '-tai < negative < past',
      type: 2,
      word: '踊る',
    });
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
      onkun: ['シ'],
      nanori: ['お', 'ま'],
      bushumei: ['さむらい'],
      radical: '士',
      eigo: 'gentleman, samurai, samurai radical (no. 33)',
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

  // TODO: Test names dictionary handling
  //       e.g. create a new Dictionary specifying 'false' for loadNames but then
  //       do a word lookup where 'doNames' is true.
  //       e.g.(2) do a word look up where 'doNames' is true and check we
  //       *don't* match names
});
