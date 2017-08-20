const fs = require('fs');

const Dictionary = require('../data');

// Mock browser.extension.getURL
global.browser = { extension: { getURL: jest.fn(url => url) } };

// Mock fetch
window.fetch = jest.fn().mockImplementation(url =>
  new Promise((resolve, reject) => {
    fs.readFile(`${__dirname}/../${url}`, function (err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ text: () => data.toString() });
    });
  })
);

// Common dictionary instance to save loading each time
const sharedDict = new Dictionary(true /* doNames */);

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

  // TODO: Test that component also matches
  // TODO: Find a match with trailing characters
  // TODO: Test input normalization
  // TODO: Test de-inflection
  // TODO: Test names dictionary handling
  //       e.g. create a new Dictionary specifying 'false' for doNames but then
  //       do a work lookup where 'doNames' is true.
  //       e.g.(2) do a work look up where 'doNames' is true and check we
  //       *don't* match names
  // TODO: Test kanji lookup
});
