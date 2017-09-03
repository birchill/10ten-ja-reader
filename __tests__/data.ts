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

  // TODO: Test names dictionary handling
  //       e.g. create a new Dictionary specifying 'false' for loadNames but then
  //       do a work lookup where 'doNames' is true.
  //       e.g.(2) do a work look up where 'doNames' is true and check we
  //       *don't* match names
  // TODO: Test kanji lookup
});
