import { isTextInputNode, isTextNode } from './dom-utils';
import { SelectionMeta } from './meta';
import { kanjiToNumber } from './numbers';
import { SVG_NS } from './svg';
import { isEraName, startsWithEraName } from './years';

export interface GetTextAtPointResult {
  text: string;
  // Contains the node and offset where the selection starts. This will be null
  // if, for example, the result is the text from an element's title attribute.
  rangeStart: RangeEndpoint | null;
  // Contains the node and offset for each text-containing node in the
  // maximum selected range.
  rangeEnds: RangeEndpoint[];
  // Extra metadata we parsed in the process
  meta?: SelectionMeta;
}

// Either end of a Range object
interface RangeEndpoint {
  container: Node;
  offset: number;
}

// Basically CaretPosition but without getClientRect()
interface CursorPosition {
  readonly offset: number;
  readonly offsetNode: Node;
}

type Point = {
  x: number;
  y: number;
};

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
          !!result.rangeStart,
          'The range start should be set when getting text from a text node'
        );

        // If we synthesized a text node, substitute the original node back in.
        if (startNode !== position!.offsetNode) {
          console.assert(
            result.rangeStart!.container === startNode,
            'When using a synthesized text node the range should start' +
              ' from that node'
          );
          console.assert(
            result.rangeEnds.length === 1 &&
              result.rangeEnds[0].container === startNode,
            'When using a synthesized text node there should be a single' +
              ' range end using the synthesized node'
          );
          result.rangeStart!.container = position!.offsetNode;
          result.rangeEnds[0].container = position!.offsetNode;
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
      const result: GetTextAtPointResult = {
        text,
        rangeStart: null,
        rangeEnds: [],
      };
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

function caretPositionFromPoint(point: Point): CursorPosition | null {
  if (document.caretPositionFromPoint) {
    return document.caretPositionFromPoint(point.x, point.y);
  }

  const range = document.caretRangeFromPoint(point.x, point.y);
  return range
    ? {
        offsetNode: range.startContainer,
        offset: range.startOffset,
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

  // Match the scroll position
  mirrorElement.scrollTop = node.scrollTop;
  mirrorElement.scrollLeft = node.scrollLeft;

  // Set its position in the document to be to be the same
  mirrorElement.style.position = 'absolute';
  const bbox = node.getBoundingClientRect();
  mirrorElement.style.top = bbox.top + 'px';
  mirrorElement.style.left = bbox.left + 'px';

  // Finally, make sure it is on top
  mirrorElement.style.zIndex = '10000';

  // Read the offset
  document.documentElement.appendChild(mirrorElement);
  let result: number | null;
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(point.x, point.y);
    result = position ? position.offset : null;
  } else {
    const range = document.caretRangeFromPoint(point.x, point.y);
    result = range ? range.startOffset : null;
  }

  // Drop the element
  mirrorElement.remove();

  return result;
}

function getDistanceFromTextNode(
  startNode: CharacterData,
  startOffset: number,
  point: {
    x: number;
    y: number;
  }
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
  point: {
    x: number;
    y: number;
  };
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

  let result: GetTextAtPointResult | null = {
    text: '',
    rangeStart: {
      // If we're operating on a synthesized text node, use the actual
      // start node.
      container: node,
      offset: offset,
    },
    rangeEnds: [],
  };

  // Search for non-Japanese text (or a delimiter of some sort even if it
  // is "Japanese" in the sense of being full-width).
  //
  // * U+FF01~U+FF5E is for full-width alphanumerics (includes some
  //   punctuation like ＆ and ～ because they appear in the kanji headwords for
  //   some entries)
  // * U+25CB is 'white circle' often used to represent a blank
  //   (U+3007 is an ideographic zero that is also sometimes used for this
  //   purpose, but this is included in the U+3001~U+30FF range.)
  // * U+3000~U+30FF is ideographic punctuation but we skip:
  //
  //    U+3000 (ideographic space),
  //    U+3001 (、 ideographic comma),
  //    U+3002 (。 ideographic full stop),
  //    U+3003 (〃 ditto mark),
  //    U+3008,U+3009 (〈〉),
  //    U+300A,U+300B (《》),
  //    U+300C,U+300D (「」 corner brackets for quotations),
  //                  [ENAMDICT actually uses this in one entry,
  //                  "ウィリアム「バッファロービル」コーディ", but I think we
  //                  can live without being able to recognize that)
  //    U+300E,U+300F (『 』), and
  //    U+3010,U+3011 (【 】),
  //
  //   since these are typically only going to delimit words.
  // * U+3041~U+309F is the hiragana range
  // * U+30A0~U+30FF is the katakana range
  // * U+3220~U+3247 is various enclosed characters like ㈵
  // * U+3280~U+32B0 is various enclosed characters like ㊞
  // * U+32D0~U+32FF is various enclosed characters like ㋐ and ㋿.
  // * U+3300~U+3370 is various shorthand characters from the CJK
  //   compatibility block like ㍍
  // * U+337B~U+337F is various era names and ㍿
  // * U+3400~U+4DBF is the CJK Unified Ideographs Extension A block (rare
  //   kanji)
  // * U+4E00~U+9FFF is the CJK Unified Ideographs block ("the kanji")
  // * U+F900~U+FAFF is the CJK Compatibility Ideographs block (random odd
  //   kanji, because standards)
  // * U+FF5E is full-width tilde ～ (not 〜 which is a wave dash)
  // * U+FF61~U+FF65 is some halfwidth ideographic symbols, e.g. ｡ but we
  //   skip them (although previous rikai-tachi included them) since
  //   they're mostly going to be delimiters
  // * U+FF66~U+FF9F is halfwidth katakana
  // * U+20000~U+2A6DF is CJK Unified Ideographs Extension B (more rare kanji)
  //
  const nonJapaneseOrDelimiter =
    /[^\uff01-\uff5e\u25cb\u3004-\u3007\u3011-\u30ff\u3220-\u3247\u3280-\u32b0\u32d0-\u32ff\u3300-\u3370\u337b-\u337f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff5e\uff66-\uff9f\u{20000}-\u{2a6df}]/u;

  // If we detect a Japanese era, however, we allow a different set of
  // characters.
  const nonEraCharacter = /[^\s0-9０-９一二三四五六七八九十百元年]/;
  let textDelimiter = nonJapaneseOrDelimiter;

  // Look for range ends
  do {
    const nodeText = node.data.substring(offset);
    let textEnd = nodeText.search(textDelimiter);

    // Check for a Japanese era since we use different end delimiters in that
    // case.
    if (textDelimiter === nonJapaneseOrDelimiter) {
      const currentText =
        result.text +
        nodeText.substring(0, textEnd === -1 ? undefined : textEnd);

      // If we hit a delimiter but the existing text is an era name, we should
      // re-find the end of this text node.
      if (textEnd >= 0 && startsWithEraName(currentText)) {
        textDelimiter = nonEraCharacter;
        const endOfEra = nodeText.substring(textEnd).search(textDelimiter);
        textEnd = endOfEra === -1 ? -1 : textEnd + endOfEra;
      }
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
      result.rangeEnds.push({
        container: node,
        offset: offset + textEnd,
      });
      break;
    }

    // The whole text node is allowed characters, keep going.
    result.text += nodeText;
    result.rangeEnds.push({
      container: node,
      offset: node.data.length,
    });
    node = <CharacterData>treeWalker.nextNode();
    offset = 0;
  } while (
    node &&
    inlineAncestor &&
    (node.parentElement === inlineAncestor || isInline(node.parentElement))
  );

  // Check if we didn't find any suitable characters
  if (!result.rangeEnds.length) {
    result = null;
  }

  if (result) {
    result.meta = extractGetTextMetadata(result.text);
  }

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
  point: {
    x: number;
    y: number;
  };
  maxLength?: number;
}): GetTextAtPointResult | null {
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

// This is a bit complicated because for a numeric year we don't require the
// 年 but for 元年 we do. i.e. '令和2' is valid but '令和元' is not.
const yearRegex = /(?:([0-9０-９〇一二三四五六七八九十百]+)\s*年?|(?:元\s*年))/;

function extractGetTextMetadata(text: string): SelectionMeta | undefined {
  // Look for a year
  const matches = yearRegex.exec(text);
  if (!matches || matches.index === 0) {
    return undefined;
  }

  // Look for an era
  const era = text.substring(0, matches.index).trim();
  if (!isEraName(era)) {
    return undefined;
  }

  // Parse year
  let year: number | null = 0;
  if (typeof matches[1] !== 'undefined') {
    // If it's a character in the CJK block, parse as a kanji number
    const firstCharCode = matches[1].charCodeAt(0);
    if (firstCharCode >= 0x4e00 && firstCharCode <= 0x9fff) {
      year = kanjiToNumber(matches[1]);
    } else {
      year = parseInt(
        matches[1].replace(/[０-９]/g, (ch) =>
          String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
        ),
        10
      );
    }
  }

  if (year === null) {
    return undefined;
  }

  const matchLen = matches.index + matches[0].length;

  return { era, year, matchLen };
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

function bboxIncludesPoint({
  bbox,
  margin = 0,
  point,
}: {
  bbox: DOMRect;
  margin?: number;
  point: Point;
}): boolean {
  return (
    bbox.left - margin <= point.x &&
    bbox.right + margin >= point.x &&
    bbox.top - margin <= point.y &&
    bbox.bottom + margin >= point.y
  );
}
