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

  // TODO: Test that variant spelling with katakana matches
  // TODO: Test that variant spelling with hiragana matches
  // TODO: Test that variant spelling with all hiragana matches
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
