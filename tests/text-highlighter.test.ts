// sort-imports-ignore

import { assert } from 'chai';

import browser from './browser-polyfill';

(window as any).browser = browser;

// Make sure the browser polyfill believes we are in an extension context
(window as any).chrome = { runtime: { id: 'test' } };

import type { TextHighlighter as TextHighlighterClass } from '../src/content/text-highlighter';

let TextHighlighter: typeof TextHighlighterClass;

mocha.setup('bdd');

describe('TextHighligher', () => {
  let testDiv: HTMLDivElement;
  let subject: TextHighlighterClass;

  before(async () => {
    ({ TextHighlighter } = await import('../src/content/text-highlighter'));
  });

  beforeEach(() => {
    subject = new TextHighlighter();
    testDiv = document.createElement('div');
    testDiv.setAttribute('id', 'test-div');
    // Stick the div at the top as if the div is offscreen,
    // caretPositionFromPoint won't work
    testDiv.style.position = 'fixed';
    testDiv.style.top = '0px';
    document.body.append(testDiv);
  });

  afterEach(() => {
    document.getElementById('test-div')!.remove();
    subject.detach();
  });

  it('should highlight text in a textbox', () => {
    testDiv.innerHTML = '<input type="text" value="あいうえお">';
    const textBox = testDiv.firstChild as HTMLInputElement;

    subject.highlight({
      length: 3,
      textRange: [{ node: textBox, start: 1, end: 5 }],
    });

    assert.strictEqual(textBox.selectionStart, 1);
    assert.strictEqual(textBox.selectionEnd, 4);
  });
});
