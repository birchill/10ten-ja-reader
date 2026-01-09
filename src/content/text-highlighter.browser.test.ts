import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import type { TextHighlighter as TextHighlighterClass } from './text-highlighter';

describe('TextHighligher', () => {
  let TextHighlighter: typeof TextHighlighterClass;
  let previousChromeObject: any;
  let previousBrowserObject: any;

  let testDiv: HTMLDivElement;
  let subject: TextHighlighterClass;

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

    ({ TextHighlighter } = await import('./text-highlighter'));
  });

  afterAll(() => {
    globalThis.browser = previousBrowserObject;
    globalThis.chrome = previousChromeObject;
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
    document.getElementById('test-div')?.remove();

    subject.detach();
  });

  it('should highlight text in a textbox', () => {
    // Arrange
    testDiv.innerHTML = '<input type="text" value="あいうえお">';
    const textBox = testDiv.firstChild as HTMLInputElement;

    // Act
    subject.highlight({
      length: 3,
      textRange: [{ node: textBox, start: 1, end: 5 }],
    });

    // Assert
    expect(textBox.selectionStart).toBe(1);
    expect(textBox.selectionEnd).toBe(4);
  });
});
