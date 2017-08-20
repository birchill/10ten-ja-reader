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

describe('Dictionary', () => {
  it('loads', async () => {
    const dict = new Dictionary(true /* doNames */);

    await dict.loaded;
    // Nothing to check
  });
});
