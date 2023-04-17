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
  const codepoints = [...source.data];
  let codepointStart = 0;
  let lastCodepointLength = 0;
  while (codepointStart < offset && codepoints.length) {
    lastCodepointLength = codepoints.shift()!.length;
    codepointStart += lastCodepointLength;
  }

  const rangeStart =
    direction === 'forwards'
      ? codepointStart
      : codepointStart - lastCodepointLength;
  const rangeEnd =
    direction === 'forwards'
      ? rangeStart + (codepoints[0]?.length ?? 0)
      : codepointStart;

  const range = new Range();
  range.setStart(source, rangeStart);
  range.setEnd(source, rangeEnd);

  return range;
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
