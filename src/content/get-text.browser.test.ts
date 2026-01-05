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

  it('should find a range in a div', () => {
    testDiv.append('あいうえお');
    const textNode = testDiv.firstChild as Text;
    const bbox = getBboxForOffset(textNode, 1);

    const result = getTextAtPoint({
      point: { x: bbox.left + bbox.width / 2, y: bbox.top + bbox.height / 2 },
    });

    expect(result).toMatchObject(textAtPoint('いうえお', [textNode, 1, 5]));
    expect(textFromRange(result!.textRange!)).toBe('いうえお');
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

    expect(result).toMatchObject(textAtPoint('あいうえお', [textNode, 0, 5]));
    expect(textFromRange(result!.textRange!)).toBe('あいうえお');
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
    expect(document.elementFromPoint(pointToTest.x, pointToTest.y)).toBe(
      testDiv
    );

    const result = getTextAtPoint({ point: pointToTest });

    expect(result).toBeNull();
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
