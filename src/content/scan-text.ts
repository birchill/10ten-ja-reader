import { nonJapaneseChar } from '../utils/char-range';
import { normalizeContext } from '../utils/normalize';

import {
  type SourceContext,
  type SourceRuby,
  trimSourceContext,
} from './flashcards/source-context';
import type { CursorPosition } from './get-cursor-position';
import {
  type SelectionMeta,
  extractGetTextMetadata,
  lookForMetadata,
} from './meta';
import type { TextRange } from './text-range';

export type ScanTextResult = {
  text: string;

  /**
   * Contains the set of nodes and their ranges where text was found.
   *
   * This will be null if, for example, the result is the text from an element's
   * title attribute.
   */
  textRange: TextRange;

  /**
   * Contains the surrounding text content.
   *
   * This will be null if the result is the text from an element's title
   * attribute.
   */
  sourceContext: SourceContext | null;

  // Extra metadata we parsed in the process
  meta?: SelectionMeta;
};

export function scanText({
  startPosition,
  matchCurrency,
  maxLength,
}: {
  startPosition: CursorPosition<Text>;
  matchCurrency: boolean;
  maxLength?: number;
}): ScanTextResult | null {
  const { offsetNode: startNode, offset: startOffset } = startPosition;

  // Get the ancestor for all inline nodes we intend to traverse
  let inlineScope = startNode.parentElement;
  while (isEffectiveInline(inlineScope)) {
    inlineScope = inlineScope!.parentElement;
  }

  // If we started inside an <rp> element, bail.
  //
  // <rp> elements are `display: none` via a UA stylesheet and are really only
  // supposed to contain parentheses and so on. It's very unlikely we'll ever
  // find useful text inside them.
  if (startNode.parentElement?.closest('rp')) {
    return null;
  }

  // When traversing, we generally want to skip the content in <rt> and <rp>
  // elements.
  //
  // If we started in an <rt> element, however, we want to include the <rt>
  // content of any <ruby> elements we visit and _not_ the base text content.
  //
  // In fact, it's even more complicated due to fact that <ruby> can be
  // nested. This is pretty rare, but it's probably fair to say that we
  // generally want to only read <rt> content at the same level of nesting.
  const rtLevel = getRtLevel(startNode);

  // Set up our filter for which nodes to include in our output text
  let includeNodeText: (node: Node) => node is Text;
  if (rtLevel > 0) {
    includeNodeText = (node): node is Text => {
      if (node.nodeType !== Node.TEXT_NODE) {
        return false;
      }

      if (!node.parentElement?.closest('ruby')) {
        return true;
      }

      return getRtLevel(node) === rtLevel;
    };
  } else {
    includeNodeText = (node): node is Text =>
      node.nodeType === Node.TEXT_NODE &&
      !node.parentElement?.closest('rp, rt');
  }

  // Setup a node iterator starting at the current node
  const nodeIterator = document.createNodeIterator(
    inlineScope || startNode,
    // We need to include elements simply so we can detect empty ruby parts
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
  );

  const sourceContext: SourceContext = {
    prelude: [],
    source: [],
    sourceOffset: 0,
  };

  const preludeBuilder = new SourceContextBuilder(
    sourceContext.prelude,
    rtLevel
  );

  do {
    const { referenceNode } = nodeIterator;
    if (referenceNode === startNode) {
      break;
    }

    preludeBuilder.add(referenceNode);
  } while (nodeIterator.nextNode());

  if (nodeIterator.referenceNode !== startNode) {
    console.error('Could not find node in tree', startNode);
    return null;
  }

  // Look for start, skipping any initial whitespace
  let node: Text | null = startNode;
  let offset = startOffset;
  do {
    if (includeNodeText(node)) {
      const nodeText = node.data.substring(offset);
      const textStart = nodeText.search(/\S/);
      if (textStart !== -1) {
        offset += textStart;
        break;
      }
    }

    preludeBuilder.add(node);

    // Curiously with our synthesized text nodes, the next node can sometimes
    // be the same node. We only tend to reach that case, however, when our
    // offset corresponds to the end of the text so we just detect that case
    // earlier on and don't bother checking it here.
    let nextNode = nodeIterator.nextNode() as Text | Element | null;
    while (nextNode && nextNode.nodeType !== Node.TEXT_NODE) {
      preludeBuilder.add(nextNode);
      nextNode = nodeIterator.nextNode() as Text | Element | null;
    }
    node = nextNode as Text | null;

    // Don't traverse block siblings
    if (inlineScope && !inlineScope.contains(node)) {
      node = null;
      break;
    }

    offset = 0;
  } while (node);

  if (!node) {
    return null;
  }

  // If we are in the same ruby as our prelude context, then inherit that
  // context.
  let sourceBuilder: SourceContextBuilder;
  const rubyElement = getOutermostRuby(node);

  if (preludeBuilder.inSameRubyElement(rubyElement)) {
    sourceBuilder = SourceContextBuilder.InheritExistingRubyContext(
      sourceContext.source,
      preludeBuilder
    );
    sourceContext.inTranscription = rtLevel > 0;
    sourceContext.sourceOffset =
      sourceBuilder.getRubyOffset(sourceContext.inTranscription) + offset;
  } else if (rubyElement) {
    preludeBuilder.flush();
    sourceContext.sourceOffset = offset;
    sourceBuilder = new SourceContextBuilder(sourceContext.source, rtLevel);
  } else {
    preludeBuilder.flush();
    if (offset > 0) {
      preludeBuilder.add(new Text(node.data.substring(0, offset)));
    }
    sourceBuilder = new SourceContextBuilder(sourceContext.source, rtLevel);
  }

  const result: ScanTextResult = { text: '', textRange: [], sourceContext };

  let textDelimiter = nonJapaneseChar;

  // Look for range ends
  do {
    sourceBuilder.add(node, offset);

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
      result.textRange.push({ node, start: offset, end: offset + textEnd });
      break;
    }

    // The whole text node is allowed characters, keep going.
    result.text += nodeText;
    result.textRange.push({ node, start: offset, end: node.data.length });

    let nextNode = nodeIterator.nextNode() as Text | Element | null;
    while (nextNode && !includeNodeText(nextNode)) {
      sourceBuilder.add(nextNode);
      nextNode = nodeIterator.nextNode() as Text | Element | null;
    }
    node = nextNode as Text | null;

    offset = 0;
  } while (
    node &&
    inlineScope &&
    (node.parentElement === inlineScope ||
      isEffectiveInline(node.parentElement))
  );

  // Check if we didn't find any suitable characters
  if (!result.textRange!.length) {
    return null;
  }

  // Continue adding source context after the found text
  let nextNode: Text | Element | null = node;
  while (nextNode && inlineScope) {
    nextNode = nodeIterator.nextNode() as Text | Element | null;
    if (nextNode) {
      sourceBuilder.add(nextNode);
    }
  }
  sourceBuilder.flush();

  trimSourceContext(sourceContext, result.text.length);
  result.meta = extractGetTextMetadata({ text: result.text, matchCurrency });

  return result;
}

// ----------------------------------------------------------------------------
//
// DOM helpers
//
// ----------------------------------------------------------------------------

function isEffectiveInline(element: Element | null) {
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
    (['RB', 'RUBY', 'SPAN'].includes(element.tagName) ||
      [
        'inline',
        'inline-block',
        'inline-flex',
        'inline-grid',
        'ruby',
        'ruby-base',
        'ruby-text',
      ].includes(getComputedStyle(element).display!) ||
      (element.parentElement &&
        getComputedStyle(element.parentElement)?.display === 'inline-block'))
  );
}

// ----------------------------------------------------------------------------
//
// Ruby helpers
//
// ----------------------------------------------------------------------------

function getRtLevel(node: Node): number {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  const rtParent = element?.closest('rt');
  if (!rtParent) {
    return 0;
  }

  return getRubyLevel(rtParent);
}

function getRubyLevel(node: Node): number {
  let level =
    node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'RUBY'
      ? 1
      : 0;

  let rubyAncestor = node.parentElement?.closest('ruby');
  while (rubyAncestor) {
    level++;
    rubyAncestor = rubyAncestor.parentElement?.closest('ruby');
  }

  return level;
}

function getOutermostRuby(node: Node): HTMLElement | null {
  let result: HTMLElement | null = null;

  let rubyAncestor = (
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  )?.closest('ruby');

  while (rubyAncestor) {
    result = rubyAncestor;
    rubyAncestor = rubyAncestor.parentElement?.closest('ruby');
  }

  return result;
}

// ----------------------------------------------------------------------------
//
// Source context helpers
//
// ----------------------------------------------------------------------------

class SourceContextBuilder {
  private target: Array<string | SourceRuby> = [];
  private preferredRtLevel: number;

  // Track our ruby state
  private rubyContext: {
    ruby: SourceRuby;
    rubyElement: HTMLElement;
    rtElement: HTMLElement | null;
    rtLevel: number;
  } | null = null;

  constructor(target: Array<string | SourceRuby>, rtLevel: number) {
    this.target = target;
    this.preferredRtLevel = rtLevel;
  }

  static InheritExistingRubyContext(
    target: Array<string | SourceRuby>,
    other: SourceContextBuilder
  ) {
    const result = new SourceContextBuilder(target, other.preferredRtLevel);
    result.rubyContext = other.rubyContext;
    other.rubyContext = null;
    return result;
  }

  flush() {
    if (this.rubyContext) {
      this.target.push(this.rubyContext.ruby);
      this.rubyContext = null;
    }
  }

  add(node: Node, offset: number = 0) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (
        this.rubyContext &&
        (node as Element).tagName === 'RT' &&
        getRtLevel(node) === this.rubyContext.rtLevel
      ) {
        // Handle missing base span
        if (this.rubyContext.rtElement) {
          this.rubyContext.ruby.base.push('');
        }
        this.rubyContext.ruby.transcription.push('');
        this.rubyContext.rtElement = node as HTMLElement;
      }

      return;
    }

    const textNode = node as Text;
    const rubyElement = getOutermostRuby(node);

    // Case 1: Not inside a ruby
    if (!rubyElement) {
      this.flush();
      this.target.push(
        normalizeSourceContextText(textNode.data.substring(offset))
      );
      return;
    }

    // Case 2: Inside an <rp> element - ignore
    if (textNode.parentElement?.closest('rp')) {
      return;
    }

    const nodeRtLevel = getRtLevel(node);
    const textContent = normalizeSourceContextText(textNode.data);

    // Case 3: Inside ruby base text
    if (nodeRtLevel === 0) {
      if (!this.rubyContext || this.rubyContext.rubyElement !== rubyElement) {
        this.flush();

        const rubyLevel = getRubyLevel(node);
        const rtLevel = Math.min(this.preferredRtLevel, rubyLevel) || rubyLevel;

        this.rubyContext = {
          ruby: { base: [textContent], transcription: [] },
          rubyElement,
          rtElement: null,
          rtLevel,
        };
      } else if (this.rubyContext.rtElement) {
        this.rubyContext.ruby.base.push(textContent);
        this.rubyContext.rtElement = null;
      } else {
        const last = this.rubyContext.ruby.base.at(-1) || '';
        this.rubyContext.ruby.base.splice(-1, 1, last + textContent);
      }
      return;
    }

    // Case 4: Inside ruby transcription text
    if (this.rubyContext && nodeRtLevel !== this.rubyContext.rtLevel) {
      // If we started inside an <rt> element but at a different level of
      // nesting, then we ignore this text.
      return;
    }

    const rtElement = node.parentElement!.closest('rt') as HTMLElement;
    if (!this.rubyContext || this.rubyContext.rubyElement !== rubyElement) {
      this.flush();
      this.rubyContext = {
        ruby: { base: [''], transcription: [textContent] },
        rubyElement,
        rtElement,
        rtLevel: Math.min(nodeRtLevel, this.preferredRtLevel) || nodeRtLevel,
      };
    } else if (this.rubyContext.rtElement === rtElement) {
      const last = this.rubyContext.ruby.transcription.at(-1) || '';
      this.rubyContext.ruby.transcription.splice(-1, 1, last + textContent);
    } else {
      this.rubyContext.ruby.transcription.push(textContent);
      this.rubyContext.rtElement = rtElement;
    }
  }

  inSameRubyElement(other: HTMLElement | null) {
    return this.rubyContext && this.rubyContext.rubyElement === other;
  }

  getRubyOffset(inTranscription: boolean) {
    if (!this.rubyContext) {
      return 0;
    }

    const parts = inTranscription
      ? this.rubyContext.ruby.transcription
      : this.rubyContext.ruby.base;
    return parts.reduce((sum, part) => sum + part.length, 0);
  }
}

function normalizeSourceContextText(text: string) {
  return normalizeContext(collapseWhitespace(text))[0];
}

function collapseWhitespace(text: string) {
  // We could make this take the corresponding Text node and look at the
  // computed value of `white-space-collapse` and not collapse whitespaces if
  // it's set to `preserve` or `preserve-spaces` but since we don't currently
  // preserve newlines in any case it's hard to imagine a situation where that
  // would actually be useful. (If we preserved spaces, we could imagine poetry
  // etc. being relevant.)
  //
  // Also, although we read computed styles in some other places, in general
  // we prefer to avoid it in case we end up triggering a style flush.
  return text.replace(/[\r\n]/g, '').replace(/\s+/g, ' ');
}
