import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  MAX_ALT_TITLE_JP_CONTEXT_LENGTH,
  MAX_NON_JP_PREFIX_LENGTH,
} from '../common/limits';
import { empty } from '../utils/dom-utils';

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
  let notoSansJp: FontFace | undefined;

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
    // This is also needed so that the webextension polyfill doesn't attempt to
    // polyfill the browser object.
    previousBrowserObject = globalThis.browser;
    globalThis.browser = {
      // <-- Put polyfills for any browser APIs we use in here
    };

    ({ getTextAtPoint, clearPreviousResult } = await import('./get-text'));

    // Make Noto Sans JP available so we have a consistent Japanese font even in
    // CI.
    notoSansJp = new FontFace('Noto Sans JP', 'url(/fonts/NotoSansJP.woff2)', {
      weight: '100 900',
      style: 'normal',
      display: 'block',
    });
    await notoSansJp.load();
    document.fonts.add(notoSansJp);
  });

  afterAll(() => {
    if (notoSansJp) {
      document.fonts.delete(notoSansJp);
      notoSansJp = undefined;
    }

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

  /* ------------------------------------------------------------------------
   *
   * Hit-testing and geometry
   *
   * ------------------------------------------------------------------------*/

  describe('hit-testing and geometry', () => {
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

    it("uses the last result if there's no result but we haven't moved far", () => {
      // Arrange
      testDiv.append('abcdefあいうえお');
      const textNode = testDiv.firstChild as Text;

      // Act
      // Fetch once
      const bboxJP = getBboxForOffset(textNode, 6);
      const result = getTextAtPoint({
        point: { x: bboxJP.left + 1, y: bboxJP.top + bboxJP.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('あいうえお', [textNode, 6, 11])
      );

      // Act
      // Fetch again
      const bboxEN = getBboxForOffset(textNode, 5);
      const secondResult = getTextAtPoint({
        point: { x: bboxJP.left - 1, y: bboxEN.top + bboxEN.height / 2 },
      });

      // Assert
      expect(secondResult).toBe(result);
    });

    it("does NOT use the last result if there's no result and we've moved far", () => {
      // Arrange
      testDiv.append('abcdefあいうえお');
      const textNode = testDiv.firstChild as Text;

      // Act
      // Fetch once
      const bboxJP = getBboxForOffset(textNode, 6);
      const result = getTextAtPoint({
        point: { x: bboxJP.left + 1, y: bboxJP.top + bboxJP.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('あいうえお', [textNode, 6, 11])
      );

      // Act
      // Fetch again
      const bboxEN = getBboxForOffset(textNode, 0);
      const secondResult = getTextAtPoint({
        point: {
          x: bboxEN.left + bboxEN.width / 2,
          y: bboxEN.top + bboxEN.height / 2,
        },
      });

      // Assert
      expect(secondResult).toBeNull();
    });
  });

  /* ------------------------------------------------------------------------
   *
   * Inline/block traversal
   *
   * ------------------------------------------------------------------------*/

  describe('inline/block traversal', () => {
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
  });

  /* ------------------------------------------------------------------------
   *
   * Visibility
   *
   * ------------------------------------------------------------------------*/

  describe('visibility', () => {
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

    it('skips text that is display:none', () => {
      // Arrange
      testDiv.innerHTML =
        '<div>履<span style="display: none">｛は｝</span>く</div>';
      const firstTextNode = testDiv.firstChild!.firstChild as Text;
      const bbox = getBboxForOffset(firstTextNode, 0);
      const lastTextNode = testDiv.firstChild!.lastChild as Text;

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('履く', [firstTextNode, 0, 1], [lastTextNode, 0, 1])
      );
    });
  });

  /* ------------------------------------------------------------------------
   *
   * Shadow DOM
   *
   * ------------------------------------------------------------------------*/

  describe('shadow DOM', () => {
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
  });

  /* ------------------------------------------------------------------------
   *
   * Ruby
   *
   * ------------------------------------------------------------------------*/

  describe('ruby', () => {
    it('skips content in ruby elements', () => {
      // Arrange
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

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint(
          '仙台の牧場です',
          [firstTextNode, 0, 1],
          [daiNode, 0, 1],
          [noNode, 0, 1],
          [bokuNode, 0, 1],
          [jouNode, 0, 1],
          [desuNode, 0, 2]
        )
      );
    });

    it('skips content in ruby transcriptions that have nested spans', () => {
      // Arrange
      testDiv.innerHTML =
        '<p><span>次々と</span><ruby>仕<rt><span>し</span></rt>掛<rt><span>か</span></rt></ruby><span>けられる。</span></p>';
      const shiNode = testDiv.firstChild!.childNodes[1].firstChild as Text;
      const kaNode = testDiv.firstChild!.childNodes[1].childNodes[2] as Text;
      const kerareruNode = testDiv.firstChild!.childNodes[2].firstChild as Text;
      const bbox = getBboxForOffset(shiNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint(
          '仕掛けられる',
          [shiNode, 0, 1],
          [kaNode, 0, 1],
          [kerareruNode, 0, 4]
        )
      );
    });

    it('returns the ruby base text when rb elements are used', () => {
      // Arrange
      testDiv.innerHTML =
        '<ruby><rb>振</rb><rp>(</rp><rt>ふ</rt><rp>)</rp>り<rb>仮</rb><rp>(</rp><rt>が</rt><rp>)</rp><rb>名</rb><rp>(</rp><rt>な</rt><rp>)</rp></ruby>';
      const fuNode = testDiv.firstChild!.firstChild!.firstChild as Text;
      const riNode = testDiv.firstChild!.childNodes[4] as Text;
      const gaNode = testDiv.firstChild!.childNodes[5].firstChild as Text;
      const naNode = testDiv.firstChild!.childNodes[9].firstChild as Text;
      const bbox = getBboxForOffset(fuNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint(
          '振り仮名',
          [fuNode, 0, 1],
          [riNode, 0, 1],
          [gaNode, 0, 1],
          [naNode, 0, 1]
        )
      );
    });

    it('returns the ruby base text even across different ruby elements', () => {
      // Arrange
      testDiv.innerHTML =
        '<ruby><rb>振</rb><rp>(</rp><rt>ふ</rt><rp>)</rp>り</ruby><ruby><rb>仮</rb><rp>(</rp><rt>が</rt><rp>)</rp><rb>名</rb><rp>(</rp><rt>な</rt><rp>)</rp></ruby>';
      const fuNode = testDiv.firstChild!.firstChild!.firstChild as Text;
      const riNode = testDiv.firstChild!.childNodes[4] as Text;
      const gaNode = testDiv.childNodes[1].firstChild!.firstChild as Text;
      const naNode = testDiv.childNodes[1].childNodes[4].firstChild as Text;
      const bbox = getBboxForOffset(fuNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint(
          '振り仮名',
          [fuNode, 0, 1],
          [riNode, 0, 1],
          [gaNode, 0, 1],
          [naNode, 0, 1]
        )
      );
    });

    it('returns the rt text if it is positioned over an rt element', () => {
      // Arrange
      testDiv.innerHTML = '<ruby>仙<rt>せん</rt>台<rt>だい</ruby>';
      const senNode = testDiv.firstChild!.childNodes[1].firstChild as Text;
      const daiNode = testDiv.firstChild!.childNodes[3].firstChild as Text;
      const bbox = getBboxForOffset(senNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 4 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('せんだい', [senNode, 0, 2], [daiNode, 0, 2])
      );
    });

    it('returns the rt text if it is positioned over a child of an rt element', () => {
      // Arrange
      testDiv.innerHTML = '<ruby>仙<rt><b>せ</b>ん</rt>台<rt>だい</ruby>';
      const seNode = testDiv.firstChild!.childNodes[1].firstChild!
        .firstChild as Text;
      const nNode = testDiv.firstChild!.childNodes[1].lastChild as Text;
      const daiNode = testDiv.firstChild!.childNodes[3].firstChild as Text;
      const bbox = getBboxForOffset(seNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 4 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('せんだい', [seNode, 0, 1], [nNode, 0, 1], [daiNode, 0, 2])
      );
    });

    it('returns the appropriate level of rt text for nested ruby', () => {
      // Arrange
      testDiv.innerHTML = `<ruby><ruby>牧<rt id=boku>ぼく</rt></ruby><rt>まき</rt></ruby
        ><ruby><ruby>場<rt id=jou>じょう</rt></ruby><rt>ば</rt></ruby>`;
      const bokuNode = testDiv.querySelector('#boku')!.firstChild as Text;
      const jouNode = testDiv.querySelector('#jou')!.firstChild as Text;
      const bbox = getBboxForOffset(bokuNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('ぼくじょう', [bokuNode, 0, 2], [jouNode, 0, 3])
      );
    });

    it('marks rt text as indivisible when scanning across ruby and non-ruby text', () => {
      // Arrange
      testDiv.innerHTML =
        '<ruby>牽制<rt>けんせい</rt></ruby>して<ruby>助<rt>たす</rt></ruby>けに';
      const firstRtNode = testDiv.firstChild!.childNodes[1].firstChild as Text;
      const bbox = getBboxForOffset(firstRtNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 4 },
      });

      // Assert
      expect(result?.text).toBe('けんせいしてたすけに');
      expect(result?.indivisibleRanges).toEqual([
        { start: 0, end: 4 },
        { start: 6, end: 8 },
      ]);
    });

    it('splits indivisible ranges at center dots in rt text', () => {
      // Arrange
      testDiv.innerHTML =
        '<ruby>最高経営責任者<rt>シー・イー・オー</rt></ruby>です';
      const rtNode = testDiv.firstChild!.childNodes[1].firstChild as Text;
      const bbox = getBboxForOffset(rtNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 4 },
      });

      // Assert
      expect(result?.text).toBe('シー・イー・オーです');
      expect(result?.indivisibleRanges).toEqual([
        { start: 0, end: 2 },
        { start: 3, end: 5 },
        { start: 6, end: 8 },
      ]);
    });

    it('traverses okurigana in inline-block elements too', () => {
      // Arrange

      // YouTube annotates okurigana inline-block spans.
      //
      // See https://github.com/birchill/10ten-ja-reader/issues/535
      testDiv.innerHTML =
        '<p><ruby><span>疲</span><rt>つか</rt></ruby><span style="display: inline-block">れた</span></p>';

      const kanjiNode = testDiv.firstChild!.firstChild!.firstChild!
        .firstChild as Text;
      const okuriganaNode = testDiv.firstChild!.childNodes[1]
        .firstChild as Text;
      const bbox = getBboxForOffset(kanjiNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('疲れた', [kanjiNode, 0, 1], [okuriganaNode, 0, 2])
      );
    });

    it('treats rb elements as inline regardless of their computed style', () => {
      // Arrange

      // Based on the markup in renshuu.org
      testDiv.innerHTML =
        '<div><ruby style="display:inline-table"><rb style="display:table-row-group"><span>引</span></rb><rt style="display:table-header-group">ひ</rt></ruby><ruby style="display:inline-table"><rb style="display:table-row-group">く</rb><rt style="display:table-header-group">&nbsp;</rt></ruby></div>';
      const hiNode = testDiv.firstChild!.firstChild!.firstChild!.firstChild!
        .firstChild as Text;
      const kuNode = testDiv.firstChild!.childNodes[1].firstChild!
        .firstChild as Text;
      const bbox = getBboxForOffset(hiNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('引く', [hiNode, 0, 1], [kuNode, 0, 1])
      );
    });

    it('parses base text from simulated mono ruby', () => {
      // Arrange

      // The key part here is the display: contents part
      testDiv.innerHTML =
        '<ruby style="display: inline-grid; grid-template-rows: [rt] auto [base] auto; justify-items: center; padding-top: .25rem; row-gap: .25rem"><span style="padding-left: .5rem; padding-right: .5rem; margin-left: -0.5rem; margin-right: -0.5rem; display: contents"><span>東</span><span>京</span></span><rt style="user-select: none; padding-top: .25rem; padding-bottom: .25rem; line-height: 1; font-size: .875rem; display: contents"><span style="grid-row: rt"><>とう</span></span><span style="grid-row: rt"><span>きょう</span></span></rt></ruby>';

      const tokyoStart = testDiv.querySelector('ruby > span > span')!
        .firstChild as Text;
      const tokyoNoKyo = testDiv.querySelector(
        'ruby > span > span:nth-child(2)'
      )!.firstChild as Text;
      const bbox = getBboxForOffset(tokyoStart, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('東京', [tokyoStart, 0, 1], [tokyoNoKyo, 0, 1])
      );
    });
  });

  /* ------------------------------------------------------------------------
   *
   * Input elements
   *
   * ------------------------------------------------------------------------*/

  describe('input elements', () => {
    it('finds text in input elements', () => {
      // Arrange
      testDiv.innerHTML = '<input type="text" value="あいうえお">';
      const inputNode = testDiv.firstChild as HTMLInputElement;

      makeMonospace(inputNode, 20);
      const bbox = inputNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + 20, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(textAtPoint('いうえお', [inputNode, 1, 5]));
    });

    it('finds text from the start of input elements', () => {
      // Arrange
      testDiv.innerHTML = '<input type="text" value="あいうえお">';
      const inputNode = testDiv.firstChild as HTMLInputElement;

      makeMonospace(inputNode, 20);
      const bbox = inputNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + 1, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('あいうえお', [inputNode, 0, 5])
      );
    });

    it('does NOT read beyond the bounds of the input element', () => {
      // Arrange
      testDiv.innerHTML = '<div><input type="text" value="あいう">えお</div>';
      const inputNode = testDiv.firstChild!.firstChild as HTMLInputElement;

      makeMonospace(inputNode, 20);
      const bbox = inputNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + 20, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(textAtPoint('いう', [inputNode, 1, 3]));
    });

    it('does NOT find text in input[type=password] elements', () => {
      // Arrange
      testDiv.innerHTML = '<input type="password" value="あいうえお">';
      const inputNode = testDiv.firstChild as HTMLInputElement;

      makeMonospace(inputNode, 20);
      const bbox = inputNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + 20, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toBeNull();
    });

    it('finds text in textarea elements', () => {
      // Arrange
      testDiv.innerHTML = '<textarea>あいうえお</textarea>';
      const textAreaNode = testDiv.firstChild as HTMLTextAreaElement;

      makeMonospace(textAreaNode, 20);
      const bbox = textAreaNode.getBoundingClientRect();
      const testPoint = { x: bbox.left + 30, y: bbox.top + 10 };

      // Add a dot to aid debugging
      using _ = new DebuggingDot(testPoint);

      // Act
      const result = getTextAtPoint({ point: testPoint });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('いうえお', [textAreaNode, 1, 5])
      );
    });

    it('does NOT report results in textarea elements when at the end', () => {
      // Arrange
      testDiv.innerHTML = '<textarea cols=80>あいうえお</textarea>';
      const textAreaNode = testDiv.firstChild as HTMLTextAreaElement;

      textAreaNode.style.padding = '0px';
      textAreaNode.style.fontSize = '20px';
      const bbox = textAreaNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({ point: { x: bbox.right - 10, y: 5 } });

      // Assert
      expect(result).toBeNull();
    });

    it('does NOT report results in textarea elements when the mouse is outside', () => {
      // Arrange
      testDiv.innerHTML = '<textarea cols=80>あいうえお</textarea>';
      const textAreaNode = testDiv.firstChild as HTMLTextAreaElement;

      // The display: block part is important here since it will cause
      // caretPositionFromPoint to return the element even if it doesn't overlap.
      //
      // This is is why the textarea on pastebin.com was broken.
      textAreaNode.style.display = 'block';
      textAreaNode.style.marginLeft = '100px';
      textAreaNode.style.fontSize = '20px';
      const bbox = textAreaNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({ point: { x: bbox.left - 50, y: 5 } });

      // Assert
      expect(result).toBeNull();
    });
  });

  /* ------------------------------------------------------------------------
   *
   * Title/alt attributes
   *
   * ------------------------------------------------------------------------*/

  describe('title/alt attributes', () => {
    it('pulls the text out of a title attribute', () => {
      // Arrange
      testDiv.innerHTML = '<img src="" title="あいうえお">';
      const imgNode = testDiv.firstChild as HTMLImageElement;
      imgNode.style.width = '200px';
      imgNode.style.height = '200px';
      const bbox = imgNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject({ text: 'あいうえお', textRange: null });
    });

    it('ignores a title attribute with no Japanese text', () => {
      // Arrange
      testDiv.innerHTML = '<img src="" title="Just some English text">';
      const imgNode = testDiv.firstChild as HTMLImageElement;
      imgNode.style.width = '200px';
      imgNode.style.height = '200px';
      const bbox = imgNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toBeNull();
    });

    it('trims long title attributes to a bounded length', () => {
      // Arrange
      const prefix = 'a'.repeat(MAX_NON_JP_PREFIX_LENGTH);
      const title =
        prefix + '日本語' + 'b'.repeat(MAX_ALT_TITLE_JP_CONTEXT_LENGTH + 200);
      testDiv.innerHTML = `<img src="" title="${title}">`;
      const imgNode = testDiv.firstChild as HTMLImageElement;
      imgNode.style.width = '200px';
      imgNode.style.height = '200px';
      const bbox = imgNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      const expected = title.slice(
        0,
        MAX_NON_JP_PREFIX_LENGTH + MAX_ALT_TITLE_JP_CONTEXT_LENGTH
      );
      expect(result).toMatchObject({ text: expected, textRange: null });
    });

    it('pulls the text out of a title attribute on an image even when matchText is false', () => {
      // Arrange
      testDiv.innerHTML = '<img src="" title="あいうえお">';
      const imgNode = testDiv.firstChild as HTMLImageElement;
      imgNode.style.width = '200px';
      imgNode.style.height = '200px';
      const bbox = imgNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
        matchText: false,
        matchImages: true,
      });

      // Assert
      expect(result).toMatchObject({ text: 'あいうえお', textRange: null });
    });

    it('does NOT pull the text out of a title attribute on a text node when matchText is false', () => {
      // Arrange
      testDiv.innerHTML = '<span title="あいうえお">Not Japanese text</span>';
      const span = testDiv.firstChild as HTMLSpanElement;
      const bbox = span.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
        matchText: false,
        matchImages: true,
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  /* ------------------------------------------------------------------------
   *
   * SVG
   *
   * ------------------------------------------------------------------------*/

  describe('SVG', () => {
    it('finds text in SVG content', function () {
      // Arrange
      testDiv.innerHTML = '<svg><text y="1em">あいうえお</text></svg>';
      const textNode = testDiv.firstChild!.firstChild!.firstChild as Text;
      const bbox = getBboxForOffset(textNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.right + 1, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(textAtPoint('いうえお', [textNode, 1, 5]));
    });

    it('finds text in nested SVG elements', () => {
      // Arrange
      testDiv.innerHTML =
        '<svg><text y="1em">あ<tspan><tspan id=inner-tspan>いう</tspan></tspan>え<a id=inner-a>お</a></text></svg>';
      const firstTextNode = testDiv.firstChild!.firstChild!.firstChild as Text;
      const innerTspan = testDiv.querySelector('#inner-tspan')!
        .firstChild as Text;
      const middleTextNode = testDiv.firstChild!.firstChild!
        .childNodes[2] as Text;
      const innerA = testDiv.querySelector('#inner-a')!.firstChild as Text;
      const bbox = getBboxForOffset(firstTextNode, 0);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + 1, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint(
          'あいうえお',
          [firstTextNode, 0, 1],
          [innerTspan, 0, 2],
          [middleTextNode, 0, 1],
          [innerA, 0, 1]
        )
      );
    });
  });

  /* ------------------------------------------------------------------------
   *
   * Japanese character selection boundaries
   *
   * ------------------------------------------------------------------------*/

  describe('Japanese character selection boundaries', () => {
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
  });

  /* ------------------------------------------------------------------------
   *
   * Max-length handling
   *
   * ------------------------------------------------------------------------*/

  describe('max-length handling', () => {
    it('stops at the maximum number of characters', () => {
      // Arrange
      testDiv.append('あいうえお');
      const textNode = testDiv.firstChild as Text;
      const bbox = getBboxForOffset(textNode, 1);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
        maxLength: 3,
      });

      // Assert
      expect(result).toMatchObject(textAtPoint('いうえ', [textNode, 1, 4]));
    });

    it('stops at the maximum number of characters even when navigating siblings', () => {
      // Arrange
      testDiv.innerHTML = 'あい<span>うえ</span>お';
      const firstTextNode = testDiv.firstChild as Text;
      const middleTextNode = testDiv.childNodes[1].firstChild as Text;
      const bbox = getBboxForOffset(firstTextNode, 1);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
        maxLength: 2,
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('いう', [firstTextNode, 1, 2], [middleTextNode, 0, 1])
      );
      expect(textFromRange(result!.textRange!)).toBe('いう');
    });

    it('stops at the maximum number of characters even when it lines up exactly with the end of a text node', () => {
      // Arrange
      testDiv.innerHTML = 'あい<span>うえ</span>お';
      const firstTextNode = testDiv.firstChild as Text;
      const middleTextNode = testDiv.childNodes[1].firstChild as Text;
      const bbox = getBboxForOffset(firstTextNode, 1);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
        maxLength: 3,
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('いうえ', [firstTextNode, 1, 2], [middleTextNode, 0, 2])
      );
      expect(textFromRange(result!.textRange!)).toBe('いうえ');
    });

    it('stops at the maximum number of characters even when it is zero', () => {
      // Arrange
      testDiv.append('あいうえお');
      const textNode = testDiv.firstChild as Text;
      const bbox = getBboxForOffset(textNode, 2);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
        maxLength: 0,
      });

      // Assert
      expect(result).toBeNull();
    });

    it('stops at the maximum number of characters if it comes before the end of the Japanese text', () => {
      // Arrange
      testDiv.append('あいうabc');
      const textNode = testDiv.firstChild as Text;
      const bbox = getBboxForOffset(textNode, 1);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
        maxLength: 1,
      });

      // Assert
      expect(result).toMatchObject(textAtPoint('い', [textNode, 1, 2]));
    });

    it('stops at the end of the Japanese text if it comes before the maximum number of characters', () => {
      // Arrange
      testDiv.append('あいうabc');
      const textNode = testDiv.firstChild as Text;
      const bbox = getBboxForOffset(textNode, 1);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
        maxLength: 3,
      });

      // Assert
      expect(result).toMatchObject(textAtPoint('いう', [textNode, 1, 3]));
    });
  });

  /* ------------------------------------------------------------------------
   *
   * Whitespace handling
   *
   * ------------------------------------------------------------------------*/

  describe('whitespace handling', () => {
    it('skips leading whitespace', () => {
      // Arrange
      testDiv.append('  　\tあいうえお');
      const textNode = testDiv.firstChild as Text;
      const bbox = getBboxForOffset(textNode, 1);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
        maxLength: 3,
      });

      // Assert
      expect(result).toMatchObject(textAtPoint('あいう', [textNode, 4, 7]));
    });

    it('skips empty nodes', () => {
      // Arrange
      testDiv.innerHTML = '<span></span>あい<span></span>うえお';
      const firstEmptyNode = testDiv.firstChild as HTMLSpanElement;
      const firstTextNode = testDiv.childNodes[1] as Text;
      const lastTextNode = testDiv.lastChild as Text;
      const bbox = firstEmptyNode.getBoundingClientRect();

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint('あいうえお', [firstTextNode, 0, 2], [lastTextNode, 0, 3])
      );
      expect(textFromRange(result!.textRange!)).toBe('あいうえお');
    });

    it('skips leading whitespace only nodes', () => {
      // Arrange
      testDiv.innerHTML = '<span>  　</span>　あい<span></span>うえお';
      const whitespaceOnlyTextNode = testDiv.firstChild!.firstChild as Text;
      const firstRealTextNode = testDiv.childNodes[1] as Text;
      const lastTextNode = testDiv.lastChild as Text;
      const bbox = getBboxForOffset(whitespaceOnlyTextNode, 1);

      // Act
      const result = getTextAtPoint({
        point: { x: bbox.right, y: bbox.top + bbox.height / 2 },
      });

      // Assert
      expect(result).toMatchObject(
        textAtPoint(
          'あいうえお',
          [firstRealTextNode, 1, 3],
          [lastTextNode, 0, 3]
        )
      );
      expect(textFromRange(result!.textRange!)).toBe('あいうえお');
    });
  });

  /* ------------------------------------------------------------------------
   *
   * Metadata
   *
   * ------------------------------------------------------------------------*/

  describe('metadata', () => {
    /* ------------------------------------------------------------------------
     *
     * Years/eras
     *
     * ------------------------------------------------------------------------*/

    describe('years/eras', () => {
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
        expect(result).toMatchObject(
          textAtPoint('昭和56年に', [textNode, 0, 6])
        );
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
        expect(result).toMatchObject(
          textAtPoint('昭和５６年に', [textNode, 0, 6])
        );
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
        expect(result).toMatchObject(
          textAtPoint('昭和５6年に', [textNode, 0, 6])
        );
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
        expect(result).toMatchObject(
          textAtPoint('昭和 56 年に', [textNode, 0, 8])
        );
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
          textAtPoint(
            '昭和  56年に',
            [firstTextNode, 0, 3],
            [middleTextNode, 0, 5]
          )
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
        expect(result).toMatchObject(
          textAtPoint('令和元年に', [textNode, 0, 5])
        );
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

    /* ------------------------------------------------------------------------
     *
     * Currency
     *
     * ------------------------------------------------------------------------*/

    describe('currency', () => {
      it('recognizes Japanese yen values', () => {
        // Arrange
        testDiv.append('価格8万8千円です');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 2);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(
          textAtPoint('8万8千円です', [textNode, 2, 9])
        );
        expect(result?.meta).toEqual({
          type: 'currency',
          value: 88_000,
          matchLen: 5,
        });
      });

      it('recognizes slightly odd Japanese yen values', () => {
        // Arrange
        testDiv.innerHTML = '<span>39,800</span><span>万円</span>';
        const firstTextNode = testDiv.firstChild!.firstChild as Text;
        const secondTextNode = testDiv.childNodes[1].firstChild as Text;
        const bbox = getBboxForOffset(firstTextNode, 0);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(
          textAtPoint(
            '39,800万円',
            [firstTextNode, 0, 6],
            [secondTextNode, 0, 2]
          )
        );
        expect(textFromRange(result!.textRange!)).toBe('39,800万円');
        expect(result?.meta).toEqual({
          type: 'currency',
          value: 398_000_000,
          matchLen: 8,
        });
      });

      it('recognizes Japanese yen values that start with ￥ (full-width)', () => {
        // Arrange
        testDiv.append('価格￥8万8千です');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 2);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(
          textAtPoint('￥8万8千です', [textNode, 2, 9])
        );
        expect(result?.meta).toEqual({
          type: 'currency',
          value: 88_000,
          matchLen: 5,
        });
      });

      it('recognizes Japanese yen values that start with ¥ (half-width)', () => {
        // Arrange
        testDiv.append('価格¥ 8万8千です');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 2);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(
          textAtPoint('¥ 8万8千です', [textNode, 2, 10])
        );
        expect(result?.meta).toEqual({
          type: 'currency',
          value: 88_000,
          matchLen: 6,
        });
      });

      it('recognizes Japanese yen values that start with ¥ in a separate span', () => {
        // Arrange
        testDiv.innerHTML = '<span>¥</span> 88,000です';
        const firstTextNode = testDiv.childNodes[0].firstChild as Text;
        const secondTextNode = testDiv.childNodes[1] as Text;
        const bbox = getBboxForOffset(firstTextNode, 0);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(
          textAtPoint(
            '¥ 88,000です',
            [firstTextNode, 0, 1],
            [secondTextNode, 0, 9]
          )
        );
        expect(textFromRange(result!.textRange!)).toBe('¥ 88,000です');
        expect(result?.meta).toEqual({
          type: 'currency',
          value: 88_000,
          matchLen: 8,
        });
      });

      it('recognizes Japanese yen values that include commas', () => {
        // Arrange
        testDiv.append('価格8,800円です');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 2);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(
          textAtPoint('8,800円です', [textNode, 2, 10])
        );
        expect(result?.meta).toEqual({
          type: 'currency',
          value: 8_800,
          matchLen: 6,
        });
      });

      it('recognizes Japanese yen values with metric suffixes', () => {
        // Arrange
        testDiv.append('1k 円 for 240 blank cards...');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 0);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(textAtPoint('1k 円 ', [textNode, 0, 5]));
        expect(result?.meta).toEqual({
          type: 'currency',
          value: 1_000,
          matchLen: 4,
        });
      });

      it("recognizes Japanese yen values with a 'yen' suffix", () => {
        // Arrange
        testDiv.append('100 yen');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 0);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(textAtPoint('100 yen', [textNode, 0, 7]));
        expect(result?.meta).toEqual({
          type: 'currency',
          value: 100,
          matchLen: 7,
        });
      });

      it("recognizes Japanese yen values with a 'JPY' prefix", () => {
        // Arrange
        testDiv.append('JPY 100');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 0);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(textAtPoint('JPY 100', [textNode, 0, 7]));
        expect(result?.meta).toEqual({
          type: 'currency',
          value: 100,
          matchLen: 7,
        });
      });
    });

    /* ------------------------------------------------------------------------
     *
     * Units
     *
     * ------------------------------------------------------------------------*/

    describe('units', () => {
      it('recognizes 畳 measurements', () => {
        // Arrange
        testDiv.append('面積：6畳です');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 3);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(textAtPoint('6畳です', [textNode, 3, 7]));
        expect(result?.meta).toEqual({
          type: 'measure',
          unit: '畳',
          value: 6,
          matchLen: 2,
        });
      });

      it('recognizes square metre measurements', () => {
        // Arrange
        testDiv.append('面積：4.5 m²です');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 3);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(
          textAtPoint('4.5 m²です', [textNode, 3, 11])
        );
        expect(result?.meta).toEqual({
          type: 'measure',
          unit: 'm2',
          value: 4.5,
          matchLen: 6,
        });
      });

      it('recognizes number values', () => {
        // Arrange
        testDiv.append('距離：8万8千キロメートル');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 3);

        // Act
        const result = getTextAtPoint({
          point: {
            x: bbox.left + bbox.width / 2,
            y: bbox.top + bbox.height / 2,
          },
        });

        // Assert
        expect(result).toMatchObject(
          textAtPoint('8万8千キロメートル', [textNode, 3, 13])
        );
        expect(result?.meta).toEqual({
          type: 'number',
          value: 88000,
          src: '8万8千',
          matchLen: 4,
        });
      });
    });

    /* ------------------------------------------------------------------------
     *
     * Shogi
     *
     * ------------------------------------------------------------------------*/

    describe('shogi', () => {
      it('recognizes shogi moves', () => {
        // Arrange
        const moves = ['☗８三銀', '８三銀', '8三銀', '☗83銀', '☗八三銀'];

        for (const move of moves) {
          empty(testDiv);
          clearPreviousResult();
          testDiv.append(`${move}です`);
          const textNode = testDiv.firstChild as Text;
          const bbox = getBboxForOffset(textNode, 0);

          // Act
          const result = getTextAtPoint({
            point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
          });

          // Assert
          expect(result?.meta, `move: ${move}`).toEqual({
            type: 'shogi',
            matchLen: move.length,
            side: move.startsWith('☗') ? 'black' : undefined,
            dest: [8, 3],
            piece: 's',
            movement: undefined,
            promotion: undefined,
          });
        }
      });

      it('does NOT recognize ambiguous shogi-like moves', () => {
        // Arrange
        testDiv.append('83銀です');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 0);

        // Act
        let result = getTextAtPoint({
          point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
        });

        // Assert
        expect(result?.meta).toBeUndefined();

        // Act
        // Try again with an all kanji match that should be treated as a number
        empty(testDiv);
        clearPreviousResult();
        testDiv.append('八三銀です');
        result = getTextAtPoint({
          point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
        });

        // Assert
        expect(result?.meta).toEqual({
          type: 'number',
          value: 83,
          src: '八三',
          matchLen: 2,
        });
      });

      it('recognizes shogi moves that use shorthand characters', () => {
        // Arrange
        testDiv.append('８三↑です');
        const textNode = testDiv.firstChild as Text;
        const bbox = getBboxForOffset(textNode, 0);

        // Act
        const result = getTextAtPoint({
          point: { x: bbox.left, y: bbox.top + bbox.height / 2 },
        });

        // Assert
        expect(result?.meta).toEqual({
          type: 'shogi',
          matchLen: 3,
          side: undefined,
          dest: [8, 3],
          piece: 'l',
          movement: undefined,
          promotion: undefined,
        });
      });
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

// We can't get glyph metrics for characters in text inputs (<input> or
// <textarea>) so we just set various CSS properties to try to ensure characters
// have a known width and spacing from which we can estimate positions.
function makeMonospace(elem: HTMLElement, advance: number) {
  elem.style.padding = '0px';
  elem.style.fontSize = `${advance}px`;
  elem.style.fontFamily = 'Noto Sans JP';
  elem.style.fontKerning = 'none';
  elem.style.fontVariantLigatures = 'none';
  elem.style.letterSpacing = `calc(${advance}px - 1ic)`;
}

class DebuggingDot {
  private element: HTMLDivElement;

  constructor(point: { x: number; y: number }) {
    const element = document.createElement('div');
    element.style.cssText = `
      position: absolute;
      left: ${point.x - 1}px;
      top: ${point.y - 1}px;
      width: 3px;
      height: 3px;
      background: red;
      pointer-events: none;
    `;
    document.body.appendChild(element);
    this.element = element;
  }

  [Symbol.dispose]() {
    this.element.remove();
  }
}
