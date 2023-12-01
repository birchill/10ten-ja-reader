/**
 * Gets a Range for a single codepoint given a character offset and optional
 * direction.
 */
export function getRangeForSingleCodepoint({
  source,
  offset,
  direction = 'forwards',
}: {
  source: Text;
  offset: number;
  direction?: 'forwards' | 'backwards';
}): Range {
  // Adjust the offset if it's in the middle of a surrogate pair.
  if (
    direction === 'forwards' &&
    offset < source.data.length &&
    isLowSurrogate(source.data.charCodeAt(offset))
  ) {
    if (offset < source.data.length - 1) {
      offset++;
    } else {
      offset--;
    }
  } else if (
    direction === 'backwards' &&
    offset > 0 &&
    isHighSurrogate(source.data.charCodeAt(offset - 1))
  ) {
    offset++;
  }

  let end: number;
  if (direction === 'forwards') {
    // If the offset is at the start of a surrogate pair, we need to include
    // the low surrogate as well.
    if (offset >= source.data.length) {
      end = offset;
    } else if (isHighSurrogate(source.data.charCodeAt(offset))) {
      end = offset + 2;
    } else {
      end = offset + 1;
    }
  } else {
    if (offset <= 0) {
      end = offset;
    } else if (isLowSurrogate(source.data.charCodeAt(offset - 1))) {
      end = offset - 2;
    } else {
      end = offset - 1;
    }
  }

  const range = new Range();
  range.setStart(
    source,
    Math.max(Math.min(offset, end, source.data.length), 0)
  );
  range.setEnd(source, Math.min(Math.max(offset, end, 0), source.data.length));

  return range;
}

function isLowSurrogate(codepoint: number): boolean {
  return codepoint >= 0xdc00 && codepoint <= 0xdfff;
}

function isHighSurrogate(codepoint: number): boolean {
  return codepoint >= 0xd800 && codepoint <= 0xdbff;
}

export function getBboxForSingleCodepointRange(
  range: Range
): DOMRect | undefined {
  // In Safari when a range is at the start of a line, getClientRects()
  // returns two bounding boxes: an empty (zero-width) one at the end of the
  // line and a non-empty one for the first character at the start of the line.
  //
  // Worse still, getBoundingClientRect() returns the union of the two producing
  // a massive (and very wrong) bounding box.
  //
  // Here we get the individual client rects and then return the widest one.
  return [...range.getClientRects()].reduce<DOMRect | undefined>(
    (result, bbox) => ((result?.width || 0) >= bbox.width ? result : bbox),
    undefined
  );
}
