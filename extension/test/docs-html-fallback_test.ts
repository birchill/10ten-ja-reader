import { expect } from '@esm-bundle/chai';
import chrome from 'sinon-chrome';

declare global {
  interface Window {
    _docs_force_html_by_ext?: string;
  }
}

let forceHtmlCallback: (force: boolean) => void;

describe('docs-html-fallback.ts after sending `forceDocsHtml?` message', () => {
  before(async () => {
    await import('../docs-html-fallback');
    forceHtmlCallback = chrome.runtime.sendMessage.args[0][1];
  });

  beforeEach(() => {
    chrome.reset();
    window._docs_force_html_by_ext = undefined;
  });

  describe('when `forceHtml` callback is called with `false`', () => {
    it('should not add special property to window object', async () => {
      forceHtmlCallback(false);

      expect(window._docs_force_html_by_ext).to.be.undefined;
    });
  });

  describe('when `forceHtml` callback is called with `true`', () => {
    it('should set special property to rikaikun extension ID', async () => {
      chrome.runtime.id = 'test_special_id';

      forceHtmlCallback(true);

      expect(window._docs_force_html_by_ext).to.equal(chrome.runtime.id);
    });
  });
});
