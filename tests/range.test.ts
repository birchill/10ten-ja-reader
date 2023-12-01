import { assert } from 'chai';

import { getRangeForSingleCodepoint } from '../src/utils/range';

mocha.setup('bdd');

describe('getRangeForSingleCodepoint', () => {
  it('should handle non-BMP characters', () => {
    const source = new Text('𠏹沢');

    let range = getRangeForSingleCodepoint({ source, offset: 0 });
    assert.strictEqual(range.startOffset, 0);
    assert.strictEqual(range.endOffset, 2);

    range = getRangeForSingleCodepoint({ source, offset: 2 });
    assert.strictEqual(range.startOffset, 2);
    assert.strictEqual(range.endOffset, 3);

    range = getRangeForSingleCodepoint({
      source,
      offset: 2,
      direction: 'backwards',
    });
    assert.strictEqual(range.startOffset, 0);
    assert.strictEqual(range.endOffset, 2);

    // Mid-character skips to the next character... just because that's simpler
    // for now
    range = getRangeForSingleCodepoint({ source, offset: 1 });
    assert.strictEqual(range.startOffset, 2);
    assert.strictEqual(range.endOffset, 3);

    // Mid-character when it's the last character
    range = getRangeForSingleCodepoint({ source: new Text('𠏹'), offset: 1 });
    assert.strictEqual(range.startOffset, 0);
    assert.strictEqual(range.endOffset, 2);

    // Mid-character when it's the first character
    range = getRangeForSingleCodepoint({
      source: new Text('𠏹'),
      offset: 1,
      direction: 'backwards',
    });
    assert.strictEqual(range.startOffset, 0);
    assert.strictEqual(range.endOffset, 2);
  });

  it('should handle out of range offsets', () => {
    let range = getRangeForSingleCodepoint({ source: new Text(''), offset: 0 });
    assert.strictEqual(range.startOffset, 0);
    assert.strictEqual(range.endOffset, 0);

    range = getRangeForSingleCodepoint({ source: new Text(''), offset: -1 });
    assert.strictEqual(range.startOffset, 0);
    assert.strictEqual(range.endOffset, 0);

    range = getRangeForSingleCodepoint({ source: new Text(''), offset: 5 });
    assert.strictEqual(range.startOffset, 0);
    assert.strictEqual(range.endOffset, 0);

    range = getRangeForSingleCodepoint({ source: new Text('abc'), offset: 5 });
    assert.strictEqual(range.startOffset, 3);
    assert.strictEqual(range.endOffset, 3);
  });
});
