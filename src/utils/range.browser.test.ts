import { describe, expect, it } from 'vitest';

import { getRangeForSingleCodepoint } from './range';

describe('getRangeForSingleCodepoint', () => {
  it('should handle non-BMP characters', () => {
    const source = new Text('𠏹沢');

    let range = getRangeForSingleCodepoint({ source, offset: 0 });
    expect(range.startOffset).toBe(0);
    expect(range.endOffset).toBe(2);

    range = getRangeForSingleCodepoint({ source, offset: 2 });
    expect(range.startOffset).toBe(2);
    expect(range.endOffset).toBe(3);

    range = getRangeForSingleCodepoint({
      source,
      offset: 2,
      direction: 'backwards',
    });
    expect(range.startOffset).toBe(0);
    expect(range.endOffset).toBe(2);

    // Mid-character skips to the next character... just because that's simpler
    // for now
    range = getRangeForSingleCodepoint({ source, offset: 1 });
    expect(range.startOffset).toBe(2);
    expect(range.endOffset).toBe(3);

    // Mid-character when it's the last character
    range = getRangeForSingleCodepoint({ source: new Text('𠏹'), offset: 1 });
    expect(range.startOffset).toBe(0);
    expect(range.endOffset).toBe(2);

    // Mid-character when it's the first character
    range = getRangeForSingleCodepoint({
      source: new Text('𠏹'),
      offset: 1,
      direction: 'backwards',
    });
    expect(range.startOffset).toBe(0);
    expect(range.endOffset).toBe(2);
  });

  it('should handle out of range offsets', () => {
    let range = getRangeForSingleCodepoint({ source: new Text(''), offset: 0 });
    expect(range.startOffset).toBe(0);
    expect(range.endOffset).toBe(0);

    range = getRangeForSingleCodepoint({ source: new Text(''), offset: -1 });
    expect(range.startOffset).toBe(0);
    expect(range.endOffset).toBe(0);

    range = getRangeForSingleCodepoint({ source: new Text(''), offset: 5 });
    expect(range.startOffset).toBe(0);
    expect(range.endOffset).toBe(0);

    range = getRangeForSingleCodepoint({ source: new Text('abc'), offset: 5 });
    expect(range.startOffset).toBe(3);
    expect(range.endOffset).toBe(3);
  });
});
