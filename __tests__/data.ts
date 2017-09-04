// @format
const fs = require('fs');

const Dictionary = require('../data');

// Mock browser.extension.getURL
global.browser = { extension: { getURL: jest.fn(url => url) } };

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

  it('performs de-inflection', () => {
    const result = sharedDict.deinflect('走ります');
    const match = result.find(candidate => candidate.word === '走る');
    expect(match).toEqual({ reason: 'polite', type: 2, word: '走る' });
  });

  it('performs de-inflection recursively', () => {
    const result = sharedDict.deinflect('踊りたくなかった');
    const match = result.find(candidate => candidate.word === '踊る');
    expect(match).toEqual({
      reason: '-tai &lt; negative &lt; past',
      type: 2,
      word: '踊る',
    });
  });

  it('translates sentences', async () => {
    const result = await sharedDict.translate('期間限定発売 秋の膳');
    expect(result.textLen).toBe(10); // 10 characters including the space
    expect(result.data.length).toBe(6);
    expect(result.more).toBe(false);
    const kana = result.data
      .map(word => word[0].match(/(?:\[(.*?)\])/)[1])
      .join('');
    expect(kana).toBe('きかんげんていはつばいあきのぜん');
  });

  it('looks up kanji', () => {
    const result = sharedDict.kanjiSearch('峠');
    expect(result).toEqual({
      kanji: '峠',
      misc: {
        B: { ref: undefined, value: '46' },
        DK: { ref: 'Kanji Learners Dictionary', value: '265' },
        E: { ref: 'Henshall', value: '1663' },
        F: { ref: undefined, value: '1941' },
        G: { ref: undefined, value: '8' },
        H: { ref: 'Halpern', value: '358' },
        I: { ref: 'Tuttle Kanji Dictionary', value: '3o6.3' },
        IN: { ref: 'Tuttle Kanji &amp; Kana', value: '1351' },
        L: { ref: 'Heisig', value: '773' },
        N: { ref: 'Nelson', value: '1416' },
        P: { ref: 'Skip Pattern', value: '1-3-6' },
        S: { ref: undefined, value: '9' },
        U: { ref: 'Unicode', value: '5CE0' },
        V: { ref: 'New Nelson', value: '1464' },
      },
      onkun: 'とうげ',
      nanori: '',
      bushumei: '',
      radical: '山',
      eigo: 'mountain peak, mountain pass, climax, crest, (kokuji)',
    });
  });

  it('looks up kanji with nanori and bushumei', () => {
    const result = sharedDict.kanjiSearch('士');
    expect(result).toEqual({
      kanji: '士',
      misc: {
        B: { ref: undefined, value: '33' },
        DK: { ref: 'Kanji Learners Dictionary', value: '2129' },
        E: { ref: 'Henshall', value: '494' },
        F: { ref: undefined, value: '526' },
        G: { ref: undefined, value: '4' },
        H: { ref: 'Halpern', value: '3405' },
        I: { ref: 'Tuttle Kanji Dictionary', value: '3p0.1' },
        IN: { ref: 'Tuttle Kanji &amp; Kana', value: '572' },
        L: { ref: 'Heisig', value: '319' },
        N: { ref: 'Nelson', value: '1160' },
        P: { ref: 'Skip Pattern', value: '4-3-2' },
        S: { ref: undefined, value: '3' },
        U: { ref: 'Unicode', value: '58EB' },
        V: { ref: 'New Nelson', value: '1117' },
        Y: { ref: 'PinYin', value: 'shi4' },
      },
      onkun: 'シ',
      nanori: 'お、 ま',
      bushumei: 'さむらい',
      radical: '士',
      eigo: 'gentleman, samurai, samurai radical (no. 33)',
    });
  });

  // TODO: Test names dictionary handling
  //       e.g. create a new Dictionary specifying 'false' for loadNames but then
  //       do a work lookup where 'doNames' is true.
  //       e.g.(2) do a work look up where 'doNames' is true and check we
  //       *don't* match names
});
