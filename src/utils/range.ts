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
