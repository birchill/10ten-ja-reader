import { expect } from '@esm-bundle/chai';
import chrome from 'sinon-chrome';

declare global {
  interface Window {
    _docs_force_html_by_ext?: string;
  }
}

let forceHtmlCallback: (force: boolean) => void;

describe('docs-html-fallback.ts after sending `forceDocsHtml?` message', function () {
  before(async function () {
    await import('../docs-html-fallback');
    forceHtmlCallback = chrome.runtime.sendMessage.args[0][1];
  });

  beforeEach(function () {
    chrome.reset();
    delete window._docs_force_html_by_ext;
  });

  describe('when `forceHtml` callback is called with `false`', function () {
    it('should not add special property to window object', async function () {
      forceHtmlCallback(false);

      expect(window._docs_force_html_by_ext).to.be.undefined;
    });
  });

  describe('when `forceHtml` callback is called with `true`', function () {
    it('should set special property to rikaikun extension ID', async function () {
      chrome.runtime.id = 'test_special_id';

      forceHtmlCallback(true);

      expect(window._docs_force_html_by_ext).to.equal(chrome.runtime.id);
    });
  });
});
