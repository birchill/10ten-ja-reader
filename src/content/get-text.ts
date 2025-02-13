import { Point, bboxIncludesPoint } from '../utils/geometry';
import {
  getBboxForSingleCodepointRange,
  getRangeForSingleCodepoint,
} from '../utils/range';

import { getContentType } from './content-type';
import { getTextFromAnnotatedCanvas } from './gdocs-canvas';
import {
  CursorPosition,
  getCursorPosition,
  isGdocsOverlayPosition,
  isTextInputPosition,
  isTextNodePosition,
} from './get-cursor-position';
import { SelectionMeta } from './meta';
import { scanText } from './scan-text';
import { TextRange } from './text-range';

export type GetTextAtPointResult = {
  text: string;
  // Contains the set of nodes and their ranges where text was found.
  // This will be null if, for example, the result is the text from an element's
  // title attribute.
  textRange: TextRange | null;
  // Extra metadata we parsed in the process
  meta?: SelectionMeta;
};

// Cache of previous result (since often the mouse position will change but
// the cursor position will not).
let previousResult:
  | {
      point: Point;
      position: CursorPosition | undefined;
      result: GetTextAtPointResult;
      firstCharBbox?: DOMRect;
    }
  | undefined;

export function getTextAtPoint({
  matchCurrency = true,
  matchText = true,
  matchImages = true,
  point,
  maxLength,
}: {
  matchCurrency?: boolean;
  matchText?: boolean;
  matchImages?: boolean;
  point: Point;
  maxLength?: number;
}): GetTextAtPointResult | null {
  // First check for a cache hit on the glyph bounding box
  //
  // This will often be the case when scanning along a line of text
  if (
    previousResult?.firstCharBbox &&
    bboxIncludesPoint({ bbox: previousResult.firstCharBbox, point })
  ) {
    return previousResult.result;
  }

  // First fetch the hit elements (dropping duplicates)
  const elements = [...new Set(document.elementsFromPoint(point.x, point.y))];

  // Look for text matches
  const [position, scanNode] = matchText
    ? getTextNodeStart({ elements, maxLength, point })
    : [null, null];

  // Check if we have a cache hit on the position
  //
  // This will mostly happen when we are working with non-text nodes (e.g. input
  // boxes) or when the cursor is moving just outside the glyph bounds (e.g.
  // along the top of a line).
  if (
    position &&
    position.offsetNode === previousResult?.position?.offsetNode &&
    position.offset === previousResult?.position?.offset
  ) {
    return previousResult.result;
  }

  const synthesizedPosition = position
    ? { offsetNode: scanNode || position.offsetNode, offset: position.offset }
    : undefined;

  if (position && isTextNodePosition(synthesizedPosition)) {
    const result = scanText({
      startPosition: synthesizedPosition,
      matchCurrency,
      maxLength,
    });

    if (result) {
      console.assert(
        !!result.textRange,
        'There should be a text range when getting text from a text node'
      );

      // If we synthesized a text node, substitute the original node into the
      // result.
      if (position.offsetNode !== synthesizedPosition.offsetNode) {
        console.assert(
          result.textRange?.length === 1,
          'When using a synthesized text node there should be a single range'
        );
        console.assert(
          result.textRange![0].node === scanNode,
          'When using a synthesized text node the range should start' +
            ' from that node'
        );
        result.textRange![0].node = position.offsetNode;
      }

      previousResult = {
        point,
        position,
        result,
        firstCharBbox: getFirstCharBbox(position),
      };
      return result;
    }
  }

  // Otherwise just pull whatever text we can off the element
  const elem = elements[0];
  if (elem) {
    const text = getTextFromRandomElement({ elem, matchImages, matchText });
    if (text) {
      const result = { text, textRange: null };
      previousResult = { point, position: undefined, result };
      return result;
    }
  }

  // We haven't found anything, but if the cursor hasn't moved far we should
  // just re-use the last result so the user doesn't have try to keep the
  // mouse over the text precisely in order to read the result.

  if (previousResult) {
    const dx = previousResult.point.x - point.x;
    const dy = previousResult.point.y - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) {
      return previousResult.result;
    }
  }

  previousResult = undefined;
  return null;
}

// For unit testing
export function clearPreviousResult() {
  previousResult = undefined;
}

function getFirstCharBbox(position: CursorPosition): DOMRect | undefined {
  if (!isTextNodePosition(position)) {
    return undefined;
  }

  const firstCharRange = getRangeForSingleCodepoint({
    source: position.offsetNode,
    offset: position.offset,
  });

  // Skip empty ranges
  if (firstCharRange.collapsed) {
    return undefined;
  }

  return getBboxForSingleCodepointRange(firstCharRange);
}

function getTextNodeStart({
  elements,
  maxLength,
  point,
}: {
  elements: readonly Element[];
  maxLength?: number;
  point: Point;
}): [position: CursorPosition, scanNode: Text | null] | [null, null] {
  let position = getCursorPosition({ point, elements });

  // If we have a textual <input> node or a <textarea> we synthesize a
  // text node and use that for finding text since it allows us to re-use
  // the same handling for text nodes and 'value' attributes.
  if (isTextInputPosition(position)) {
    if (position.offset === position.offsetNode.value.length) {
      return [null, null];
    }

    return [position, document.createTextNode(position.offsetNode.value)];
  }

  // Similarly, if we have a Google Docs node, synthesize a node to scan.
  if (isGdocsOverlayPosition(position)) {
    let text = '';
    ({ position, text } = getTextFromAnnotatedCanvas({ maxLength, point }));

    return position ? [position, document.createTextNode(text)] : [null, null];
  }

  return [position, null];
}

function getTextFromRandomElement({
  elem,
  matchImages,
  matchText,
}: {
  elem: Element;
  matchImages: boolean;
  matchText: boolean;
}): string | null {
  // Don't return anything for an iframe since this script will run inside the
  // iframe's contents as well.
  if (elem.nodeName === 'IFRAME') {
    return null;
  }

  // We divide the world into two types of elements: image-like elements and the
  // rest which we presume to be "text" elements.
  const isImage = getContentType(elem) === 'image';
  if ((isImage && !matchImages) || (!isImage && !matchText)) {
    return null;
  }

  if (hasTitleAttribute(elem) && elem.title.length) {
    return elem.title;
  }

  if (hasAltAttribute(elem) && elem.alt.length) {
    // Ignore the default '画像' alt text Twitter and others put on many of their
    // images.
    return elem.alt !== '画像' ? elem.alt : null;
  }

  if (elem.nodeName === 'OPTION') {
    return (elem as HTMLOptionElement).text;
  }

  if (isSelectElement(elem)) {
    return elem.options[elem.selectedIndex].text;
  }

  return null;
}

function hasTitleAttribute(elem: Element): elem is HTMLElement {
  return typeof (elem as HTMLElement).title === 'string';
}

function hasAltAttribute(elem: Element): elem is HTMLImageElement {
  return typeof (elem as HTMLImageElement).alt === 'string';
}

function isSelectElement(elem: Element): elem is HTMLSelectElement {
  return elem.nodeName === 'SELECT';
}
