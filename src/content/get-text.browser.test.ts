import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import type {
  GetTextAtPointResult,
  clearPreviousResult as clearPreviousResultFn,
  getTextAtPoint as getTextAtPointFn,
} from './get-text';
import type { TextRange } from './text-range';

declare global {
  var browser: any;
  var chrome: any;
}

describe('getTextAtPoint', () => {
  let testDiv: HTMLDivElement;

  let previousChromeObject: any;
  let previousBrowserObject: any;

  let getTextAtPoint: typeof getTextAtPointFn;
  let clearPreviousResult: typeof clearPreviousResultFn;

  beforeAll(async () => {
    // Make sure the webextension polyfill believes we are in an extension
    // context.
    previousChromeObject = globalThis.chrome;
    globalThis.chrome = { runtime: { id: 'test' } };

    // Polyfill any browser APIs we use.
    //
    // This is also needed so that the webextension polyfill desn't attempt to
    // polyfill the browser object.
    previousBrowserObject = globalThis.browser;
    globalThis.browser = {
      // <-- Put polyfills for any browser APIs we use in here
    };

    ({ getTextAtPoint, clearPreviousResult } = await import('./get-text'));
  });

  afterAll(() => {
    globalThis.browser = previousBrowserObject;
    globalThis.chrome = previousChromeObject;
  });

  beforeEach(async () => {
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

  it('finds a range in a div', () => {
    // Arrange
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('いうえお', [textNode, 1, 5]));
  });

  it('finds a range in a div when the point is part-way through a character', () => {
    // Arrange
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      // Add a little extra to make sure we're testing the behavior when we're
      // in the second half of the character.
      point: {
        x: bbox.left + bbox.width / 2 + 2,
        y: bbox.top + bbox.height / 2,
      },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('あいうえお', [textNode, 0, 5]));
  });

  it('does NOT find a range in a div when the point is a long way away (but caretPositionFromPoint lands us in the wrong place)', () => {
    // Arrange

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
    expect(document.elementFromPoint(pointToTest.x, pointToTest.y)).toBe(
      testDiv
    );

    // Act
    const result = getTextAtPoint({ point: pointToTest });

    // Assert
    expect(result).toBeNull();
  });

  it('does NOT find a range in a div when the point is a long way away due to line wrapping', () => {
    // Arrange
    testDiv.style.width = '300px';
    testDiv.style.paddingRight = '100px';
    testDiv.style.boxSizing = 'border-box';
    testDiv.textContent =
      '何故かと云うとこの二三年京都には地震とか辻風とか火事とか饑饉とか云う災いがつづいて起こったそこで洛中のさびれ方は一通りでない旧記によると仏像や';

    const bbox = testDiv.getBoundingClientRect();
    const pointToTest = { x: 305, y: bbox.top + 5 };

    // Act
    const result = getTextAtPoint({ point: pointToTest });

    // Assert
    expect(result).toBeNull();
  });

  it('finds text in an inline sibling', () => {
    // Arrange
    testDiv.innerHTML = 'あい<span>うえ</span>お';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const lastTextNode = testDiv.lastChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 1);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint(
        'いうえお',
        [firstTextNode, 1, 2],
        [middleTextNode, 0, 2],
        [lastTextNode, 0, 1]
      )
    );
    expect(textFromRange(result!.textRange!)).toBe('いうえお');
  });

  it('does NOT find text in a block sibling', () => {
    // Arrange
    testDiv.innerHTML = 'あい<div>うえ</div>お';
    const firstTextNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 1);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('い', [firstTextNode, 1, 2]));
  });

  it('finds text in a block sibling if we only have one character', () => {
    // Arrange

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

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result?.text.replace(/\s/g, '')).toBe('一生懸命');
  });

  it('finds text in a block cousin if the grandparent is inline-block', () => {
    // Arrange

    // Based on https://www.kanshudo.com/grammar/%E3%81%AA%E3%81%84%E3%81%A7%E3%83%BB%E3%81%AA%E3%81%8F%E3%81%A6%E3%83%BB%E3%81%9A%E3%81%AB
    testDiv.innerHTML =
      '<a><span style="display: inline-block"><div>あら</div><div>洗</div></span>わないで</a>';

    const baseTextNode = testDiv.firstElementChild?.firstElementChild
      ?.children[1]?.firstChild as Text;
    const bbox = getBboxForOffset(baseTextNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result?.text).toBe('洗わないで');
  });

  it('finds text in a cousin for an inline node', () => {
    // Arrange
    testDiv.innerHTML =
      '<span><span>あい</span></span>う<span>え<span>お</span></span>';
    const firstTextNode = testDiv.firstChild!.firstChild!.firstChild as Text;
    const secondTextNode = testDiv.childNodes[1] as Text;
    const thirdTextNode = testDiv.lastChild!.firstChild as Text;
    const lastTextNode = testDiv.lastChild!.lastChild!.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint(
        'あいうえお',
        [firstTextNode, 0, 2],
        [secondTextNode, 0, 1],
        [thirdTextNode, 0, 1],
        [lastTextNode, 0, 1]
      )
    );
    expect(textFromRange(result!.textRange!)).toBe('あいうえお');
  });

  it('moves onto the next node if we are at the end of the current one', () => {
    // Arrange
    testDiv.innerHTML = '<span>あい</span><span>うえお</span>';
    const firstTextNode = testDiv.firstChild!.firstChild as Text;
    const lastTextNode = testDiv.lastChild!.firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 1);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.right + 0.5, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('うえお', [lastTextNode, 0, 3]));
  });

  it('digs into the content behind covering links hidden with geometry', () => {
    // Arrange
    // The following is based very heavily on the structure of article previews
    // in asahi.com as of 2021-05-22.
    testDiv.innerHTML =
      '<div><a href="/articles/" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; z-index: 1"><span aria-hidden="true" style="display: block; width: 1px; height: 1px; overflow: hidden">あいうえお</span></a><div><div style="position: relative; width: 100%"><h2 style="z-index: auto"><a href="/articles/" id="innerLink">あいうえお</a></h2></div></div>';

    const textNode = testDiv.querySelector('#innerLink')!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('いうえお', [textNode, 1, 5]));
  });

  it('digs into the content behind covering links hidden with opacity', () => {
    // Arrange

    // The following is based on the structure of article previews from
    // nikkei.com
    testDiv.innerHTML =
      '<a href="/articles/" style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; overflow: hidden; opacity: 0">オーバーレイ</a><div style="padding-left: 20px"><h2 style="width: 100%"><a href="/articles/"><span id="innerSpan">あいうえお</span></a></h2></div>';

    const textNode = testDiv.querySelector('#innerSpan')!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('いうえお', [textNode, 1, 5]));
  });

  it('finds text in user-select: all content', () => {
    // Arrange
    testDiv.innerHTML = '<span style="user-select: all">あいうえお</span>';
    const textNode = testDiv.firstChild!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('いうえお', [textNode, 1, 5]));
  });

  it('finds text in user-select: none content', () => {
    // Arrange
    testDiv.innerHTML = '<span style="user-select: none">あいうえお</span>';
    const textNode = testDiv.firstChild!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('いうえお', [textNode, 1, 5]));
  });
});

function textAtPoint(
  text: string,
  ...ranges: Array<[Node, number, number]>
): Pick<GetTextAtPointResult, 'text' | 'textRange'> {
  return { text, textRange: textRange(...ranges) };
}

function textRange(...ranges: Array<[Node, number, number]>): TextRange {
  return ranges.map(([node, start, end]) => ({ node, start, end }));
}

function textFromRange(textRange: TextRange): string {
  const range = new Range();
  range.setStart(textRange[0].node, textRange[0].start);

  const lastEndpoint = textRange.at(-1)!;
  range.setEnd(lastEndpoint.node, lastEndpoint.end);

  return range.toString();
}

function getBboxForOffset(node: Node, start: number) {
  const range = new Range();
  range.setStart(node, start);
  range.setEnd(node, start + 1);
  return range.getBoundingClientRect();
}
