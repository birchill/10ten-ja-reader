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

  it('finds Plex subtitle content', () => {
    // Arrange
    //
    // This doesn't actually properly test Plex subtitle content. In particular,
    // it doesn't seem to accurately recreate the situation where
    // document.createPositionFromPoint() fails to pick up `pointer-events:
    // none` content which is what we observe on the real content. I don't know
    // why (something to do with abspos?) but it at least covers the hiding of
    // the overlay element.
    testDiv.innerHTML = `
<style>
.libjass-subs {
  line-height: 0;
}
.libjass-subs, .libjass-subs * {
  -webkit-animation-fill-mode: both !important;
  animation-fill-mode: both !important;
  pointer-events: none;
}
.libjass-subs {
  overflow: hidden;
}
</style>
<div class="PlayerContainer-container-DtCwJl">
  <div class="Player-fullPlayerContainer-wBDz23">
    <div class="Subtitles-measure-fffGGG">
      <div
        class="Subtitles-renderer-f7uT59 libjass-wrapper"
        id="id-132"
        role="alert"
      >
        <div
          class="libjass-subs paused"
          style="width: 1430px; height: 1013.33px; left: 0px; top: 0px"
        >
          <div class="layer layer0">
            <div class="an an2">
              <div
                style="margin: 35.185px 37.24px; min-width: 1355.52px"
                data-dialogue-id="2-69"
              >
                <span style="display: inline-block"
                  ><span id="testnode" style="font: 48.953px / 56.296px 'Arial', Arial, Helvetica, sans-serif, 'Segoe UI Symbol'; letter-spacing: 0px; opacity: 1; color: rgb(255, 255, 255);">情けなさすぎるわよ</span
                  ></span
                >
              </div>
            </div>
          </div>
        </div>
        <div class="libjass-font-measure" style="font-family: 'Arial', Arial, Helvetica, sans-serif, 'Segoe UI Symbol'; font-size: 360px;">M</div>
      </div>
    </div>
    <div
      class="PlayPauseOverlay-overlay-lF71cy PlayPauseOverlay-hiddenCursor-GpErBJ"
      style="cursor: none; display: block; height: 100%; left: 0; position: absolute; top: 0; width: 100%"
    ></div>
  </div>
</div>`;

    const textNode = testDiv.querySelector('#testnode')!.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint('情けなさすぎるわよ', [textNode, 0, 9])
    );
  });

  it('reads shadow DOM content', () => {
    // Arrange

    // Often custom elements are set to display: contents so we set that here
    const container = document.createElement('div');
    container.style.display = 'contents';
    container.attachShadow({ mode: 'open' });
    testDiv.append(container);

    container.shadowRoot!.innerHTML = '<div>テスト</div>';

    const textNode = container.shadowRoot!.firstElementChild!
      .firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('テスト', [textNode, 0, 3]));
  });

  it('reads nested shadow DOM content', () => {
    // Arrange
    const outerContainer = document.createElement('div');
    testDiv.append(outerContainer);
    const outerShadowRoot = outerContainer.attachShadow({ mode: 'open' });

    const innerContainer = document.createElement('div');
    outerShadowRoot.append(innerContainer);
    const innerShadowRoot = innerContainer.attachShadow({ mode: 'open' });

    // Add some styles to ensure that we actually copy the styles
    const styleElem = document.createElement('style');
    styleElem.append(`
      sup {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        vertical-align: top;
        top: -1px;
        margin: 0px 2px;
        min-width: 14px;
        height: 14px;
        border-radius: 3px;
        text-decoration-color: transparent;
        outline: transparent solid 1px;
      }
    `);
    innerShadowRoot.append(styleElem);

    // ... and HTML markup
    const innerElem = document.createElement('div');
    innerShadowRoot.append(innerElem);
    innerElem.innerHTML =
      '<div><div><p><a>今日の天気は曇り、23度です。</a><a href="https://bing.com/search?q=%E4%BB%8A%E6%97%A5%E3%81%AE%E3%81%8A%E5%A4%A9%E6%B0%97" target="_blank"><sup>1</sup></a><a>今日の最高気温は23.49度、最低気温は17.99度です。</a><a href="https://bing.com/search?q=%E4%BB%8A%E6%97%A5%E3%81%AE%E3%81%8A%E5%A4%A9%E6%B0%97" target="_blank"><sup>1</sup></a><a>降水確率は0%です。</a><a href="https://bing.com/search?q=%E4%BB%8A%E6%97%A5%E3%81%AE%E3%81%8A%E5%A4%A9%E6%B0%97" target="_blank"><sup>1</sup></a><a class="target">明日は晴れ、最高気温は23.93度、最低気温は13.13度です。</a></p></div></div>';

    const textNode = innerShadowRoot.querySelector('.target')!
      .firstChild as Text;
    const bbox = getBboxForOffset(textNode, 3);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('晴れ', [textNode, 3, 5]));
  });

  it('ignores non-Japanese characters', () => {
    // Arrange
    testDiv.append('あいabc');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('あい', [textNode, 0, 2]));
  });

  it('ignores non-Japanese characters when starting mid-node', () => {
    // Arrange
    testDiv.append('abcあいdef');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 3);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('あい', [textNode, 3, 5]));
  });

  it('ignores non-Japanese characters even if the first character is such', () => {
    // Arrange
    testDiv.append('abcあい');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 2);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toBeNull();
  });

  it('stops at full-width delimiters', () => {
    // Arrange
    testDiv.append('あい。');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('あい', [textNode, 0, 2]));
  });

  it('includes halfwidth katakana, rare kanji, compatibility kanji etc.', () => {
    // Arrange
    testDiv.append('ｷﾞﾝｺｳ㘆豈');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('ｷﾞﾝｺｳ㘆豈', [textNode, 0, 7]));
  });

  it('includes zero-width non-joiner characters', () => {
    // Arrange
    testDiv.append('あ\u200cい\u200cう\u200c。');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint('あ\u200cい\u200cう\u200c', [textNode, 0, 6])
    );
  });

  it('includes trailing half-width numerals', () => {
    // Arrange
    testDiv.append('小1。');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('小1', [textNode, 0, 2]));
  });

  it('includes the year when recognizing years', () => {
    // Arrange
    testDiv.append('昭和56年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('昭和56年に', [textNode, 0, 6]));
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 56,
      month: undefined,
      day: undefined,
      matchLen: 5,
    });
  });

  it('includes the year when recognizing years (full-width)', () => {
    // Arrange
    testDiv.append('昭和５６年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('昭和５６年に', [textNode, 0, 6]));
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 56,
      month: undefined,
      day: undefined,
      matchLen: 5,
    });
  });

  it('includes the year when recognizing years (mixed full-width and half-width)', () => {
    // Arrange
    testDiv.append('昭和５6年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('昭和５6年に', [textNode, 0, 6]));
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 56,
      month: undefined,
      day: undefined,
      matchLen: 5,
    });
  });

  it('includes the year when recognizing years and there are spaces', () => {
    // Arrange
    // Some publishers like to put spaces around stuffs
    testDiv.append('昭和 56 年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('昭和 56 年に', [textNode, 0, 8]));
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 56,
      month: undefined,
      day: undefined,
      matchLen: 7,
    });
  });

  it('includes the year when recognizing years and there is no 年', () => {
    // Arrange
    // Who knows, someone might try this...
    testDiv.append('昭和56に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('昭和56に', [textNode, 0, 5]));
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 56,
      month: undefined,
      day: undefined,
      matchLen: 4,
    });
  });

  it('includes the year when recognizing years and the numbers are in a separate span', () => {
    // Arrange
    testDiv.innerHTML = '昭和<span>56</span>年に';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const lastTextNode = testDiv.childNodes[2] as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint(
        '昭和56年に',
        [firstTextNode, 0, 2],
        [middleTextNode, 0, 2],
        [lastTextNode, 0, 2]
      )
    );
    expect(textFromRange(result!.textRange!)).toBe('昭和56年に');
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 56,
      month: undefined,
      day: undefined,
      matchLen: 5,
    });
  });

  it('includes the year when recognizing years and the numbers are in a separate span and there is whitespace too', () => {
    // Arrange
    testDiv.innerHTML = '昭和 <span> 56年に</span>';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint('昭和  56年に', [firstTextNode, 0, 3], [middleTextNode, 0, 5])
    );
    expect(textFromRange(result!.textRange!)).toBe('昭和  56年に');
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 56,
      month: undefined,
      day: undefined,
      matchLen: 7,
    });
  });

  it('includes the year when recognizing years and era description finishes exactly at the end of a span', () => {
    // Arrange
    testDiv.innerHTML = '昭和<span>56年</span>に';
    const firstTextNode = testDiv.firstChild as Text;
    const middleTextNode = testDiv.childNodes[1].firstChild as Text;
    const finalTextNode = testDiv.lastChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint(
        '昭和56年に',
        [firstTextNode, 0, 2],
        [middleTextNode, 0, 3],
        [finalTextNode, 0, 1]
      )
    );
    expect(textFromRange(result!.textRange!)).toBe('昭和56年に');
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 56,
      month: undefined,
      day: undefined,
      matchLen: 5,
    });
  });

  it('recognizes 元年 after an era name', () => {
    // Arrange
    testDiv.append('令和元年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(textAtPoint('令和元年に', [textNode, 0, 5]));
    expect(result?.meta).toEqual({
      type: 'era',
      era: '令和',
      reading: 'れいわ',
      year: 0,
      month: undefined,
      day: undefined,
      matchLen: 4,
    });
  });

  it('recognizes 元年 after an era name even with interleaving whitespace and spans', () => {
    // Arrange
    testDiv.innerHTML = '昭和　<span>元年</span>';
    const firstTextNode = testDiv.firstChild as Text;
    const spanTextNode = testDiv.childNodes[1].firstChild as Text;
    const bbox = getBboxForOffset(firstTextNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint('昭和　元年', [firstTextNode, 0, 3], [spanTextNode, 0, 2])
    );
    expect(textFromRange(result!.textRange!)).toBe('昭和　元年');
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 0,
      month: undefined,
      day: undefined,
      matchLen: 5,
    });
  });

  it('recognizes kanji year numbers when recognizing years', () => {
    // Arrange
    testDiv.append('昭和五十六年に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint('昭和五十六年に', [textNode, 0, 7])
    );
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 56,
      month: undefined,
      day: undefined,
      matchLen: 6,
    });
  });

  it('stops at delimiters (even when matching years)', () => {
    // Arrange
    testDiv.append('昭和三大馬鹿査定」発言に');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 0);

    // Act
    const result = getTextAtPoint({
      point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
    });

    // Assert
    expect(result).toMatchObject(
      textAtPoint('昭和三大馬鹿査定', [textNode, 0, 8])
    );
    expect(result?.meta).toEqual({
      type: 'era',
      era: '昭和',
      reading: 'しょうわ',
      year: 3,
      month: undefined,
      day: undefined,
      matchLen: 3,
    });
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
