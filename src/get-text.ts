import { nonJapaneseChar } from './char-range';
import { isTextInputNode, isTextNode } from './dom-utils';
import { bboxIncludesPoint, Point } from './geometry';
import { extractGetTextMetadata, lookForMetadata, SelectionMeta } from './meta';
import { SVG_NS } from './svg';
import { TextRange } from './text-range';
import { isChromium } from './ua-utils';

export interface GetTextAtPointResult {
  text: string;
  // Contains the set of nodes and their ranges where text was found.
  // This will be null if, for example, the result is the text from an element's
  // title attribute.
  textRange: TextRange | null;
  // Extra metadata we parsed in the process
  meta?: SelectionMeta;
}

// Basically CaretPosition but without getClientRect()
interface CursorPosition {
  readonly offset: number;
  readonly offsetNode: Node;
}

// Cache of previous result (since often the mouse position will change but
// the cursor position will not).
let previousResult:
  | {
      point: Point;
      position: CursorPosition | undefined;
      result: GetTextAtPointResult;
    }
  | undefined;

export function getTextAtPoint(
  point: Point,
  maxLength?: number
): GetTextAtPointResult | null {
  let position = caretPositionFromPoint(point);

  // Chrome not only doesn't support caretPositionFromPoint, but also
  // caretRangeFromPoint doesn't return text input elements. Instead it returns
  // one of their ancestors.
  //
  // Chrome may one day support caretPositionFromPoint with the same buggy
  // behavior so check if we DIDN'T get a text input element but _should_ have.
  if (position && !isTextInputNode(position.offsetNode)) {
    const elemUnderCursor = document.elementFromPoint(point.x, point.y);
    if (isTextInputNode(elemUnderCursor)) {
      const offset = getOffsetFromTextInputNode({
        node: elemUnderCursor,
        point,
      });
      position =
        offset !== null ? { offset, offsetNode: elemUnderCursor } : null;
    }
  }
  // By contrast, Safari simply always returns an offset of 0 for text boxes
  else if (
    position &&
    position.usedCaretRangeFromPoint &&
    position.offset === 0 &&
    isTextInputNode(position.offsetNode)
  ) {
    const offset = getOffsetFromTextInputNode({
      node: position.offsetNode,
      point,
    });
    position =
      offset !== null ? { offset, offsetNode: position.offsetNode } : position;
  }

  if (
    position &&
    position.offsetNode === previousResult?.position?.offsetNode &&
    position.offset === previousResult?.position?.offset
  ) {
    return previousResult.result;
  }

  // If we have a textual <input> node or a <textarea> we synthesize a
  // text node and use that for finding text since it allows us to re-use
  // the same handling for text nodes and 'value' attributes.

  let startNode: Node | null = position ? position.offsetNode : null;
  if (isTextInputNode(startNode)) {
    // If we selected the end of the text, skip it.
    if (position!.offset === startNode.value.length) {
      previousResult = undefined;
      return null;
    }
    startNode = document.createTextNode(startNode.value);
  }

  // Try handling as a text node

  if (isTextNode(startNode)) {
    // Due to line wrapping etc. sometimes caretPositionFromPoint can return
    // a point far away from the cursor.
    //
    // We don't need to do this for synthesized text nodes, however, since we
    // assume we'll be within their bounds.
    const distanceResult = getDistanceFromTextNode(
      startNode,
      position!.offset,
      point
    );

    let closeEnough = true;
    if (distanceResult) {
      // If we're more than about three characters away, don't show the
      // pop-up.
      const { distance, glyphExtent } = distanceResult;
      if (distance > glyphExtent * 3) {
        closeEnough = false;
      }
    }

    if (closeEnough) {
      const result = getTextFromTextNode({
        startNode,
        startOffset: position!.offset,
        point,
        maxLength,
      });

      if (result) {
        console.assert(
          !!result.textRange,
          'There should be a text range when getting text from a text node'
        );

        // If we synthesized a text node, substitute the original node back in.
        if (startNode !== position!.offsetNode) {
          console.assert(
            result.textRange!.length === 1,
            'When using a synthesized text node there should be a single range'
          );
          console.assert(
            result.textRange![0].node === startNode,
            'When using a synthesized text node the range should start' +
              ' from that node'
          );
          result.textRange![0].node = position!.offsetNode;
        }

        previousResult = { point, position: position!, result };
        return result;
      }
    }
  }

  // See if we are dealing with a covering link
  const parentLink = getParentLink(startNode);
  if (parentLink) {
    const result = getTextFromCoveringLink({
      linkElem: parentLink,
      originalElem: startNode,
      point,
      maxLength,
    });

    if (result) {
      // Don't cache `position` since it's not the position we actually used.
      previousResult = { point, position: undefined, result };
      return result;
    }
  }

  // Otherwise just pull whatever text we can off the element

  const elem = document.elementFromPoint(point.x, point.y);
  if (elem) {
    const text = getTextFromRandomElement(elem);
    if (text) {
      const result: GetTextAtPointResult = { text, textRange: null };
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

function caretPositionFromPoint(
  point: Point
): (CursorPosition & { usedCaretRangeFromPoint?: boolean }) | null {
  let result = rawCaretPositionFromPoint(point);
  if (!result) {
    return result;
  }

  // If the cursor is more than half way across a character,
  // caretPositionFromPoint will choose the _next_ character since that's where
  // the cursor would be placed if you clicked there and started editing the
  // text.
  //
  // (Or something like that, it looks like when editing it's more like if the
  // character is 70% or so of the way across the character it inserts before
  // the next character. In any case, caretPositionFromPoint et. al appear to
  // consistently choose the next character after about the 50% mark in at least
  // Firefox and Chromium.)
  //
  // For _looking up_ text, however, it's more intuitive if we look up starting
  // from the character you're pointing at.
  //
  // Below we see if the point is within the bounding box of the _previous_
  // character in the inline direction and, if it is, start from there instead.
  //
  // (We do this adjustment here, rather than in, say, getTextFromTextNode,
  // since it allows us to continue caching the position returned from this
  // method and returning early if it doesn't change. The disadvantage is that
  // because it only applies to text nodes, we don't do this adjustment for text
  // boxes.
  //
  // If we did the adjustment inside getTextFromTextNode, however, it _would_
  // work for text boxes since we synthesize a text node for them before calling
  // getTextFromTextNode. As it is, we'll end up calling caretPositionFromPoint
  // on the mirrored element we create for text boxes in Chrome/Edge/Safari so
  // text boxes there will benefit from this adjustment already, it's just
  // Firefox that won't. One might say that when we're in text boxes it's better
  // to follow caretPositionFromPoint's behavior anyway.
  //
  // In any case, for ow, we do the adjustment here so we keep the early return
  // optimization and if it becomes important to apply this to text boxes too,
  // we'll work out a way to address them at that time.)
  const { offsetNode, offset } = result;
  if (isTextNode(offsetNode) && offset) {
    const range = new Range();
    range.setStart(offsetNode, offset - 1);
    range.setEnd(offsetNode, offset);
    const previousCharacterBbox = range.getBoundingClientRect();
    if (bboxIncludesPoint({ bbox: previousCharacterBbox, point })) {
      result = {
        offsetNode,
        offset: offset - 1,
        usedCaretRangeFromPoint: result.usedCaretRangeFromPoint,
      };
    }
  }

  return result;
}

function rawCaretPositionFromPoint(
  point: Point
): (CursorPosition & { usedCaretRangeFromPoint?: boolean }) | null {
  if (document.caretPositionFromPoint) {
    return document.caretPositionFromPoint(point.x, point.y);
  }

  const range = document.caretRangeFromPoint(point.x, point.y);
  return range
    ? {
        offsetNode: range.startContainer,
        offset: range.startOffset,
        usedCaretRangeFromPoint: true,
      }
    : null;
}

function getOffsetFromTextInputNode({
  node,
  point,
}: {
  node: HTMLInputElement | HTMLTextAreaElement;
  point: Point;
}): number | null {
  // This is only called when the platform APIs failed to give us the correct
  // result so we need to synthesize an element with the same layout as the
  // text area, read the text position, then drop it.

  // Create the element
  const mirrorElement = document.createElement('div');
  mirrorElement.textContent = node.value;

  // Set its styles to be the same
  const cs = document.defaultView!.getComputedStyle(node);
  for (let i = 0; i < cs.length; i++) {
    const prop = cs.item(i);
    mirrorElement.style.setProperty(prop, cs.getPropertyValue(prop));
  }

  // Special handling for Chromium which does _not_ include the scrollbars in
  // the width/height when box-sizing is 'content-box'.
  if (isChromium() && cs.boxSizing === 'content-box') {
    const { paddingLeft, paddingRight, paddingTop, paddingBottom } = cs;
    const {
      borderLeftWidth,
      borderRightWidth,
      borderTopWidth,
      borderBottomWidth,
    } = cs;

    const width =
      node.offsetWidth -
      parseFloat(paddingLeft) -
      parseFloat(paddingRight) -
      parseFloat(borderLeftWidth) -
      parseFloat(borderRightWidth);
    if (Number.isFinite(width)) {
      mirrorElement.style.width = `${width}px`;
    }

    const height =
      node.offsetHeight -
      parseFloat(paddingTop) -
      parseFloat(paddingBottom) -
      parseFloat(borderTopWidth) -
      parseFloat(borderBottomWidth);
    if (Number.isFinite(height)) {
      mirrorElement.style.height = `${height}px`;
    }
  }

  // Set its position in the document to be to be the same
  mirrorElement.style.position = 'absolute';
  const bbox = node.getBoundingClientRect();
  mirrorElement.style.top = bbox.top + 'px';
  mirrorElement.style.left = bbox.left + 'px';

  // Finally, make sure it is on top
  mirrorElement.style.zIndex = '10000';

  // Append the element to the document. We need to do this before adjusting
  // the scroll offset or else it won't update.
  document.documentElement.appendChild(mirrorElement);

  // Match the scroll position
  const { scrollLeft, scrollTop } = node;
  mirrorElement.scrollTo(scrollLeft, scrollTop);

  // Read the offset
  const position = caretPositionFromPoint(point);
  const result = position?.offset ?? null;

  // Drop the element
  mirrorElement.remove();

  return result;
}

function getDistanceFromTextNode(
  startNode: CharacterData,
  startOffset: number,
  point: Point
): { distance: number; glyphExtent: number } | null {
  // Ignore synthesized text nodes.
  if (!startNode.parentElement) {
    return null;
  }

  // Ignore SVG content (it doesn't normally need distance checking).
  if (startNode.parentElement.namespaceURI === SVG_NS) {
    return null;
  }

  // Get bbox of first character in range (since that's where we select from).
  const range = new Range();
  range.setStart(startNode, startOffset);
  range.setEnd(startNode, Math.min(startOffset + 1, startNode.length));
  const bbox = range.getBoundingClientRect();

  // Find the distance from the cursor to the closest edge of that character
  // since if we have a large font size the two distances could be quite
  // different.
  const xDist = Math.min(
    Math.abs(point.x - bbox.left),
    Math.abs(point.x - bbox.right)
  );
  const yDist = Math.min(
    Math.abs(point.y - bbox.top),
    Math.abs(point.y - bbox.bottom)
  );

  const distance = Math.sqrt(xDist * xDist + yDist * yDist);
  const glyphExtent = Math.sqrt(
    bbox.width * bbox.width + bbox.height * bbox.height
  );

  return { distance, glyphExtent };
}

function getTextFromTextNode({
  startNode,
  startOffset,
  point,
  maxLength,
}: {
  startNode: CharacterData;
  startOffset: number;
  point: Point;
  maxLength?: number;
}): GetTextAtPointResult | null {
  const isRubyAnnotationElement = (element: Element | null) => {
    if (!element) {
      return false;
    }

    const tag = element.tagName.toLowerCase();
    return tag === 'rp' || tag === 'rt';
  };

  const isInline = (element: Element | null) =>
    element &&
    // We always treat <rb> and <ruby> tags as inline regardless of the
    // styling since sites like renshuu.org do faux-ruby styling where they
    // give these elements styles like 'display: table-row-group'.
    //
    // Furthermore, we treat inline-block as inline because YouTube puts
    // okurigana in a separate inline-block span when using ruby.
    (['RB', 'RUBY'].includes(element.tagName) ||
      ['inline', 'inline-block', 'ruby', 'ruby-base', 'ruby-text'].includes(
        getComputedStyle(element).display!
      ));

  // Get the ancestor node for all inline nodes
  let inlineAncestor = startNode.parentElement;
  while (isInline(inlineAncestor) && !isRubyAnnotationElement(inlineAncestor)) {
    inlineAncestor = inlineAncestor!.parentElement;
  }

  // Check that our ancestor does actually cover the point in question since
  // sometimes caretPositionFromPoint can be too helpful and can choose an
  // element far away.
  //
  // (We used to simply check that `inlineAncestor` is an inclusive ancestor
  // of the result of document.elementFromPoint but the following seems like it
  // should be a bit more robust, especially if caretPositionFromPoint is more
  // clever than elementFromPoint in locating covered-up text.)
  const ancestorBbox = inlineAncestor?.getBoundingClientRect();
  if (
    ancestorBbox &&
    !bboxIncludesPoint({ bbox: ancestorBbox, margin: 5, point })
  ) {
    return null;
  }

  // Skip ruby annotation elements when traversing. However, don't do that
  // if the inline ancestor is itself a ruby annotation element or else
  // we'll never be able to find the starting point within the tree walker.
  let filter: NodeFilter | undefined;
  if (!isRubyAnnotationElement(inlineAncestor)) {
    filter = {
      acceptNode: (node) =>
        isRubyAnnotationElement(node.parentElement)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    };
  }

  // Setup a treewalker starting at the current node
  const treeWalker = document.createNodeIterator(
    inlineAncestor || startNode,
    NodeFilter.SHOW_TEXT,
    filter
  );
  while (treeWalker.referenceNode !== startNode && treeWalker.nextNode());

  if (treeWalker.referenceNode !== startNode) {
    console.error('Could not find node in tree', startNode);
    return null;
  }

  // Look for start, skipping any initial whitespace
  let node: CharacterData = startNode;
  let offset: number = startOffset;
  do {
    const nodeText = node.data.substr(offset);
    const textStart = nodeText.search(/\S/);
    if (textStart !== -1) {
      offset += textStart;
      break;
    }
    // Curiously with our synthesized text nodes, the next node can sometimes
    // be the same node. We only tend to reach that case, however, when our
    // offset corresponds to the end of the text so we just detect that case
    // earlier on and don't bother checking it here.
    node = <CharacterData>treeWalker.nextNode();
    offset = 0;
  } while (node);
  // (This should probably not traverse block siblings but oh well)

  if (!node) {
    return null;
  }

  const result: GetTextAtPointResult = {
    text: '',
    textRange: [],
  };

  let textDelimiter = nonJapaneseChar;

  // Look for range ends
  do {
    const nodeText = node.data.substring(offset);
    let textEnd = nodeText.search(textDelimiter);

    // Check if we are looking at a special metadata string that accepts a
    // different range of characters.
    if (textDelimiter === nonJapaneseChar) {
      const currentText =
        result.text +
        nodeText.substring(0, textEnd === -1 ? undefined : textEnd);
      ({ textDelimiter, textEnd } = lookForMetadata({
        currentText,
        nodeText,
        textDelimiter,
        textEnd,
      }));
    }

    if (typeof maxLength === 'number' && maxLength >= 0) {
      const maxEnd = maxLength - result.text.length;
      if (textEnd === -1) {
        // The >= here is important since it means that if the node has
        // exactly enough characters to reach the maxLength then we will
        // stop walking the tree at this point.
        textEnd = node.data.length - offset >= maxEnd ? maxEnd : -1;
      } else {
        textEnd = Math.min(textEnd, maxEnd);
      }
    }

    if (textEnd === 0) {
      // There are no characters here for us.
      break;
    } else if (textEnd !== -1) {
      // The text node has disallowed characters mid-way through so
      // return up to that point.
      result.text += nodeText.substring(0, textEnd);
      result.textRange!.push({
        node,
        start: offset,
        end: offset + textEnd,
      });
      break;
    }

    // The whole text node is allowed characters, keep going.
    result.text += nodeText;
    result.textRange!.push({
      node,
      start: offset,
      end: node.data.length,
    });
    node = <CharacterData>treeWalker.nextNode();
    offset = 0;
  } while (
    node &&
    inlineAncestor &&
    (node.parentElement === inlineAncestor || isInline(node.parentElement))
  );

  // Check if we didn't find any suitable characters
  if (!result.textRange!.length) {
    return null;
  }

  result.meta = extractGetTextMetadata(result.text);

  return result;
}

function getParentLink(node: Node | null): HTMLAnchorElement | null {
  if (node && node.nodeType === Node.ELEMENT_NODE) {
    return (node as Element).closest('a');
  }

  if (isTextNode(node)) {
    return node.parentElement ? node.parentElement.closest('a') : null;
  }

  return null;
}

// Take care of "covering links". "Convering links" is the name we give to the
// approach used by at least asahi.com and nikkei.com on their homepages where
// they create a big <a> element and a tiny (1px x 1px) span with the link text
// and then render the actual link content in a separate layer.
//
// Roughly it looks something like the following:
//
// <div>
//   <a> <-- Link to article with abs-pos left/right/top/bottom: 0
//     <span/> <-- Link text as a 1x1 div
//   </a>
//   <div> <!-- Actual link content
//     <figure/>
//     <h2><a>Link text again</a></h2>
//     etc.
//   </div>
// </div>
//
// If we fail to find any text but are pointing at a link, we should try digging
// for content underneath the link
function getTextFromCoveringLink({
  linkElem,
  originalElem,
  point,
  maxLength,
}: {
  linkElem: HTMLAnchorElement;
  originalElem: Node | null;
  point: Point;
  maxLength?: number;
}): GetTextAtPointResult | null {
  // We'd like to just turn off pointer-events and see what we find but that
  // will introduce flickering when links have transitions defined on them.
  //
  // Instead we first probe to see if there is likely to be some other text
  // underneath and only toggle pointer-events when that's the case.
  const hasCoveredElements = document
    .elementsFromPoint(point.x, point.y)
    .some((elem) => !elem.contains(linkElem));
  if (!hasCoveredElements) {
    return null;
  }

  // Turn off pointer-events for the covering link
  const previousPointEvents = linkElem.style.pointerEvents;
  linkElem.style.pointerEvents = 'none';

  const position = caretPositionFromPoint(point);

  linkElem.style.pointerEvents = previousPointEvents;

  // See if we successfully found a different text node
  if (
    !position ||
    position.offsetNode === originalElem ||
    !isTextNode(position.offsetNode)
  ) {
    return null;
  }

  return getTextFromTextNode({
    startNode: position.offsetNode,
    startOffset: position.offset,
    point,
    maxLength,
  });
}

function getTextFromRandomElement(elem: Element): string | null {
  // Don't return anything for an iframe since this script will run inside the
  // iframe's contents as well.
  if (elem.nodeName === 'IFRAME') {
    return null;
  }

  if (typeof (<any>elem).title === 'string' && (<any>elem).title.length) {
    return (<any>elem).title;
  }

  if (typeof (<any>elem).alt === 'string' && (<any>elem).alt.length) {
    return (<any>elem).alt;
  }

  if (elem.nodeName === 'OPTION') {
    return (<HTMLOptionElement>elem).text;
  }

  const isSelectElement = (elem: Element): elem is HTMLSelectElement =>
    elem.nodeName === 'SELECT';
  if (isSelectElement(elem)) {
    return elem.options[elem.selectedIndex].text;
  }

  return null;
}
