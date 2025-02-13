export type NodeRange = { node: Node; start: number; end: number };

export type TextRange = Array<NodeRange>;

export function textRangesEqual(
  a: TextRange | null | undefined,
  b: TextRange | null | undefined
): boolean {
  if (!a && !b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; ++i) {
    if (
      a[i].node !== b[i].node ||
      a[i].start !== b[i].start ||
      a[i].end !== b[i].end
    ) {
      return false;
    }
  }

  return true;
}
