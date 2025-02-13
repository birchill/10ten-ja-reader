import { nonJapaneseChar } from '../utils/char-range';

import { CursorPosition } from './get-cursor-position';
import { GetTextAtPointResult } from './get-text';
import { extractGetTextMetadata, lookForMetadata } from './meta';

export function scanText({
  startPosition,
  matchCurrency,
  maxLength,
}: {
  startPosition: CursorPosition<Text>;
  matchCurrency: boolean;
  maxLength?: number;
}): GetTextAtPointResult | null {
  const { offsetNode: startNode, offset: startOffset } = startPosition;

  // Get the ancestor node for all inline nodes
  let inlineAncestor = startNode.parentElement;
  while (isInline(inlineAncestor) && !isRubyAnnotationElement(inlineAncestor)) {
    inlineAncestor = inlineAncestor!.parentElement;
  }

  // Skip ruby annotation elements when traversing. However, don't do that
  // if the inline ancestor is itself a ruby annotation element or else
  // we'll never be able to find the starting point within the tree walker.
  let filter: NodeFilter | undefined;
  if (!isRubyAnnotationElement(inlineAncestor)) {
    filter = {
      acceptNode: (node) =>
        node.parentElement?.closest('rp, rt')
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

  /* eslint-disable curly */
  while (treeWalker.referenceNode !== startNode && treeWalker.nextNode());

  if (treeWalker.referenceNode !== startNode) {
    console.error('Could not find node in tree', startNode);
    return null;
  }

  // Look for start, skipping any initial whitespace
  let node = startNode;
  let offset = startOffset;
  do {
    const nodeText = node.data.substring(offset);
    const textStart = nodeText.search(/\S/);
    if (textStart !== -1) {
      offset += textStart;
      break;
    }
    // Curiously with our synthesized text nodes, the next node can sometimes
    // be the same node. We only tend to reach that case, however, when our
    // offset corresponds to the end of the text so we just detect that case
    // earlier on and don't bother checking it here.
    node = treeWalker.nextNode() as Text;
    offset = 0;
  } while (node);
  // (This should probably not traverse block siblings but oh well)

  if (!node) {
    return null;
  }

  const result: GetTextAtPointResult = { text: '', textRange: [] };

  let textDelimiter = nonJapaneseChar;

  // Look for range ends
  do {
    const nodeText = node.data.substring(offset);
    let textEnd = nodeText.search(textDelimiter);

    // Check if we are looking at a special string that accepts a different
    // range of characters.
    if (textDelimiter === nonJapaneseChar) {
      const currentText =
        result.text +
        nodeText.substring(0, textEnd === -1 ? undefined : textEnd);

      // Check if we should further expand the set of allowed characters in
      // order to recognize certain types of metadata-type strings (e.g. years
      // or floor space measurements).
      ({ textDelimiter, textEnd } = lookForMetadata({
        currentText,
        matchCurrency,
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
      result.textRange!.push({ node, start: offset, end: offset + textEnd });
      break;
    }

    // The whole text node is allowed characters, keep going.
    result.text += nodeText;
    result.textRange!.push({ node, start: offset, end: node.data.length });
    node = treeWalker.nextNode() as Text;
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

  result.meta = extractGetTextMetadata({ text: result.text, matchCurrency });

  return result;
}

function isRubyAnnotationElement(element: Element | null) {
  return element?.matches('rp, rt');
}

function isInline(element: Element | null) {
  return (
    element &&
    // We always treat <rb> and <ruby> tags as inline regardless of the styling
    // since sites like renshuu.org do faux-ruby styling where they give these
    // elements styles like 'display: table-row-group'.
    //
    // We also make an exception for <span> because pdf.js uses
    // absolutely-positioned (and hence `display: block`) spans to lay out
    // characters in vertical text.
    //
    // Furthermore, we treat inline-block as inline because YouTube puts
    // okurigana in a separate inline-block span when using ruby.
    //
    // Finally, if an element's parent is inline-block, then the element will
    // still be laid out "inline" so we allow that too (and that appears to be
    // used by Kanshudo at least).
    //
    // Given all these exceptions, I wonder if we should even both checking
    // the display property.
    (['RB', 'RUBY', 'SPAN'].includes(element.tagName) ||
      ['inline', 'inline-block', 'ruby', 'ruby-base', 'ruby-text'].includes(
        getComputedStyle(element).display!
      ) ||
      (element.parentElement &&
        getComputedStyle(element.parentElement)?.display === 'inline-block'))
  );
}
