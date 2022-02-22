import { expect } from '@esm-bundle/chai';
import chrome from 'sinon-chrome';
import sinon from 'sinon';

declare global {
  interface Window {
    _docs_annotate_canvas_by_ext?: string;
  }
}

describe('docs-annotate-canvas.ts', function () {
  beforeEach(function () {
    chrome.reset();
    sinon.reset();
    delete window._docs_annotate_canvas_by_ext;
  });

  it('should set special property to rikaikun extension ID when document.head exists', async function () {
    chrome.runtime.id = 'test_special_id_head';

    await import('../docs-annotate-canvas.js');

    expect(window._docs_annotate_canvas_by_ext).to.equal(chrome.runtime.id);
  });

  it('should set special property to rikaikun extension ID with no document.head', async function () {
    sinon.stub(document, 'head').value(undefined);
    chrome.runtime.id = 'test_special_id_no_head';

    // Added query string to force reloading module, requires updating test-augments.d.ts.
    await import('../docs-annotate-canvas.js?no-head');

    expect(window._docs_annotate_canvas_by_ext).to.equal(chrome.runtime.id);
  });
});
