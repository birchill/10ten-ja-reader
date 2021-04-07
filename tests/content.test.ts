import { assert } from 'chai';
import { browser } from './browser-polyfill';
(window as any).browser = browser;

import { ContentConfig } from '../src/content-config';
import { RikaiContent, GetTextResult } from '../src/content';
import { ReferenceAbbreviation } from '../src/refs';

mocha.setup('bdd');

function assertTextResultEqual(
  result: GetTextResult | null,
  text: string,
  startContainer?: Node,
  startOffset?: number,
  ...endpoints: Array<any>
) {
  assert.isNotNull(result, 'Result should not be null');
  if (result === null) {
    return;
  }

  assert.strictEqual(result.text, text, 'Result text should match');

  // Title only case
  if (!startContainer) {
    assert.isNull(result.rangeStart, 'rangeStart should be null');
    assert.strictEqual(result.rangeEnds.length, 0, 'rangeEnd should be empty');
    return;
  }

  assert.isNotNull(result.rangeStart, 'rangeStart should NOT be null');

  assert.strictEqual(
    result.rangeStart!.container,
    startContainer,
    'rangeStart container node should match'
  );
  assert.strictEqual(
    result.rangeStart!.offset,
    startOffset,
    'rangeStart offset should match'
  );
  assert.strictEqual(
    result.rangeEnds.length,
    endpoints.length / 2,
    'number of end points should match'
  );
  for (let i = 0; i < endpoints.length / 2; i++) {
    assert.strictEqual(
      result.rangeEnds[i].container,
      endpoints[i * 2],
      `rangeEnds #${i + 1} container node should match`
    );
    assert.strictEqual(
      result.rangeEnds[i].offset,
      endpoints[i * 2 + 1],
      `rangeEnds #${i + 1} offset should match`
    );
  }

  // We want to check that a suitable Range object would produce the same text
  // but we don't create Range objects when the target is an <input> or
  // <textarea> node.
  if (
    result.rangeStart!.container instanceof HTMLInputElement ||
    result.rangeStart!.container instanceof HTMLTextAreaElement
  ) {
    return;
  }

  // Consistency check
  const range = new Range();
  range.setStart(result.rangeStart!.container, result.rangeStart!.offset);
  const lastEndpoint = result.rangeEnds[result.rangeEnds.length - 1];
  range.setEnd(lastEndpoint.container, lastEndpoint.offset);

  // If we have ruby text then the range string won't match the text passed so
  // just skip this check.
  const containsRuby = (node?: Node) =>
    node &&
    node.nodeType === Node.ELEMENT_NODE &&
    ((node as Element).tagName === 'RUBY' ||
      (node as Element).querySelector('ruby'));
  if (!containsRuby(range.commonAncestorContainer)) {
    assert.strictEqual(range.toString(), text);
  }
}

function getBboxForOffset(node: Node, start: number) {
  const range = new Range();
  range.setStart(node, start);
  range.setEnd(node, start + 1);
  return range.getBoundingClientRect();
}

describe('rikaiContent:text search', () => {
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
        startCopy: ['c'],
      },
      noTextHighlight: false,
      popupStyle: 'blue',
      posDisplay: 'expl',
      readingOnly: false,
      showKanjiComponents: true,
      showPriority: true,
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

  it('should find a range in a div', () => {
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.right,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'いうえお', textNode, 1, textNode, 5);
  });

  it('should find a range in a div when the point is part-way through a character', () => {
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left + bbox.width / 2 - 1,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'あいうえお', textNode, 0, textNode, 5);
  });

  it('should NOT find a range in a div when the point is a long way away (but caretPositionFromPoint lands us in the wrong place)', () => {
    // Create two divs so we can select the parent div between them
    const div1 = document.createElement('div');
    div1.append('あいうえお');

    const div2 = document.createElement('div');
    div2.append('あいうえお');

    testDiv.append(div1);
    testDiv.append(div2);

    // Create some space between them
    div1.style.marginBottom = '20px';

    // Find the space between them
    const bbox = div1.getBoundingClientRect();
    const pointToTest = { x: bbox.left, y: bbox.bottom + 10 };
    assert.strictEqual(
      document.elementFromPoint(pointToTest.x, pointToTest.y),
      testDiv
    );

    const result = subject.getTextAtPoint(pointToTest);

    assert.strictEqual(result, null);
  });

  it('should NOT find a range in a div when the point is a long way away due to line wrapping', () => {
    testDiv.style.width = '300px';
    testDiv.style.paddingRight = '100px';
    testDiv.textContent =
      '何故かと云うとこの二三年京都には地震とか辻風とか火事とか饑饉とか云う災いがつづいて起こったそこで洛中のさびれ方は一通りでない旧記によると仏像や';

    const bbox = testDiv.getBoundingClientRect();
    const pointToTest = { x: 305, y: bbox.top + 5 };

    const result = subject.getTextAtPoint(pointToTest);

    assert.strictEqual(result, null);
  });

  it('should find text in an inline sibling', () => {
    testDiv.innerHTML = 'あい<span>うえ</span>お';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const lastTextNode = testDiv.lastChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.right,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      'いうえお',
      firstTextNode,
      1,
      firstTextNode,
      2,
      middleTextNode,
      2,
      lastTextNode,
      1
    );
  });

  it('should NOT find text in a block sibling', () => {
    testDiv.innerHTML = 'あい<div>うえ</div>お';
    const firstTextNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.right,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'い', firstTextNode, 1, firstTextNode, 2);
  });

  it('should find text in a cousin for an inline node', () => {
    testDiv.innerHTML =
      '<span><span>あい</span></span>う<span>え<span>お</span></span>';
    const firstTextNode = testDiv.firstChild!.firstChild!.firstChild as Text;
    const secondTextNode = testDiv.childNodes[1] as Text;
    const thirdTextNode = testDiv.lastChild!.firstChild as Text;
    const lastTextNode = testDiv.lastChild!.lastChild!.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left + bbox.width / 2 - 1,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      'あいうえお',
      firstTextNode,
      0,
      firstTextNode,
      2,
      secondTextNode,
      1,
      thirdTextNode,
      1,
      lastTextNode,
      1
    );
  });

  it('moves onto the next node if we are at the end of the current one', () => {
    testDiv.innerHTML = '<span>あい</span><span>うえお</span>';
    const firstTextNode = testDiv.firstChild!.firstChild as Text;
    const lastTextNode = testDiv.lastChild!.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 1);

    const result = subject.getTextAtPoint({
      x: bbox.right,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'うえお', lastTextNode, 0, lastTextNode, 3);
  });

  it('should ignore non-Japanese characters', () => {
    testDiv.append('あいabc');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left + bbox.width / 2 - 1,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'あい', textNode, 0, textNode, 2);
  });

  it('should ignore non-Japanese characters when starting mid node', () => {
    testDiv.append('abcあいdef');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 3);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'あい', textNode, 3, textNode, 5);
  });

  it('should ignore non-Japanese characters even if the first character is such', () => {
    testDiv.append('abcあい');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 2);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assert.strictEqual(result, null);
  });

  it('should stop at full-width delimiters', () => {
    testDiv.append('あい。');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left + bbox.width / 2 - 1,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'あい', textNode, 0, textNode, 2);
  });

  it('should include halfwidth katakana, rare kanji, compatibility kanji etc.', () => {
    testDiv.append('ｷﾞﾝｺｳ㘆豈');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'ｷﾞﾝｺｳ㘆豈', textNode, 0, textNode, 7);
  });

  it('should include the year when recognizing years', () => {
    testDiv.append('昭和56年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, '昭和56年', textNode, 0, textNode, 5);
    assert.deepEqual(result!.meta, { era: '昭和', year: 56, matchLen: 5 });
  });

  it('should include the year when recognizing years (full-width)', () => {
    testDiv.append('昭和５６年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, '昭和５６年に', textNode, 0, textNode, 6);
    assert.deepEqual(result!.meta, { era: '昭和', year: 56, matchLen: 5 });
  });

  it('should include the year when recognizing years (mixed full-width and half-width)', () => {
    testDiv.append('昭和５6年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, '昭和５6年', textNode, 0, textNode, 5);
    assert.deepEqual(result!.meta, { era: '昭和', year: 56, matchLen: 5 });
  });

  it('should include the year when recognizing years and there are spaces', () => {
    // Some publishers like to put spaces around stuffs
    testDiv.append('昭和 56 年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, '昭和 56 年', textNode, 0, textNode, 7);
    assert.deepEqual(result!.meta, { era: '昭和', year: 56, matchLen: 7 });
  });

  it('should include the year when recognizing years and there is no 年', () => {
    // Who knows, someone might try this...
    testDiv.append('昭和56に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, '昭和56', textNode, 0, textNode, 4);
    assert.deepEqual(result!.meta, { era: '昭和', year: 56, matchLen: 4 });
  });

  it('should include the year when recognizing years and the numbers are in a separate span', () => {
    testDiv.innerHTML = '昭和<span>56</span>年に';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const lastTextNode = testDiv.childNodes[2] as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      '昭和56年',
      firstTextNode,
      0,
      firstTextNode,
      2,
      middleTextNode,
      2,
      lastTextNode,
      1
    );
    assert.deepEqual(result!.meta, { era: '昭和', year: 56, matchLen: 5 });
  });

  it('should include the year when recognizing years and the numbers are in a separate span and there is whitespace too', () => {
    testDiv.innerHTML = '昭和 <span> 56年に</span>';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      '昭和  56年',
      firstTextNode,
      0,
      firstTextNode,
      3,
      middleTextNode,
      4
    );
    assert.deepEqual(result!.meta, { era: '昭和', year: 56, matchLen: 7 });
  });

  it('should include the year when recognizing years and era description finishes exactly at the end of a span', () => {
    testDiv.innerHTML = '昭和<span>56年</span>に';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      '昭和56年',
      firstTextNode,
      0,
      firstTextNode,
      2,
      middleTextNode,
      3
    );
    assert.deepEqual(result!.meta, { era: '昭和', year: 56, matchLen: 5 });
  });

  it('should recognize 元年 after an era name', () => {
    testDiv.append('令和元年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, '令和元年に', textNode, 0, textNode, 5);
    assert.deepEqual(result!.meta, { era: '令和', year: 0, matchLen: 4 });
  });

  it('should recognize 元年 after an era name even with interleaving whitespace and spans', () => {
    testDiv.innerHTML = '昭和　<span>元年</span>';
    const firstTextNode = testDiv.firstChild as Text;
    const spanTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      '昭和　元年',
      firstTextNode,
      0,
      firstTextNode,
      3,
      spanTextNode,
      2
    );
    assert.deepEqual(result!.meta, { era: '昭和', year: 0, matchLen: 5 });
  });

  it('should recognize kanji year numbers when recognizing years', () => {
    testDiv.append('昭和五十六年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, '昭和五十六年に', textNode, 0, textNode, 7);
    assert.deepEqual(result!.meta, { era: '昭和', year: 56, matchLen: 6 });
  });

  it('should stop at delimeters (even when matching years)', () => {
    testDiv.append('昭和三大馬鹿査定」発言に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, '昭和三大馬鹿査定', textNode, 0, textNode, 8);
    assert.deepEqual(result!.meta, { era: '昭和', year: 3, matchLen: 3 });
  });

  it('should stop at the maximum number of characters', () => {
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = subject.getTextAtPoint(
      { x: bbox.left, y: bbox.top + bbox.height / 2 },
      3
    );

    assertTextResultEqual(result, 'いうえ', textNode, 1, textNode, 4);
  });

  it('should stop at the maximum number of characters even when navigating siblings', () => {
    testDiv.innerHTML = 'あい<span>うえ</span>お';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint(
      { x: bbox.right, y: bbox.top + bbox.height / 2 },
      2
    );

    assertTextResultEqual(
      result,
      'いう',
      firstTextNode,
      1,
      firstTextNode,
      2,
      middleTextNode,
      1
    );
  });

  it('should stop at the maximum number of characters even that lines up exactly with the end of a text node', () => {
    testDiv.innerHTML = 'あい<span>うえ</span>お';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint(
      { x: bbox.right, y: bbox.top + bbox.height / 2 },
      3
    );

    assertTextResultEqual(
      result,
      'いうえ',
      firstTextNode,
      1,
      firstTextNode,
      2,
      middleTextNode,
      2
    );
  });

  it('should stop at the maximum number of characters even when it is zero', () => {
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 2);

    const result = subject.getTextAtPoint(
      { x: bbox.left, y: bbox.top + bbox.height / 2 },
      0
    );

    assert.strictEqual(result, null);
  });

  it('should stop at the maximum number of characters if it comes before the end of the Japanese text', () => {
    testDiv.append('あいうabc');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = subject.getTextAtPoint(
      { x: bbox.left, y: bbox.top + bbox.height / 2 },
      1
    );

    assertTextResultEqual(result, 'い', textNode, 1, textNode, 2);
  });

  it('should stop at the end of the Japanese text if it comes before the maximum number of characters', () => {
    testDiv.append('あいうabc');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = subject.getTextAtPoint(
      { x: bbox.left, y: bbox.top + bbox.height / 2 },
      3
    );

    assertTextResultEqual(result, 'いう', textNode, 1, textNode, 3);
  });

  it('should skip leading whitespace', () => {
    testDiv.append('  　\tあいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = subject.getTextAtPoint(
      { x: bbox.right, y: bbox.top + bbox.height / 2 },
      3
    );

    assertTextResultEqual(result, 'あいう', textNode, 4, textNode, 7);
  });

  it('should skip empty nodes', () => {
    testDiv.innerHTML = '<span></span>あい<span></span>うえお';
    const firstEmptyNode = testDiv.firstChild as HTMLSpanElement;
    const firstTextNode = testDiv.childNodes[1] as Text;
    const lastTextNode = testDiv.lastChild as Text;
    const bbox = firstEmptyNode.getBoundingClientRect();

    const result = subject.getTextAtPoint({
      x: bbox.right,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      'あいうえお',
      firstTextNode,
      0,
      firstTextNode,
      2,
      lastTextNode,
      3
    );
  });

  it('should skip leading whitespace only nodes', () => {
    testDiv.innerHTML = '<span>  　</span>　あい<span></span>うえお';
    const whitespaceOnlyTextNode = testDiv.firstChild!.firstChild as Text;
    const firstRealTextNode = testDiv.childNodes[1] as Text;
    const lastTextNode = testDiv.lastChild as Text;
    const bbox = getBboxForOffset(whitespaceOnlyTextNode, 1);

    const result = subject.getTextAtPoint({
      x: bbox.right,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      'あいうえお',
      firstRealTextNode,
      1,
      firstRealTextNode,
      3,
      lastTextNode,
      3
    );
  });

  it('should skip content in ruby elements', () => {
    // This is a rather complicated example including rp tags, nested ruby,
    // whitespace in rp elements, and trailing punctuation.
    testDiv.innerHTML =
      '<ruby>仙<rp> (<rt>せん<rp>) </rp>台<rp>（<rt>だい<rp>）</ruby>の<ruby><ruby>牧<rt>ぼく</ruby><rt>まき</ruby><ruby><ruby>場<rt>じょう</ruby><rt>ば</ruby>です。';
    const firstTextNode = testDiv.firstChild!.firstChild as Text;
    const daiNode = testDiv.firstChild!.childNodes[4] as Text;
    const noNode = testDiv.childNodes[1];
    const bokuNode = testDiv.childNodes[2].firstChild!.firstChild as Text;
    const jouNode = testDiv.childNodes[3].firstChild!.firstChild as Text;
    const desuNode = testDiv.lastChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      '仙台の牧場です',
      firstTextNode,
      0,
      firstTextNode,
      1,
      daiNode,
      1,
      noNode,
      1,
      bokuNode,
      1,
      jouNode,
      1,
      desuNode,
      2
    );
  });

  it('should return the ruby base text when rb elements are used', () => {
    testDiv.innerHTML =
      '<ruby><rb>振</rb><rp>(</rp><rt>ふ</rt><rp>)</rp>り<rb>仮</rb><rp>(</rp><rt>が</rt><rp>)</rp><rb>名</rb><rp>(</rp><rt>な</rt><rp>)</rp></ruby>';
    const fuNode = testDiv.firstChild!.firstChild!.firstChild as Text;
    const riNode = testDiv.firstChild!.childNodes[4] as Text;
    const gaNode = testDiv.firstChild!.childNodes[5].firstChild as Text;
    const naNode = testDiv.firstChild!.childNodes[9].firstChild as Text;
    const bbox = getBboxForOffset(fuNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });
    assertTextResultEqual(
      result,
      '振り仮名',
      fuNode,
      0,
      fuNode,
      1,
      riNode,
      1,
      gaNode,
      1,
      naNode,
      1
    );
  });

  it('should return the ruby base text even across different ruby elements', () => {
    testDiv.innerHTML =
      '<ruby><rb>振</rb><rp>(</rp><rt>ふ</rt><rp>)</rp>り</ruby><ruby><rb>仮</rb><rp>(</rp><rt>が</rt><rp>)</rp><rb>名</rb><rp>(</rp><rt>な</rt><rp>)</rp></ruby>';
    const fuNode = testDiv.firstChild!.firstChild!.firstChild as Text;
    const riNode = testDiv.firstChild!.childNodes[4] as Text;
    const gaNode = testDiv.childNodes[1].firstChild!.firstChild as Text;
    const naNode = testDiv.childNodes[1].childNodes[4].firstChild as Text;
    const bbox = getBboxForOffset(fuNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });
    assertTextResultEqual(
      result,
      '振り仮名',
      fuNode,
      0,
      fuNode,
      1,
      riNode,
      1,
      gaNode,
      1,
      naNode,
      1
    );
  });

  it('should return the rt text if it is positioned over an rt element', () => {
    testDiv.innerHTML = '<ruby>仙<rt>せん</rt>台<rt>だい</ruby>';
    const senNode = testDiv.firstChild!.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(senNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'せん', senNode, 0, senNode, 2);
  });

  it('should return the rt text if it is positioned over a child of an rt element', () => {
    testDiv.innerHTML = '<ruby>仙<rt><b>せ</b>ん</rt>台<rt>だい</ruby>';
    const seNode = testDiv.firstChild!.childNodes[1].firstChild!
      .firstChild as Text;
    const nNode = testDiv.firstChild!.childNodes[1].lastChild as Text;
    const bbox = getBboxForOffset(seNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'せん', seNode, 0, seNode, 1, nNode, 1);
  });

  it('should traverse okurigana in inline-block elements too', () => {
    // YouTube annotates okurigana inline-block spans.
    //
    // See https://github.com/birtles/rikaichamp/issues/535
    testDiv.innerHTML =
      '<p><ruby><span>疲</span><rt>つか</rt></ruby><span style="display: inline-block">れた</span></p>';

    const kanjiNode = testDiv.firstChild!.firstChild!.firstChild!
      .firstChild as Text;
    const okuriganaNode = testDiv.firstChild!.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(kanjiNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      '疲れた',
      kanjiNode,
      0,
      kanjiNode,
      1,
      okuriganaNode,
      2
    );
  });

  it('should find text in SVG content', () => {
    testDiv.innerHTML = '<svg><text y="1em">あいうえお</text></svg>';
    const textNode = testDiv.firstChild!.firstChild!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.right + 1,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'いうえお', textNode, 1, textNode, 5);
  });

  it('should find text in nested SVG elements', () => {
    testDiv.innerHTML =
      '<svg><text y="1em">あ<tspan><tspan id=inner-tspan>いう</tspan></tspan>え<a id=inner-a>お</a></text></svg>';
    const firstTextNode = testDiv.firstChild!.firstChild!.firstChild as Text;
    const innerTspan = testDiv.querySelector('#inner-tspan')!
      .firstChild as Text;
    const middleTextNode = testDiv.firstChild!.firstChild!
      .childNodes[2] as Text;
    const innerA = testDiv.querySelector('#inner-a')!.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left + 1,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(
      result,
      'あいうえお',
      firstTextNode,
      0,
      firstTextNode,
      1,
      innerTspan,
      2,
      middleTextNode,
      1,
      innerA,
      1
    );
  });

  it('should treat rb elements elements as inline regardless of their computed style', () => {
    // Based on the markup in renshuu.org
    testDiv.innerHTML =
      '<div><ruby style="display:inline-table"><rb style="display:table-row-group"><span>引</span></rb><rt style="display:table-header-group">ひ</rt></ruby><ruby style="display:inline-table"><rb style="display:table-row-group">く</rb><rt style="display:table-header-group">&nbsp;</rt></ruby></div>';
    const hiNode = testDiv.firstChild!.firstChild!.firstChild!.firstChild!
      .firstChild as Text;
    const kuNode = testDiv.firstChild!.childNodes[1].firstChild!
      .firstChild as Text;
    const bbox = getBboxForOffset(hiNode, 0);

    const result = subject.getTextAtPoint({
      x: bbox.left,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, '引く', hiNode, 0, hiNode, 1, kuNode, 1);
  });

  it('should find text in input elements', () => {
    testDiv.innerHTML = '<input type="text" value="あいうえお">';
    const inputNode = testDiv.firstChild as HTMLInputElement;

    // There doesn't seem to be any API for getting the character offsets inside
    // an <input> or <textarea> element so we just grab the bbox of the
    // element itself and guess where the second character would be.
    //
    // We're at the mercy of available fonts and UA stylesheets here but
    // hopefully we can just set styles and so on until we get close enough on
    // all the platforms we care about.
    inputNode.style.padding = '0px';
    inputNode.style.fontSize = '10px';
    const bbox = inputNode.getBoundingClientRect();

    const result = subject.getTextAtPoint(
      // Just guess here...
      { x: bbox.left + 15, y: bbox.top + bbox.height / 2 }
    );

    assertTextResultEqual(result, 'いうえお', inputNode, 1, inputNode, 5);
  });

  it('should NOT read beyond the bounds of the input element', () => {
    testDiv.innerHTML = '<div><input type="text" value="あいう">えお</div>';
    const inputNode = testDiv.firstChild!.firstChild as HTMLInputElement;

    inputNode.style.padding = '0px';
    inputNode.style.fontSize = '10px';
    const bbox = inputNode.getBoundingClientRect();

    const result = subject.getTextAtPoint({
      x: bbox.left + 15,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'いう', inputNode, 1, inputNode, 3);
  });

  it('should NOT find text in input[type=password] elements', () => {
    testDiv.innerHTML = '<input type="password" value="あいうえお">';
    const inputNode = testDiv.firstChild as HTMLInputElement;

    inputNode.style.padding = '0px';
    inputNode.style.fontSize = '10px';
    const bbox = inputNode.getBoundingClientRect();

    const result = subject.getTextAtPoint({
      x: bbox.left + 20,
      y: bbox.top + bbox.height / 2,
    });

    assert.strictEqual(
      result,
      null,
      'Should not get a result for a password field'
    );
  });

  it('should find text in textarea elements', () => {
    testDiv.innerHTML = '<textarea>あいうえお</textarea>';
    const textAreaNode = testDiv.firstChild as HTMLTextAreaElement;

    textAreaNode.style.padding = '0px';
    textAreaNode.style.fontSize = '10px';
    const bbox = textAreaNode.getBoundingClientRect();

    const result = subject.getTextAtPoint({ x: bbox.left + 10, y: 5 });

    assertTextResultEqual(result, 'いうえお', textAreaNode, 1, textAreaNode, 5);
  });

  it('should NOT report results in textarea elements when the mouse is far away', () => {
    testDiv.innerHTML = '<textarea cols=80>あいうえお</textarea>';
    const textAreaNode = testDiv.firstChild as HTMLTextAreaElement;

    textAreaNode.style.padding = '0px';
    textAreaNode.style.fontSize = '10px';
    const bbox = textAreaNode.getBoundingClientRect();

    const result = subject.getTextAtPoint({ x: bbox.right - 10, y: 5 });

    assert.strictEqual(result, null);
  });

  it('should pull the text out of a title attribute', () => {
    testDiv.innerHTML = '<img src="" title="あいうえお">';
    const imgNode = testDiv.firstChild as HTMLImageElement;
    imgNode.style.width = '200px';
    imgNode.style.height = '200px';
    const bbox = imgNode.getBoundingClientRect();

    const result = subject.getTextAtPoint({
      x: bbox.left + bbox.width / 2,
      y: bbox.top + bbox.height / 2,
    });

    assertTextResultEqual(result, 'あいうえお');
  });

  it("should use the last result if there's no result but we haven't moved far", () => {
    testDiv.append('abcdefあいうえお');
    const textNode = testDiv.firstChild as Text;

    // Fetch once
    const bboxJP = getBboxForOffset(textNode, 6);
    const result = subject.getTextAtPoint({
      x: bboxJP.left,
      y: bboxJP.top + bboxJP.height / 2,
    });
    assertTextResultEqual(result, 'あいうえお', textNode, 6, textNode, 11);

    // Fetch again
    const bboxEN = getBboxForOffset(textNode, 5);
    const secondResult = subject.getTextAtPoint({
      x: bboxEN.left + bboxEN.width / 2,
      y: bboxEN.top + bboxEN.height / 2,
    });
    assert.strictEqual(
      result,
      secondResult,
      'Should get the same result object'
    );
  });

  it("should NOT use the last result if there's no result and we've moved far", () => {
    testDiv.append('abcdefあいうえお');
    const textNode = testDiv.firstChild as Text;

    // Fetch once
    const bboxJP = getBboxForOffset(textNode, 6);
    const result = subject.getTextAtPoint({
      x: bboxJP.left,
      y: bboxJP.top + bboxJP.height / 2,
    });
    assertTextResultEqual(result, 'あいうえお', textNode, 6, textNode, 11);

    // Fetch again
    const bboxEN = getBboxForOffset(textNode, 0);
    const secondResult = subject.getTextAtPoint({
      x: bboxEN.left + bboxEN.width / 2,
      y: bboxEN.top + bboxEN.height / 2,
    });
    assert.strictEqual(secondResult, null);
  });
});

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
