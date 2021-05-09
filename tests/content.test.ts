import { assert } from 'chai';
import { browser } from './browser-polyfill';
(window as any).browser = browser;

import { ContentConfig } from '../src/content-config';
import { RikaiContent } from '../src/content';
import { ReferenceAbbreviation } from '../src/refs';

mocha.setup('bdd');

describe('rikaiContent:highlighting', () => {
  let testDiv: HTMLDivElement;
  let subject: RikaiContent;

  beforeEach(() => {
    const config: ContentConfig = {
      accentDisplay: 'downstep',
      dictLang: 'en',
      holdToShowKeys: [],
      kanjiReferences: ['kk'] as Array<ReferenceAbbreviation>,
      keys: {
        toggleDefinition: ['d'],
        nextDictionary: ['Shift'],
        movePopupUp: [],
        movePopupDown: [],
        startCopy: ['c'],
      },
      noTextHighlight: false,
      popupStyle: 'blue',
      posDisplay: 'expl',
      readingOnly: false,
      showPriority: true,
      showKanjiComponents: true,
    };
    subject = new RikaiContent(config);

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
    const range = {
      text: 'いうえお',
      rangeStart: { container: textBox, offset: 1 },
      rangeEnds: [{ container: textBox, offset: 5 }],
    };

    subject.highlightText(range, 3);

    assert.strictEqual(textBox.selectionStart, 1);
    assert.strictEqual(textBox.selectionEnd, 4);
  });
});
