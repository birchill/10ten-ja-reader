import { describe, expect, it } from 'vitest';

import { getRangeForSingleCodepoint } from './range';

describe('getRangeForSingleCodepoint', () => {
  describe('non-BMP characters', () => {
    const source = new Text('𠏹沢');

    it('handles the first non-BMP character', () => {
      const range = getRangeForSingleCodepoint({ source, offset: 0 });
      expect(range.startOffset).toBe(0);
      expect(range.endOffset).toBe(2);
    });

    it('handles the following BMP character', () => {
      const range = getRangeForSingleCodepoint({ source, offset: 2 });
      expect(range.startOffset).toBe(2);
      expect(range.endOffset).toBe(3);
    });

    it('handles a backwards lookup at a BMP character', () => {
      const range = getRangeForSingleCodepoint({
        source,
        offset: 2,
        direction: 'backwards',
      });
      expect(range.startOffset).toBe(0);
      expect(range.endOffset).toBe(2);
    });

    it('handles mid-character offsets by advancing', () => {
      const range = getRangeForSingleCodepoint({ source, offset: 1 });
      expect(range.startOffset).toBe(2);
      expect(range.endOffset).toBe(3);
    });

    it('handles mid-character offsets on the last character', () => {
      const range = getRangeForSingleCodepoint({
        source: new Text('𠏹'),
        offset: 1,
      });
      expect(range.startOffset).toBe(0);
      expect(range.endOffset).toBe(2);
    });

    it('handles mid-character offsets on the first character going backwards', () => {
      const range = getRangeForSingleCodepoint({
        source: new Text('𠏹'),
        offset: 1,
        direction: 'backwards',
      });
      expect(range.startOffset).toBe(0);
      expect(range.endOffset).toBe(2);
    });
  });

  describe('out of range offsets', () => {
    it('handles offset 0 on an empty text node', () => {
      const range = getRangeForSingleCodepoint({
        source: new Text(''),
        offset: 0,
      });
      expect(range.startOffset).toBe(0);
      expect(range.endOffset).toBe(0);
    });

    it('handles negative offsets on an empty text node', () => {
      const range = getRangeForSingleCodepoint({
        source: new Text(''),
        offset: -1,
      });
      expect(range.startOffset).toBe(0);
      expect(range.endOffset).toBe(0);
    });

    it('handles offsets past the end on an empty text node', () => {
      const range = getRangeForSingleCodepoint({
        source: new Text(''),
        offset: 5,
      });
      expect(range.startOffset).toBe(0);
      expect(range.endOffset).toBe(0);
    });

    it('handles offsets past the end on a non-empty text node', () => {
      const range = getRangeForSingleCodepoint({
        source: new Text('abc'),
        offset: 5,
      });
      expect(range.startOffset).toBe(3);
      expect(range.endOffset).toBe(3);
    });
  });
});
