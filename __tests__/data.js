const rcxDict = require('../data');

// Mock browser.extension.getURL
global.browser = { extension: { getURL: jest.fn(url => url) } };

describe('rcxDict', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  it('loads', () => {
    fetch.mockResponse('× [ばつ] /(n,uk) x-mark (used to indicate an incorrect answer in a test, etc.)/impossibility/futility/uselessness/');

    const dict = new rcxDict(true /* doNames */);

    return dict.loaded.then(() => {
      // Nothing to check
    });
  });
});
