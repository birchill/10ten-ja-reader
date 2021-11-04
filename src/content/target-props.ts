import { Rect } from '../utils/geometry';

import { isTextInputNode } from './dom-utils';
import { isGdocsLine } from './gdocs';
import { TextRange } from './text-range';

/// Properties about the target element from which we started lookup needed
/// so that we can correctly position the popup in a way that doesn't overlap
/// the element.
export type TargetProps = {
  fromPuck: boolean;
  hasTitle: boolean;
  isVerticalText: boolean;
  textBoxSizes?: SelectionSizes;
};

// A range of t-shirt sizes for the first part of the text selection.
//
// This is a bit awkward because in the iframe case it is the text-handling
// window that has access to the element needed to get bounding box sizes.
// However, it doesn't know how much of the text will be matched.
//
// We don't want to be doing IPC calls as part of the popup positioning so we
// just return a set of standard sizes and let the topmost window choose the
// best fit.
export type SelectionSizes = {
  4: Rect;
  8: Rect;
  12: Rect;
  16: Rect;
};

// Guaranteed to be arranged in ascending order
export const textBoxSizeLengths: ReadonlyArray<keyof SelectionSizes> = [
  4, 8, 12, 16,
];

export function getTargetProps({
  fromPuck,
  target,
  textRange,
}: {
  fromPuck: boolean;
  target: Element;
  textRange: TextRange | undefined;
}): TargetProps {
  return {
    fromPuck,
    hasTitle: !!((target as HTMLElement) || null)?.title,
    textBoxSizes: textRange
      ? getInitialBboxOfTextSelection(textRange)
      : undefined,
    isVerticalText: !!target.ownerDocument.defaultView
      ?.getComputedStyle(target)
      .writingMode.startsWith('vertical'),
  };
}

function getInitialBboxOfTextSelection(
  textRange: TextRange
): SelectionSizes | undefined {
  // Check we actually have some text selection available
  //
  // (We easily can't get the bbox of text selections in input elements
  // unfortunately.)
  if (!textRange.length || isTextInputNode(textRange[0].node)) {
    return undefined;
  }

  // TODO: Handle this
  if (isGdocsLine(textRange[0].node)) {
    return undefined;
  }

  const node = textRange[0].node;
  const range = node.ownerDocument!.createRange();
  range.setStart(node, textRange[0].start);

  let lastEnd = -1;
  let lastSize: Rect | undefined;

  const result: Partial<SelectionSizes> = {};
  for (const size of textBoxSizeLengths) {
    const end = Math.min(textRange[0].start + size, textRange[0].end);
    if (end <= lastEnd) {
      result[size] = lastSize!;
    } else {
      range.setEnd(node, end);
      result[size] = range.getClientRects()[0];

      lastEnd = end;
      lastSize = result[size];
    }
  }

  return result as SelectionSizes;
}

export function getBestFitSize({
  sizes,
  length,
}: {
  sizes: SelectionSizes;
  length: number;
}): Rect | undefined {
  // If the length is zero, it's probably best to say no size
  if (!length) {
    return undefined;
  }

  // Otherwise, find the first size that is _bigger_ than the provided length.
  // And if there is none, just choose the biggest size.
  const bestFitSize =
    textBoxSizeLengths.slice().find((len) => len > length) ||
    textBoxSizeLengths[textBoxSizeLengths.length - 1];

  return sizes[bestFitSize];
}
