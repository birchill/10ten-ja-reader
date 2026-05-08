import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { scanText as scanTextFn } from './scan-text';

declare global {
  var browser: any;
  var chrome: any;
}

describe('scanText', () => {
  let previousChromeObject: any;
  let previousBrowserObject: any;

  let scanText: typeof scanTextFn;

  beforeAll(async () => {
    // Make sure the webextension polyfill believes we are in an extension
    // context.
    previousChromeObject = globalThis.chrome;
    globalThis.chrome = { runtime: { id: 'test' } };

    // Polyfill any browser APIs we use.
    previousBrowserObject = globalThis.browser;
    globalThis.browser = {
      // <-- Put polyfills for any browser APIs we use in here
    };

    ({ scanText } = await import('./scan-text'));
  });

  afterAll(() => {
    globalThis.browser = previousBrowserObject;
    globalThis.chrome = previousChromeObject;
  });

  describe('synthetic text nodes', () => {
    it('scans detached Google Docs text with bullet prelude context', () => {
      const scanNode = document.createTextNode('テスト');
      const container = document.createElement('span');
      container.append(document.createTextNode('●'), scanNode);

      const result = scanText({
        startPosition: { offsetNode: scanNode, offset: 0 },
        matchCurrency: true,
      });

      expect(result).toMatchObject({
        text: 'テスト',
        textRange: [{ node: scanNode, start: 0, end: 3 }],
      });
    });
  });
});
