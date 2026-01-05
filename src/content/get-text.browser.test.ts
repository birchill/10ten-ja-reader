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
  clearPreviousResult as clearPreviousResultFn,
  getTextAtPoint as getTextAtPointFn,
} from './get-text';
import type { TextRange } from './text-range';

describe('getTextAtPoint', () => {
  let testDiv: HTMLDivElement;

  let previousChromeObject: any;
  let getTextAtPoint: typeof getTextAtPointFn;
  let clearPreviousResult: typeof clearPreviousResultFn;

  beforeAll(async () => {
    // Make sure the browser polyfill believes we are in an extension context
    // XXX Typings for the following
    previousChromeObject = (globalThis as any).chrome;
    (globalThis as any).chrome = { runtime: { id: 'test' } };

    // XXX Once we get the above to work, we should do something similar for
    // globalThis.browser or else the polyfill will try to polyfill that part.

    ({ getTextAtPoint, clearPreviousResult } = await import('./get-text'));
  });

  afterAll(() => {
    // Clean up the polyfill
    (globalThis as any).chrome = previousChromeObject;
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

    // XXX Make up a short-hand custom matcher for this
    expect(result).toMatchObject({
      text: 'いうえお',
      textRange: [{ node: textNode, start: 1, end: 5 }] satisfies TextRange,
    });
    // XXX Restore the full functionality of below
    // assertTextResultEqual(result, 'いうえお', [textNode, 1, 5]);
  });
});

/*
function assertTextResultEqual(
  result: GetTextAtPointResult | null,
  text: string,
  ...ranges: Array<[Node, number, number]>
) {
  assert.isNotNull(result, 'Result should not be null');
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
*/

function getBboxForOffset(node: Node, start: number) {
  const range = new Range();
  range.setStart(node, start);
  range.setEnd(node, start + 1);
  return range.getBoundingClientRect();
}
