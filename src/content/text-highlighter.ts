import browser from 'webextension-polyfill';

import { HighlightStyle } from '../common/content-config-params';
import { html } from '../utils/builder';
import {
  isContentEditableNode,
  isFocusable,
  isSvg,
  isTextInputNode,
  isVerticalText,
} from '../utils/dom-utils';
import { isChromium } from '../utils/ua-utils';

import {
  clearGdocsHighlight,
  highlightGdocsRange,
  isGdocsSpan,
} from './gdocs-canvas';
import { NodeRange, TextRange } from './text-range';

export class TextHighlighter {
  private selectedWindow: Window | null = null;
  private selectedText: string | null = null;

  // Used to restore the selection of a textbox after we stop interacting
  // with it (since we clobber the text box selection in order to highlight it).
  private selectedTextBox: {
    node: HTMLInputElement | HTMLTextAreaElement;
    previousStart: number | null;
    previousEnd: number | null;
    previousDirection: 'forward' | 'backward' | 'none' | undefined;
  } | null = null;

  // Used restore the selection of a contenteditable node similar to the way
  // we treat text boxes.
  private previousSelection: { node: Node; offset: number } | null;

  // We need to focus a textbox in order to set its selection so we store the
  // previously focussed node so we can restore it after we're done.
  private previousFocus: Element | null;

  // Gross hack to ignore our own focus events.
  private updatingFocus = false;

  constructor() {
    this.onFocusIn = this.onFocusIn.bind(this);
    window.addEventListener('focusin', this.onFocusIn);
  }

  detach() {
    window.removeEventListener('focusin', this.onFocusIn);
    this.clearHighlight();
    this.dropHighlightStyles();
  }

  highlight({
    length,
    textRange,
    style,
  }: {
    length: number;
    textRange: TextRange;
    style?: HighlightStyle;
  }) {
    console.assert(textRange.length, 'Should have a non-empty range');
    const selectedWindow = textRange[0].node.ownerDocument!.defaultView!;

    // Check that the window isn't closed
    if (!selectedWindow || selectedWindow.closed) {
      this.clearHighlight();
      return;
    }

    // Look for an existing selection.
    //
    // If there is no selection, we're probably dealing with an iframe that
    // has now become display:none.
    const selection = selectedWindow.getSelection();
    if (!selection) {
      this.clearHighlight();
      return;
    }

    const canUseHighlightApi = this.canUseHighlightApi({ textRange, length });

    // If there is already something selected in the page that is *not*
    // what we selected then generally want to leave it alone, unless of course
    // we're able to use the CSS Highlight API.
    //
    // The one exception to this is if the selection is in a contenteditable
    // node. In that case we want to store and restore it to mimic the behavior
    // of textboxes.
    if (isContentEditableNode(selection.anchorNode)) {
      if (
        !this.previousSelection &&
        selection.toString() !== this.selectedText
      ) {
        this.storeContentEditableSelection(selectedWindow);
      }
    } else if (
      !canUseHighlightApi &&
      !selection.isCollapsed &&
      selection.toString() !== this.selectedText
    ) {
      this.clearHighlight();
      return;
    }

    // Unconditionally clear any existing CSS highlights since we might end up
    // using regular DOM selections in some cases.
    CSS?.highlights?.delete('tenten-selection');
    CSS?.highlights?.delete('tenten-selection-blue');

    const startNode = textRange[0].node;
    if (isTextInputNode(startNode)) {
      this.highlightTextBox({
        length,
        offset: textRange[0].start,
        selectedWindow,
        textBox: startNode,
      });
    } else if (isGdocsSpan(startNode)) {
      highlightGdocsRange({
        startSpan: startNode,
        offset: textRange[0].start,
        length,
        style,
      });
      this.selectedText = null;
      this.selectedWindow = selectedWindow;
    } else {
      this.highlightRegularNode({
        canUseHighlightApi,
        length,
        selectedWindow,
        style,
        textRange,
      });
    }
  }

  // The optional `currentElement` parameter here indicates the element we are
  // currently interacting with.
  //
  // This is only used when we have been an interacting with a text box.
  // As part of highlighting text in that text box we can cause it to scroll
  // its contents. In particular, when we _clear_ the highlight in the text box
  // we will restore its previous selection, but doing that might scroll the
  // text box. If we are still interacting with that same text box (e.g. the
  // mouse is still over the text box) then we take care not to restore its
  // scroll position.
  clearHighlight({
    currentElement = null,
  }: { currentElement?: Element | null } = {}) {
    if (this.selectedWindow && !this.selectedWindow.closed) {
      // Clear the selection if it's something we made.
      const selection = this.selectedWindow.getSelection();
      if (selection?.toString() && selection.toString() === this.selectedText) {
        if (this.previousSelection) {
          this.restoreContentEditableSelection();
        } else {
          selection.removeAllRanges();
        }
      }

      // Delete any highlight we may have added using the CSS Highlight API.
      CSS?.highlights?.delete('tenten-selection');
      CSS?.highlights?.delete('tenten-selection-blue');
      this.dropHighlightStyles();

      // Likewise any Google docs selection
      clearGdocsHighlight();

      this.clearTextBoxSelection(currentElement);
    }

    this.selectedWindow = null;
    this.selectedText = null;
    this.selectedTextBox = null;
    this.previousFocus = null;
    this.previousSelection = null;
  }

  isUpdatingFocus() {
    return this.updatingFocus;
  }

  private storeContentEditableSelection(selectedWindow: Window) {
    const selection = selectedWindow.getSelection();
    if (selection && isContentEditableNode(selection.anchorNode)) {
      // We don't actually store the full selection, basically because we're
      // lazy. Remembering the cursor position is hopefully good enough for
      // now anyway.
      this.previousSelection = {
        node: selection.anchorNode!,
        offset: selection.anchorOffset,
      };
    } else {
      this.previousSelection = null;
    }
  }

  private restoreContentEditableSelection() {
    if (!this.previousSelection) {
      return;
    }

    const { node, offset } = this.previousSelection;
    const range = node.ownerDocument!.createRange();
    range.setStart(node, offset);
    range.setEnd(node, offset);

    const selection = node.ownerDocument!.defaultView!.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    this.previousSelection = null;
  }

  private highlightTextBox({
    length,
    offset,
    selectedWindow,
    textBox,
  }: {
    length: number;
    offset: number;
    selectedWindow: Window;
    textBox: HTMLInputElement | HTMLTextAreaElement;
  }) {
    const start = offset;
    const end = start + length;

    // If we were previously interacting with a different text box, restore
    // its range.
    if (this.selectedTextBox && textBox !== this.selectedTextBox.node) {
      this.restoreTextBoxSelection();
    }

    // If we were not already interacting with this text box, store its
    // existing range and focus it.
    if (!this.selectedTextBox || textBox !== this.selectedTextBox.node) {
      // Record the original focus if we haven't already, so that we can
      // restore it.
      if (!this.previousFocus) {
        this.previousFocus = document.activeElement;
      }

      // We want to be able to distinguish between changes to focus made by
      // the user/app (which we want to reflect when we go to restore the focus)
      // and changes to focus made by us.
      const previousUpdatingFocus = this.updatingFocus;
      this.updatingFocus = true;
      textBox.focus();
      this.updatingFocus = previousUpdatingFocus;

      this.selectedTextBox = {
        node: textBox,
        previousStart: textBox.selectionStart,
        previousEnd: textBox.selectionEnd,
        previousDirection: textBox.selectionDirection || undefined,
      };
    }

    // Store the current scroll range so we can restore it.
    const { scrollTop, scrollLeft } = textBox;

    // Clear any other selection happening in the page.
    selectedWindow.getSelection()?.removeAllRanges();

    textBox.setSelectionRange(start, end);
    this.selectedText = textBox.value.substring(start, end);
    this.selectedWindow = selectedWindow;

    // Restore the scroll range. We need to do this on the next tick or else
    // something else (not sure what) will clobber it.
    requestAnimationFrame(() => {
      textBox.scrollTo(scrollLeft, scrollTop);
    });
  }

  private clearTextBoxSelection(currentElement: Element | null) {
    if (!this.selectedTextBox) {
      return;
    }

    const textBox = this.selectedTextBox.node;

    // Store the previous scroll position so we can restore it, if need be.
    const { scrollTop, scrollLeft } = textBox;

    this.restoreTextBoxSelection();

    // If we are still interacting with the text box, make sure to maintain its
    // scroll position (rather than jumping back to wherever the restored
    // selection is just because we didn't find a match).
    if (currentElement === textBox) {
      // Restore this in the next tick or else it will get clobbered.
      // (Empirically two ticks seems to work better still.)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          textBox.scrollTo(scrollLeft, scrollTop);
        });
      });
    }

    // If we only focussed the textbox in order to highlight text, restore the
    // previous focus.
    //
    // (We need to do this even if currentElement === textBox since we'll lose
    // the previous focus when we reset _selectedTextBox and we if we don't
    // restore the focus now, when we next go to set previousFocus we'll end up
    // using `textBox` instead.)
    if (isFocusable(this.previousFocus) && this.previousFocus !== textBox) {
      // First blur the text box since some Elements' focus() method does
      // nothing.
      this.selectedTextBox.node.blur();

      // Very hacky approach to filtering out our own focus handling.
      const previousUpdatingFocus = this.updatingFocus;
      this.updatingFocus = true;
      this.previousFocus.focus();
      this.updatingFocus = previousUpdatingFocus;
    }

    this.selectedTextBox = null;
    this.previousFocus = null;
  }

  private restoreTextBoxSelection() {
    if (!this.selectedTextBox) {
      return;
    }

    const {
      node: textBox,
      previousStart,
      previousEnd,
      previousDirection,
    } = this.selectedTextBox;
    textBox.setSelectionRange(previousStart, previousEnd, previousDirection);
  }

  private canUseHighlightApi({
    length,
    textRange,
  }: {
    length: number;
    textRange: TextRange;
  }) {
    if (!CSS?.highlights) {
      return false;
    }

    // We cannot highlight SVG
    for (const { node } of new TextRangeWithLength(textRange, length)) {
      if (isSvg(node)) {
        return false;
      }
    }

    // Chrome can't do highlights properly on vertical text
    //
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1360724
    if (isChromium()) {
      for (const { node } of new TextRangeWithLength(textRange, length)) {
        if (isVerticalText(node)) {
          return false;
        }
      }
    }

    return true;
  }

  private highlightRegularNode({
    canUseHighlightApi,
    length,
    style,
    selectedWindow,
    textRange,
  }: {
    canUseHighlightApi: boolean;
    length: number;
    selectedWindow: Window;
    style?: HighlightStyle;
    textRange: TextRange;
  }) {
    // If we were previously interacting with a text box, restore its range
    // and blur it.
    this.clearTextBoxSelection(null);

    const startNode = textRange[0].node;
    const startOffset = textRange[0].start;
    let endNode = startNode;
    let endOffset = startOffset;

    for (const { node, end } of new TextRangeWithLength(textRange, length)) {
      endNode = node;
      endOffset = end;
    }

    if (canUseHighlightApi) {
      const range = new StaticRange({
        startContainer: startNode,
        startOffset,
        endContainer: endNode,
        endOffset,
      });
      CSS.highlights!.set(
        style === 'blue' ? 'tenten-selection-blue' : 'tenten-selection',
        new Highlight(range)
      );
      this.ensureHighlightStyles();
      this.selectedText = null;
    } else {
      const range = startNode.ownerDocument!.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);

      // We only call this method if selectedWindow.getSelection() is not null.
      this.updatingFocus = true;
      const selection = selectedWindow.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      this.updatingFocus = false;

      this.selectedText = selection.toString();
    }

    this.selectedWindow = selectedWindow;
  }

  private onFocusIn(event: FocusEvent) {
    if (this.updatingFocus) {
      return;
    }

    // Update the previous focus but only if we're already tracking the previous
    // focus.
    if (this.previousFocus && this.previousFocus !== event.target) {
      this.previousFocus =
        event.target instanceof Element ? event.target : null;

      // Possibly updating the selection to restore if we're working with a
      // contenteditable element.
      if (this.previousFocus) {
        this.storeContentEditableSelection(
          this.previousFocus.ownerDocument!.defaultView!
        );
      }
    }
  }

  private ensureHighlightStyles() {
    if (document.getElementById('tenten-selection-styles')) {
      return;
    }

    (document.head || document.documentElement).append(
      html('link', {
        id: 'tenten-selection-styles',
        rel: 'stylesheet',
        href: browser.runtime.getURL('css/selection.css'),
      })
    );
  }

  private dropHighlightStyles() {
    document.getElementById('tenten-selection-styles')?.remove();
  }
}

// Iterator for a TextRange that enforces the supplied length
class TextRangeWithLength implements Iterable<NodeRange> {
  constructor(
    public textRange: TextRange,
    public length: number
  ) {}

  [Symbol.iterator](): Iterator<NodeRange> {
    let i = 0;
    let currentLen = 0;

    return {
      next: () => {
        if (currentLen >= this.length || i >= this.textRange.length) {
          return { done: true, value: undefined };
        }

        const { start, end, node } = this.textRange[i];
        const len = Math.min(end - start, this.length - currentLen);
        currentLen += len;

        i++;

        return { value: { start, end: start + len, node } };
      },
    };
  }
}
