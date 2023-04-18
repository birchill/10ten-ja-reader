import { assert } from 'chai';

import {
  clearPreviousResult,
  getTextAtPoint,
  GetTextAtPointResult,
} from '../src/content/get-text';
import { empty } from '../src/utils/dom-utils';
import { isChromium } from '../src/utils/ua-utils';

mocha.setup('bdd');

describe('getTextAtPoint', () => {
  let testDiv: HTMLDivElement;

  beforeEach(() => {
    testDiv = document.createElement('div');
    testDiv.setAttribute('id', 'test-div');
    // Stick the div at the top as if the div is offscreen,
    // caretPositionFromPoint won't work
    testDiv.style.position = 'fixed';
    testDiv.style.top = '0px';
    document.body.append(testDiv);
  });

  afterEach(() => {
    testDiv.remove();
    clearPreviousResult();
  });

  it('should find a range in a div', () => {
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'いうえお', [textNode, 1, 5]);
  });

  it('should find a range in a div when the point is part-way through a character', () => {
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      // Add a little extra to make sure we're testing the behavior when we're
      // in the second half of the character.
      point: {
        x: bbox.left + bbox.width / 2 + 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'あいうえお', [textNode, 0, 5]);
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

    const result = getTextAtPoint({ point: pointToTest });

    assert.strictEqual(result, null);
  });

  it('should NOT find a range in a div when the point is a long way away due to line wrapping', () => {
    testDiv.style.width = '300px';
    testDiv.style.paddingRight = '100px';
    testDiv.style.boxSizing = 'border-box';
    testDiv.textContent =
      '何故かと云うとこの二三年京都には地震とか辻風とか火事とか饑饉とか云う災いがつづいて起こったそこで洛中のさびれ方は一通りでない旧記によると仏像や';

    const bbox = testDiv.getBoundingClientRect();
    const pointToTest = { x: 305, y: bbox.top + 5 };

    const result = getTextAtPoint({ point: pointToTest });

    assert.strictEqual(result, null);
  });

  it('should find text in an inline sibling', () => {
    testDiv.innerHTML = 'あい<span>うえ</span>お';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const lastTextNode = testDiv.lastChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 1);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      'いうえお',
      [firstTextNode, 1, 2],
      [middleTextNode, 0, 2],
      [lastTextNode, 0, 1]
    );
  });

  it('should NOT find text in a block sibling', () => {
    testDiv.innerHTML = 'あい<div>うえ</div>お';
    const firstTextNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 1);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'い', [firstTextNode, 1, 2]);
  });

  it('should find text in a block sibling if we only have one character', () => {
    // The following markup is based on what pdf.js generates for vertical
    // text, in at least some cases.
    //
    // In particular, the `position: absolute` part is important because it
    // causes the spans to compute to `display: block`.
    testDiv.innerHTML = `
      <div class="textLayer" style="width: 10px; height: 120px">
        <span style="position: absolute; left: 1.764px; top: 26.745px; font-size: 16.5338px; font-family: monospace;" role="presentation" dir="ltr">一</span>
        <br role="presentation">
        <span style="position: absolute; left: 1.764px; top: 45.455px; font-size: 16.5338px; font-family: monospace;" role="presentation" dir="ltr">生</span>
        <br role="presentation">
        <span style="position: absolute; left: 1.764px; top: 64.165px; font-size: 16.5338px; font-family: monospace;" role="presentation" dir="ltr">懸</span>
        <br role="presentation">
        <span style="position: absolute; left: 1.764px; top: 82.876px; font-size: 16.5338px; font-family: monospace;" role="presentation" dir="ltr">命</span>
        <br role="presentation">
        <span style="position: absolute; left: 1.764px; top: 101.585px; font-size: 16.5338px; font-family: monospace;" role="presentation" dir="ltr">、</span>
        <br role="presentation">
      </div>
      `;
    const firstTextNode = testDiv.firstElementChild?.firstElementChild
      ?.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assert.strictEqual(
      result?.text.replace(/\s/g, ''),
      '一生懸命',
      'Result text should match'
    );
  });

  it('should find text in a block cousin if the grandparent is inline-block', () => {
    // Based on https://www.kanshudo.com/grammar/%E3%81%AA%E3%81%84%E3%81%A7%E3%83%BB%E3%81%AA%E3%81%8F%E3%81%A6%E3%83%BB%E3%81%9A%E3%81%AB
    testDiv.innerHTML =
      '<a><span style="display: inline-block"><div>あら</div><div>洗</div></span>わないで</a>';

    const baseTextNode = testDiv.firstElementChild?.firstElementChild
      ?.children[1]?.firstChild as Text;
    const bbox = getBboxForOffset(baseTextNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });
    assert.strictEqual(result?.text, '洗わないで');
  });

  it('should find text in a cousin for an inline node', () => {
    testDiv.innerHTML =
      '<span><span>あい</span></span>う<span>え<span>お</span></span>';
    const firstTextNode = testDiv.firstChild!.firstChild!.firstChild as Text;
    const secondTextNode = testDiv.childNodes[1] as Text;
    const thirdTextNode = testDiv.lastChild!.firstChild as Text;
    const lastTextNode = testDiv.lastChild!.lastChild!.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      'あいうえお',
      [firstTextNode, 0, 2],
      [secondTextNode, 0, 1],
      [thirdTextNode, 0, 1],
      [lastTextNode, 0, 1]
    );
  });

  it('moves onto the next node if we are at the end of the current one', () => {
    testDiv.innerHTML = '<span>あい</span><span>うえお</span>';
    const firstTextNode = testDiv.firstChild!.firstChild as Text;
    const lastTextNode = testDiv.lastChild!.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 1);

    const result = getTextAtPoint({
      point: {
        x: bbox.right + 0.5,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'うえお', [lastTextNode, 0, 3]);
  });

  it('should dig into the content behind covering links hidden with geometry', () => {
    // The following is based very heavily on the structure of article previews
    // in asahi.com as of 2021-05-22.
    testDiv.innerHTML =
      '<div><a href="/articles/" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; z-index: 1"><span aria-hidden="true" style="display: block; width: 1px; height: 1px; overflow: hidden">あいうえお</span></a><div><div style="position: relative; width: 100%"><h2 style="z-index: auto"><a href="/articles/" id="innerLink">あいうえお</a></h2></div></div>';

    const textNode = testDiv.querySelector('#innerLink')!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'いうえお', [textNode, 1, 5]);
  });

  it('should dig into the content behind covering links hidden with opacity', () => {
    // The following is based on the structure of article previews from
    // nikkei.com
    testDiv.innerHTML =
      '<a href="/articles/" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; overflow: hidden; opacity: 0">オーバーレイ</a><div style="padding-left: 20px"><h2 style="width: 100%"><a href="/articles/"><span id="innerSpan">あいうえお</span></a></h2></div>';

    const textNode = testDiv.querySelector('#innerSpan')!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'いうえお', [textNode, 1, 5]);
  });

  it('should find text in user-select: all content', () => {
    testDiv.innerHTML = '<span style="user-select: all">あいうえお</span>';
    const textNode = testDiv.firstChild!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'いうえお', [textNode, 1, 5]);
  });

  it('should find text in user-select: none content', () => {
    testDiv.innerHTML = '<span style="user-select: none">あいうえお</span>';
    const textNode = testDiv.firstChild!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'いうえお', [textNode, 1, 5]);
  });

  it('should read shadow DOM content', () => {
    // To simulate a custom element, we set the container to display: contents
    const container = document.createElement('div');
    container.style.display = 'contents';
    container.attachShadow({ mode: 'open' });
    testDiv.append(container);

    container.shadowRoot!.innerHTML = '<div>テスト</div>';

    const textNode = container.shadowRoot!.firstElementChild!
      .firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'テスト', [textNode, 0, 3]);
  });

  it('should ignore non-Japanese characters', () => {
    testDiv.append('あいabc');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'あい', [textNode, 0, 2]);
  });

  it('should ignore non-Japanese characters when starting mid node', () => {
    testDiv.append('abcあいdef');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 3);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'あい', [textNode, 3, 5]);
  });

  it('should ignore non-Japanese characters even if the first character is such', () => {
    testDiv.append('abcあい');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 2);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assert.strictEqual(result, null);
  });

  it('should stop at full-width delimiters', () => {
    testDiv.append('あい。');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'あい', [textNode, 0, 2]);
  });

  it('should include halfwidth katakana, rare kanji, compatibility kanji etc.', () => {
    testDiv.append('ｷﾞﾝｺｳ㘆豈');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'ｷﾞﾝｺｳ㘆豈', [textNode, 0, 7]);
  });

  it('should include zero-width non-joiner characters', () => {
    testDiv.append('あ\u200cい\u200cう\u200c。');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'あ\u200cい\u200cう\u200c', [textNode, 0, 6]);
  });

  it('should include the year when recognizing years', () => {
    testDiv.append('昭和56年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '昭和56年', [textNode, 0, 5]);
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 56,
      matchLen: 5,
    });
  });

  it('should include the year when recognizing years (full-width)', () => {
    testDiv.append('昭和５６年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '昭和５６年に', [textNode, 0, 6]);
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 56,
      matchLen: 5,
    });
  });

  it('should include the year when recognizing years (mixed full-width and half-width)', () => {
    testDiv.append('昭和５6年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '昭和５6年', [textNode, 0, 5]);
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 56,
      matchLen: 5,
    });
  });

  it('should include the year when recognizing years and there are spaces', () => {
    // Some publishers like to put spaces around stuffs
    testDiv.append('昭和 56 年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '昭和 56 年', [textNode, 0, 7]);
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 56,
      matchLen: 7,
    });
  });

  it('should include the year when recognizing years and there is no 年', () => {
    // Who knows, someone might try this...
    testDiv.append('昭和56に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '昭和56', [textNode, 0, 4]);
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 56,
      matchLen: 4,
    });
  });

  it('should include the year when recognizing years and the numbers are in a separate span', () => {
    testDiv.innerHTML = '昭和<span>56</span>年に';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const lastTextNode = testDiv.childNodes[2] as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      '昭和56年',
      [firstTextNode, 0, 2],
      [middleTextNode, 0, 2],
      [lastTextNode, 0, 1]
    );
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 56,
      matchLen: 5,
    });
  });

  it('should include the year when recognizing years and the numbers are in a separate span and there is whitespace too', () => {
    testDiv.innerHTML = '昭和 <span> 56年に</span>';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      '昭和  56年',
      [firstTextNode, 0, 3],
      [middleTextNode, 0, 4]
    );
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 56,
      matchLen: 7,
    });
  });

  it('should include the year when recognizing years and era description finishes exactly at the end of a span', () => {
    testDiv.innerHTML = '昭和<span>56年</span>に';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      '昭和56年',
      [firstTextNode, 0, 2],
      [middleTextNode, 0, 3]
    );
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 56,
      matchLen: 5,
    });
  });

  it('should recognize 元年 after an era name', () => {
    testDiv.append('令和元年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '令和元年に', [textNode, 0, 5]);
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '令和',
      year: 0,
      matchLen: 4,
    });
  });

  it('should recognize 元年 after an era name even with interleaving whitespace and spans', () => {
    testDiv.innerHTML = '昭和　<span>元年</span>';
    const firstTextNode = testDiv.firstChild as Text;
    const spanTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      '昭和　元年',
      [firstTextNode, 0, 3],
      [spanTextNode, 0, 2]
    );
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 0,
      matchLen: 5,
    });
  });

  it('should recognize kanji year numbers when recognizing years', () => {
    testDiv.append('昭和五十六年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '昭和五十六年に', [textNode, 0, 7]);
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 56,
      matchLen: 6,
    });
  });

  it('should stop at delimeters (even when matching years)', () => {
    testDiv.append('昭和三大馬鹿査定」発言に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '昭和三大馬鹿査定', [textNode, 0, 8]);
    assert.deepEqual(result!.meta, {
      type: 'era',
      era: '昭和',
      year: 3,
      matchLen: 3,
    });
  });

  it('should recognize Japanese yen values', () => {
    testDiv.append('価格8万8千円です');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 2);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '8万8千円です', [textNode, 2, 9]);
    assert.deepEqual(result!.meta, {
      type: 'currency',
      value: 88000,
      matchLen: 5,
    });
  });

  it('should recognize Japanese yen values that start with ￥', () => {
    testDiv.append('価格￥8万8千です');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 2);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '￥8万8千です', [textNode, 2, 9]);
    assert.deepEqual(result!.meta, {
      type: 'currency',
      value: 88000,
      matchLen: 5,
    });
  });

  it('should recognize Japanese yen values that start with ¥', () => {
    testDiv.append('価格¥ 8万8千です');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 2);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '¥ 8万8千です', [textNode, 2, 10]);
    assert.deepEqual(result!.meta, {
      type: 'currency',
      value: 88000,
      matchLen: 6,
    });
  });

  it('should recognize Japanese yen values that include commas', () => {
    testDiv.append('価格8,800円です');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 2);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '8,800円です', [textNode, 2, 10]);
    assert.deepEqual(result?.meta, {
      type: 'currency',
      value: 8800,
      matchLen: 6,
    });
  });

  it('should recognize 畳 measurements', () => {
    testDiv.append('面積：6畳です');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 3);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '6畳です', [textNode, 3, 7]);
    assert.deepEqual(result!.meta, {
      type: 'measure',
      unit: '畳',
      value: 6,
      matchLen: 2,
    });
  });

  it('should recognize square metre measurements', () => {
    testDiv.append('面積：4.5 m²です');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 3);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '4.5 m²です', [textNode, 3, 11]);
    assert.deepEqual(result!.meta, {
      type: 'measure',
      unit: 'm2',
      value: 4.5,
      matchLen: 6,
    });
  });

  it('should recognize number values', () => {
    testDiv.append('距離：8万8千キロメートル');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 3);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '8万8千キロメートル', [textNode, 3, 13]);
    assert.deepEqual(result!.meta, {
      type: 'number',
      value: 88000,
      src: '8万8千',
      matchLen: 4,
    });
  });

  it('should recognize shogi moves', () => {
    const moves = ['☗８三銀', '８三銀', '8三銀', '☗83銀', '☗八三銀'];

    for (const move of moves) {
      empty(testDiv);
      clearPreviousResult();
      testDiv.append(`${move}です`);
      const textNode = testDiv.firstChild as Text;
      const bbox = getBboxForOffset(textNode, 0);

      const result = getTextAtPoint({
        point: {
          x: bbox.left,
          y: bbox.top + bbox.height / 2,
        },
      });

      assert.deepEqual(
        result!.meta,
        {
          type: 'shogi',
          matchLen: move.length,
          side: move.startsWith('☗') ? 'black' : undefined,
          dest: [8, 3],
          piece: 's',
          movement: undefined,
          promotion: undefined,
        },
        `move: ${move}`
      );
    }
  });

  it('should NOT recognize ambiguous shogi-like moves', () => {
    testDiv.append('83銀です');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    let result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });
    assert.isUndefined(result?.meta);

    // Try again with an all kanji match that should be treated as a number
    empty(testDiv);
    clearPreviousResult();
    testDiv.append('八三銀です');
    result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });
    assert.deepEqual(result!.meta, {
      type: 'number',
      value: 83,
      src: '八三',
      matchLen: 2,
    });
  });

  it('should recognize shogi moves that use shorthand characters', () => {
    testDiv.append('８三↑です');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });
    assert.deepEqual(result!.meta, {
      type: 'shogi',
      matchLen: 3,
      side: undefined,
      dest: [8, 3],
      piece: 'l',
      movement: undefined,
      promotion: undefined,
    });
  });

  // Test shorthand symbols etc. are recognized -- they're not part of the
  // usual delimiter regex but we're assuming they are.

  it('should stop at the maximum number of characters', () => {
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      maxLength: 3,
    });

    assertTextResultEqual(result, 'いうえ', [textNode, 1, 4]);
  });

  it('should stop at the maximum number of characters even when navigating siblings', () => {
    testDiv.innerHTML = 'あい<span>うえ</span>お';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 1);

    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      maxLength: 2,
    });

    assertTextResultEqual(
      result,
      'いう',
      [firstTextNode, 1, 2],
      [middleTextNode, 0, 1]
    );
  });

  it('should stop at the maximum number of characters even that lines up exactly with the end of a text node', () => {
    testDiv.innerHTML = 'あい<span>うえ</span>お';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 1);

    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      maxLength: 3,
    });

    assertTextResultEqual(
      result,
      'いうえ',
      [firstTextNode, 1, 2],
      [middleTextNode, 0, 2]
    );
  });

  it('should stop at the maximum number of characters even when it is zero', () => {
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 2);

    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      maxLength: 0,
    });

    assert.strictEqual(result, null);
  });

  it('should stop at the maximum number of characters if it comes before the end of the Japanese text', () => {
    testDiv.append('あいうabc');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      maxLength: 1,
    });

    assertTextResultEqual(result, 'い', [textNode, 1, 2]);
  });

  it('should stop at the end of the Japanese text if it comes before the maximum number of characters', () => {
    testDiv.append('あいうabc');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      maxLength: 3,
    });

    assertTextResultEqual(result, 'いう', [textNode, 1, 3]);
  });

  it('should skip leading whitespace', () => {
    testDiv.append('  　\tあいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
      maxLength: 3,
    });

    assertTextResultEqual(result, 'あいう', [textNode, 4, 7]);
  });

  it('should skip empty nodes', () => {
    testDiv.innerHTML = '<span></span>あい<span></span>うえお';
    const firstEmptyNode = testDiv.firstChild as HTMLSpanElement;
    const firstTextNode = testDiv.childNodes[1] as Text;
    const lastTextNode = testDiv.lastChild as Text;
    const bbox = firstEmptyNode.getBoundingClientRect();

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      'あいうえお',
      [firstTextNode, 0, 2],
      [lastTextNode, 0, 3]
    );
  });

  it('should skip leading whitespace only nodes', () => {
    testDiv.innerHTML = '<span>  　</span>　あい<span></span>うえお';
    const whitespaceOnlyTextNode = testDiv.firstChild!.firstChild as Text;
    const firstRealTextNode = testDiv.childNodes[1] as Text;
    const lastTextNode = testDiv.lastChild as Text;
    const bbox = getBboxForOffset(whitespaceOnlyTextNode, 1);

    const result = getTextAtPoint({
      point: {
        x: bbox.right,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      'あいうえお',
      [firstRealTextNode, 1, 3],
      [lastTextNode, 0, 3]
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

    const result = getTextAtPoint({
      point: {
        x: bbox.left,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      '仙台の牧場です',
      [firstTextNode, 0, 1],
      [daiNode, 0, 1],
      [noNode, 0, 1],
      [bokuNode, 0, 1],
      [jouNode, 0, 1],
      [desuNode, 0, 2]
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

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });
    assertTextResultEqual(
      result,
      '振り仮名',
      [fuNode, 0, 1],
      [riNode, 0, 1],
      [gaNode, 0, 1],
      [naNode, 0, 1]
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

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });
    assertTextResultEqual(
      result,
      '振り仮名',
      [fuNode, 0, 1],
      [riNode, 0, 1],
      [gaNode, 0, 1],
      [naNode, 0, 1]
    );
  });

  it('should return the rt text if it is positioned over an rt element', () => {
    testDiv.innerHTML = '<ruby>仙<rt>せん</rt>台<rt>だい</ruby>';
    const senNode = testDiv.firstChild!.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(senNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 4,
      },
    });

    assertTextResultEqual(result, 'せん', [senNode, 0, 2]);
  });

  it('should return the rt text if it is positioned over a child of an rt element', () => {
    testDiv.innerHTML = '<ruby>仙<rt><b>せ</b>ん</rt>台<rt>だい</ruby>';
    const seNode = testDiv.firstChild!.childNodes[1].firstChild!
      .firstChild as Text;
    const nNode = testDiv.firstChild!.childNodes[1].lastChild as Text;
    const bbox = getBboxForOffset(seNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 4,
      },
    });

    assertTextResultEqual(result, 'せん', [seNode, 0, 1], [nNode, 0, 1]);
  });

  it('should traverse okurigana in inline-block elements too', () => {
    // YouTube annotates okurigana inline-block spans.
    //
    // See https://github.com/birchill/10ten-ja-reader/issues/535
    testDiv.innerHTML =
      '<p><ruby><span>疲</span><rt>つか</rt></ruby><span style="display: inline-block">れた</span></p>';

    const kanjiNode = testDiv.firstChild!.firstChild!.firstChild!
      .firstChild as Text;
    const okuriganaNode = testDiv.firstChild!.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(kanjiNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      '疲れた',
      [kanjiNode, 0, 1],
      [okuriganaNode, 0, 2]
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

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, '引く', [hiNode, 0, 1], [kuNode, 0, 1]);
  });

  it('should parse base text from simulated mono ruby', () => {
    // The key part here is the display: contents part
    testDiv.innerHTML =
      '<ruby style="display: inline-grid; grid-template-rows: [rt] auto [base] auto; justify-items: center; padding-top: .25rem; row-gap: .25rem"><span style="padding-left: .5rem; padding-right: .5rem; margin-left: -0.5rem; margin-right: -0.5rem; display: contents"><span>東</span><span>京</span></span><rt style="user-select: none; padding-top: .25rem; padding-bottom: .25rem; line-height: 1; font-size: .875rem; display: contents"><span style="grid-row: rt"><>とう</span></span><span style="grid-row: rt"><span>きょう</span></span></rt></ruby>';

    const tokyoStart = testDiv.querySelector('ruby > span > span')!
      .firstChild as Text;
    const tokyoNoKyo = testDiv.querySelector('ruby > span > span:nth-child(2)')!
      .firstChild as Text;
    const bbox = getBboxForOffset(tokyoStart, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      '東京',
      [tokyoStart, 0, 1],
      [tokyoNoKyo, 0, 1]
    );
  });

  it('should find text in SVG content', function () {
    // Skipping on Firefox due to bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1801581
    if (navigator.userAgent.indexOf('Firefox')) {
      this.skip();
    }

    testDiv.innerHTML = '<svg><text y="1em">あいうえお</text></svg>';
    const textNode = testDiv.firstChild!.firstChild!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    const result = getTextAtPoint({
      point: {
        x: bbox.right + 1,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'いうえお', [textNode, 1, 5]);
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

    const result = getTextAtPoint({
      point: {
        x: bbox.left + 1,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(
      result,
      'あいうえお',
      [firstTextNode, 0, 1],
      [innerTspan, 0, 2],
      [middleTextNode, 0, 1],
      [innerA, 0, 1]
    );
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
    inputNode.style.fontFamily = 'monospace';
    const bbox = inputNode.getBoundingClientRect();

    // The following is determined empirically based on what seems to work both
    // on Windows and on Linux (in CI) for both Firefox and Chrome.
    //
    // Chrome and Firefox will likely use different default fonts and
    // furthermore they follow different code paths.
    //
    // On Chrome we create a mirror element for the text box and look up that
    // instead. That might end up using different fonts for all we know.
    // Furthermore, for the mirror element we end up applying the "previous
    // character adjustment" (where we try to detect if caretPositionFromPoint
    // _should_ have returned the previous character to what it did).
    //
    // As a result, this may need tweaking from time to time. For now,
    // hopefully these values do the trick on all browsers and platforms we test
    // on.
    const offset = isChromium() ? 13 : 15;

    const result = getTextAtPoint({
      point: { x: bbox.left + offset, y: bbox.top + bbox.height / 2 },
    });

    assertTextResultEqual(result, 'いうえお', [inputNode, 1, 5]);
  });

  it('should find text from the start of input elements', () => {
    testDiv.innerHTML = '<input type="text" value="あいうえお">';
    const inputNode = testDiv.firstChild as HTMLInputElement;

    inputNode.style.padding = '0px';
    inputNode.style.fontSize = '10px';
    inputNode.style.fontFamily = 'monospace';
    const bbox = inputNode.getBoundingClientRect();

    const result = getTextAtPoint({
      point: {
        x: bbox.left + 1,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'あいうえお', [inputNode, 0, 5]);
  });

  it('should NOT read beyond the bounds of the input element', () => {
    testDiv.innerHTML = '<div><input type="text" value="あいう">えお</div>';
    const inputNode = testDiv.firstChild!.firstChild as HTMLInputElement;

    inputNode.style.padding = '0px';
    inputNode.style.fontSize = '10px';
    inputNode.style.fontFamily = 'monospace';
    const bbox = inputNode.getBoundingClientRect();

    // See notes above about how we arrived at this offset.
    const offset = isChromium() ? 13 : 15;

    const result = getTextAtPoint({
      point: {
        x: bbox.left + offset,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'いう', [inputNode, 1, 3]);
  });

  it('should NOT find text in input[type=password] elements', () => {
    testDiv.innerHTML = '<input type="password" value="あいうえお">';
    const inputNode = testDiv.firstChild as HTMLInputElement;

    inputNode.style.padding = '0px';
    inputNode.style.fontSize = '10px';
    inputNode.style.fontFamily = 'monospace';
    const bbox = inputNode.getBoundingClientRect();

    const result = getTextAtPoint({
      point: {
        x: bbox.left + 20,
        y: bbox.top + bbox.height / 2,
      },
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
    textAreaNode.style.fontFamily = 'monospace';
    const bbox = textAreaNode.getBoundingClientRect();

    // See notes above about how we arrived at this offset.
    const offset = isChromium() ? 13 : 15;

    const result = getTextAtPoint({ point: { x: bbox.left + offset, y: 5 } });

    assertTextResultEqual(result, 'いうえお', [textAreaNode, 1, 5]);
  });

  it('should NOT report results in textarea elements when the mouse is far away', () => {
    testDiv.innerHTML = '<textarea cols=80>あいうえお</textarea>';
    const textAreaNode = testDiv.firstChild as HTMLTextAreaElement;

    textAreaNode.style.padding = '0px';
    textAreaNode.style.fontSize = '20px';
    const bbox = textAreaNode.getBoundingClientRect();

    const result = getTextAtPoint({ point: { x: bbox.right - 10, y: 5 } });

    assert.strictEqual(result, null);
  });

  it('should pull the text out of a title attribute', () => {
    testDiv.innerHTML = '<img src="" title="あいうえお">';
    const imgNode = testDiv.firstChild as HTMLImageElement;
    imgNode.style.width = '200px';
    imgNode.style.height = '200px';
    const bbox = imgNode.getBoundingClientRect();

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    assertTextResultEqual(result, 'あいうえお');
  });

  it('should pull the text out of a title attribute on an image even when matchText is false', () => {
    testDiv.innerHTML = '<img src="" title="あいうえお">';
    const imgNode = testDiv.firstChild as HTMLImageElement;
    imgNode.style.width = '200px';
    imgNode.style.height = '200px';
    const bbox = imgNode.getBoundingClientRect();

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
      matchText: false,
      matchImages: true,
    });

    assertTextResultEqual(result, 'あいうえお');
  });

  it('should NOT pull the text out of a title attribute on a text node when matchText is false', () => {
    testDiv.innerHTML = '<span title="あいうえお">Not Japanese text</span>';
    const span = testDiv.firstChild as HTMLSpanElement;
    const bbox = span.getBoundingClientRect();

    const result = getTextAtPoint({
      point: {
        x: bbox.left + bbox.width / 2,
        y: bbox.top + bbox.height / 2,
      },
      matchText: false,
      matchImages: true,
    });

    assert.strictEqual(result, null);
  });

  it("should use the last result if there's no result but we haven't moved far", () => {
    testDiv.append('abcdefあいうえお');
    const textNode = testDiv.firstChild as Text;

    // Fetch once
    const bboxJP = getBboxForOffset(textNode, 6);
    const result = getTextAtPoint({
      point: {
        x: bboxJP.left + 1,
        y: bboxJP.top + bboxJP.height / 2,
      },
    });
    assertTextResultEqual(result, 'あいうえお', [textNode, 6, 11]);

    // Fetch again
    const bboxEN = getBboxForOffset(textNode, 5);
    const secondResult = getTextAtPoint({
      point: {
        x: bboxJP.left - 1,
        y: bboxEN.top + bboxEN.height / 2,
      },
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
    const result = getTextAtPoint({
      point: {
        x: bboxJP.left + 1,
        y: bboxJP.top + bboxJP.height / 2,
      },
    });
    assertTextResultEqual(result, 'あいうえお', [textNode, 6, 11]);

    // Fetch again
    const bboxEN = getBboxForOffset(textNode, 0);
    const secondResult = getTextAtPoint({
      point: {
        x: bboxEN.left + bboxEN.width / 2,
        y: bboxEN.top + bboxEN.height / 2,
      },
    });
    assert.strictEqual(secondResult, null);
  });
});

function assertTextResultEqual(
  result: GetTextAtPointResult | null,
  text: string,
  ...ranges: Array<[Node, number, number]>
) {
  assert.isNotNull(result, 'Result should not be null');
  if (result === null) {
    return;
  }

  assert.strictEqual(result.text, text, 'Result text should match');

  // Title only case
  if (!ranges.length) {
    assert.isNull(result.textRange, 'textRange should be null');
    return;
  }

  assert.isNotNull(result.textRange, 'textRange should NOT be null');

  assert.strictEqual(
    result.textRange!.length,
    ranges.length,
    'number of ranges should match'
  );

  for (const [i, range] of ranges.entries()) {
    assert.strictEqual(
      result.textRange![i].node,
      range[0],
      `Range #${i}: node should match`
    );
    assert.strictEqual(
      result.textRange![i].start,
      range[1],
      `Range #${i}: start offset should match`
    );
    assert.strictEqual(
      result.textRange![i].end,
      range[2],
      `Range #${i}: end offset should match`
    );
  }

  // We want to check that a suitable Range object would produce the same text
  // but we don't create Range objects when the target is an <input> or
  // <textarea> node.
  if (
    result.textRange![0].node instanceof HTMLInputElement ||
    result.textRange![0].node instanceof HTMLTextAreaElement
  ) {
    return;
  }

  // Consistency check
  const range = new Range();
  range.setStart(result.textRange![0].node, result.textRange![0].start);
  const lastEndpoint = result.textRange![result.textRange!.length - 1];
  range.setEnd(lastEndpoint.node, lastEndpoint.end);

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
