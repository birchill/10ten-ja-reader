import { assert } from 'chai';
import { browser } from './browser-polyfill';
(window as any).browser = browser;

import { TextHighlighter } from '../src/content/text-highlighter';

mocha.setup('bdd');

describe('TextHighligher', () => {
  let testDiv: HTMLDivElement;
  let subject: TextHighlighter;

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
