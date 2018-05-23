/*

  Rikaichamp
  by Brian Birtles
  https://github.com/birtles/rikaichamp

  ---

  Originally based on Rikaikun
  by Erek Speed
  http://code.google.com/p/rikaikun/

  ---

  Originally based on Rikaichan 1.07
  by Jonathan Zarate
  http://www.polarcloud.com/

  ---

  Originally based on RikaiXUL 0.4 by Todd Rudick
  http://www.rikai.com/
  http://rikaixul.mozdev.org/

  ---

  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 2 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

  ---

  Please do not change or remove any of the copyrights or links to web pages
  when modifying any of the files. - Jon

*/

interface Window {
  rikaichamp: any;
}

interface ParentNode {
  append(...nodes: (Node | string)[]): void;
}

interface ChildNode {
  remove(): void;
}

interface CaretPosition {
  readonly offsetNode: Node;
  readonly offset: number;
}

interface Document {
  caretPositionFromPoint(x: number, y: number): CaretPosition | null;
}

interface NodeIterator {
  readonly referenceNode?: Node;
}

interface HTMLTextAreaElement {
  selectionDirection: string;
}

// Either end of a Range object
interface RangeEndpoint {
  container: Node;
  offset: number;
}

interface GetTextResult {
  text: string;
  // Contains the node and offset where the selection starts. This will be null
  // if, for example, the result is the text from an element's title attribute.
  rangeStart: RangeEndpoint | null;
  // Contains the node and offset for each the text containing node in the
  // maximum selected range.
  rangeEnds: RangeEndpoint[];
}

interface CachedGetTextResult {
  result: GetTextResult;
  position: CaretPosition | null;
  point: { x: number; y: number };
}

const isTextInputNode = (
  node: Node | null
): node is HTMLInputElement | HTMLTextAreaElement => {
  const allowedInputTypes = [
    'button',
    'email',
    'search',
    'submit',
    'text',
    'url',
  ];
  return (
    !!node &&
    node.nodeType === Node.ELEMENT_NODE &&
    (((<Element>node).tagName === 'INPUT' &&
      allowedInputTypes.includes((<HTMLInputElement>node).type)) ||
      (<Element>node).tagName === 'TEXTAREA')
  );
};

const isInclusiveAncestor = (ancestor: Element, testNode?: Node): boolean => {
  if (!testNode) {
    return false;
  }

  let node: Node | null = testNode;
  do {
    if (node === ancestor) {
      return true;
    }
    node = node.parentElement;
  } while (node);

  return false;
};

interface Focusable {
  focus(): void;
}

// Both HTMLElement and SVGElement interfaces have a focus() method but I guess
// Edge doesn't currently support focus() on SVGElement so we just duck-type
// this.
const isFocusable = (element?: any): element is Focusable =>
  element && typeof element.focus === 'function' && element.focus.length === 0;

const SVG_NS = 'http://www.w3.org/2000/svg';

const isForeignObjectElement = (
  elem: Element | null
): elem is SVGForeignObjectElement =>
  !!elem &&
  elem.namespaceURI === SVG_NS &&
  elem.nodeName.toUpperCase() === 'FOREIGNOBJECT';

// lib.d.ts definitions are out of date and don't support the options object
// (TypeScript issue #18136, will be fixed in TypeScript 2.7)
interface HTMLLinkElement {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    useCapture?: boolean | AddEventListenerOptions
  ): void;
}

const styleSheetLoad = (link: HTMLLinkElement): Promise<void> =>
  new Promise(resolve => {
    link.addEventListener(
      'load',
      // We can't just pass |resolve| directly here because TypeScript doesn't
      // like it.
      () => {
        resolve();
      },
      { once: true }
    );
  });

class RikaiContent {
  static MAX_LENGTH = 13;

  _config: ContentConfig;

  // Lookup tracking (so we can avoid redundant work and so we can re-render)
  _currentTextAtPoint: CachedGetTextResult | null = null;
  _currentSearchResult: SearchResult | null = null;
  _currentTarget: Element | null = null;
  _currentTitle: string | null = null;

  // Highlight tracking
  _selectedWindow: Window | null = null;
  _selectedText: string | null = null;
  _selectedTextBox: {
    node: HTMLInputElement | HTMLTextAreaElement;
    previousStart: number | null;
    previousEnd: number | null;
    previousDirection: string | null;
    previousFocus?: Element;
  } | null = null;

  // Key tracking
  _keysDown: Set<string> = new Set();

  // Mouse tracking
  static MOUSE_SPEED_SAMPLES = 2;
  static MOUSE_SPEED_THRESHOLD = 0.2;
  _mouseSpeedRollingSum: number = 0;
  _mouseSpeeds: number[] = [];
  _previousMousePosition: { x: number; y: number } | null = null;
  _previousMouseMoveTime: number | null = null;

  constructor(config: ContentConfig) {
    this._config = config;

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  get config() {
    return { ...this._config };
  }

  set config(config) {
    // Update the style of the popup
    if (config.popupStyle !== this._config.popupStyle) {
      const popup = document.getElementById('rikaichamp-window');
      if (popup) {
        popup.classList.remove(`-${this._config.popupStyle}`);
        popup.classList.add(`-${config.popupStyle}`);
      }
    }

    // TODO: We should probably check which keys have changed and regenerate
    // the pop-up if needed but currently you need to change tabs to tweak
    // the config so the popup probably won't be showing anyway.
    this._config = config;
  }

  detach() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.clearHighlight(null);
    this._selectedTextBox = null;

    // On at least one occassion I've seen an old window element hanging around.
    // Not sure why this happenned yet but for now let's just be sure to
    // completely remove ourselves.
    let cssElem = document.getElementById('rikaichamp-css');
    while (cssElem) {
      cssElem.remove();
      cssElem = document.getElementById('rikaichamp-css');
    }

    let popup = document.getElementById('rikaichamp-window');
    while (popup) {
      // If we are in an SVG document, remove the wrapping <foreignObject>.
      if (isForeignObjectElement(popup.parentElement)) {
        popup.parentElement.remove();
      } else {
        popup.remove();
      }
      popup = document.getElementById('rikaichamp-window');
    }
  }

  onMouseMove(ev: MouseEvent) {
    // Ignore mouse events while buttons are being pressed.
    if (ev.buttons) {
      return;
    }

    const now = performance.now();
    let averageSpeed = 0;

    if (this._previousMousePosition && this._previousMouseMoveTime) {
      const distance = Math.sqrt(
        Math.pow(ev.pageX - this._previousMousePosition.x, 2) +
          Math.pow(ev.pageY - this._previousMousePosition.y, 2)
      );
      const speed = distance / (now - this._previousMouseMoveTime);

      this._mouseSpeeds.push(speed);
      this._mouseSpeedRollingSum += speed;

      if (this._mouseSpeeds.length > RikaiContent.MOUSE_SPEED_SAMPLES) {
        this._mouseSpeedRollingSum -= this._mouseSpeeds.shift()!;
      }

      averageSpeed = this._mouseSpeedRollingSum / this._mouseSpeeds.length;
    }

    this._previousMousePosition = { x: ev.pageX, y: ev.pageY };
    this._previousMouseMoveTime = now;

    if (averageSpeed < RikaiContent.MOUSE_SPEED_THRESHOLD) {
      this.tryToUpdatePopup(
        { x: ev.clientX, y: ev.clientY },
        ev.target as Element,
        ev.shiftKey ? DictMode.ForceKanji : DictMode.Default
      );
    } else {
      this.clearHighlight(ev.target as Element);
    }
  }

  onMouseDown(ev: MouseEvent) {
    // If we are changing focus to the textbox where we are highlighting text,
    // then update the previous focus so that we know to ignore keystrokes here.
    if (this._selectedTextBox && ev.target === this._selectedTextBox.node) {
      this._selectedTextBox.previousFocus = ev.target as Element;
    }

    // Clear the highlight since it inteferes with selection.
    this.clearHighlight(ev.target as Element);
  }

  onKeyDown(ev: KeyboardEvent) {
    // If we got shift in combination with something else, ignore.
    if (ev.shiftKey && ev.key !== 'Shift') {
      return;
    }

    // If we've already processed this key, ignore.
    // (We could just use 'keypress' except it doesn't fire for 'Shift' etc.
    // which we need to handle.)
    if (this._keysDown.has(ev.key)) {
      return;
    }

    // If we're not visible we should ignore any keystrokes.
    if (!this.isVisible()) {
      return;
    }

    // If the user explicitly focused the current text box, ignore any
    // keystrokes.
    if (
      this._selectedTextBox &&
      this._selectedTextBox.node === this._selectedTextBox.previousFocus
    ) {
      return;
    }

    if (this._config.keys.nextDictionary.includes(ev.key)) {
      if (this._currentTextAtPoint && this._currentTarget) {
        this.tryToUpdatePopup(
          this._currentTextAtPoint.point,
          this._currentTarget,
          DictMode.NextDict
        );
      }
    } else if (this._config.keys.toggleDefinition.includes(ev.key)) {
      browser.runtime.sendMessage({ type: 'toggleDefinition' });
      // We'll eventually get notified of the config change but we just change
      // it here now so we can update the popup immediately.
      this._config.readingOnly = !this.config.readingOnly;
      if (this._currentSearchResult) {
        this.showPopup();
      }
    } else {
      return;
    }

    this._keysDown.add(ev.key);

    ev.preventDefault();
  }

  onKeyUp(ev: KeyboardEvent) {
    this._keysDown.delete(ev.key);
  }

  isVisible(): boolean {
    const popup = document.getElementById('rikaichamp-window');
    return !!popup && !popup.classList.contains('hidden');
  }

  async tryToUpdatePopup(
    point: { x: number; y: number },
    target: Element,
    dictOption: DictMode
  ) {
    const previousTextAtPoint = this._currentTextAtPoint
      ? this._currentTextAtPoint.result
      : null;
    const textAtPoint = this.getTextAtPoint(point, RikaiContent.MAX_LENGTH);
    console.assert(
      (!textAtPoint && !this._currentTextAtPoint) ||
        (!!this._currentTextAtPoint &&
          textAtPoint === this._currentTextAtPoint.result),
      'Should have updated _currentTextAtPoint'
    );

    if (
      previousTextAtPoint === textAtPoint &&
      // This following line is not strictly correct. If the previous dictionary
      // mode was 'ForceKanji' and now it's 'Default' we shouldn't return early.
      // To fix that we'd need to store the previous dictionary mode. Basically
      // this whole DictMode approach is pretty awful and we should just make
      // the client aware of which dictionary it's looking at and manage state
      // here.
      (dictOption === DictMode.Same || dictOption === DictMode.Default)
    ) {
      return;
    }

    if (!textAtPoint) {
      this.clearHighlight(target);
      return;
    }

    const wordLookup: boolean = textAtPoint.rangeStart !== null;

    let message;
    if (wordLookup) {
      message = {
        type: 'xsearch',
        text: textAtPoint.text,
        dictOption,
      };
    } else {
      message = {
        type: 'translate',
        title: textAtPoint.text,
      };
    }

    const searchResult: SearchResult = await browser.runtime.sendMessage(
      message
    );

    // Check if we have triggered a new query or been disabled in the meantime.
    if (
      !this._currentTextAtPoint ||
      textAtPoint !== this._currentTextAtPoint.result
    ) {
      return;
    }

    if (!searchResult) {
      this.clearHighlight(target);
      return;
    }

    if (wordLookup) {
      const matchLen = (searchResult as WordSearchResult).matchLen || 1;
      this.highlightText(textAtPoint, matchLen);
    }

    this._currentSearchResult = searchResult;
    this._currentTarget = target;

    if (wordLookup) {
      this._currentTitle = null;
    } else {
      let title = textAtPoint.text.substr(
        0,
        (searchResult as TranslateResult).textLen
      );
      if (textAtPoint.text.length > (searchResult as TranslateResult).textLen) {
        title += '...';
      }
      this._currentTitle = title;
    }

    this.showPopup();
  }

  getTextAtPoint(
    point: {
      x: number;
      y: number;
    },
    maxLength?: number
  ): GetTextResult | null {
    let position: CaretPosition | null;
    if (document.caretPositionFromPoint) {
      position = document.caretPositionFromPoint(point.x, point.y);
    } else {
      const range = document.caretRangeFromPoint(point.x, point.y);
      position = range
        ? {
            offsetNode: range.startContainer,
            offset: range.startOffset,
          }
        : null;
    }

    if (
      position &&
      this._currentTextAtPoint &&
      this._currentTextAtPoint.position &&
      position.offsetNode === this._currentTextAtPoint.position.offsetNode &&
      position.offset === this._currentTextAtPoint.position.offset
    ) {
      return this._currentTextAtPoint.result;
    }

    // If we have a textual <input> node or a <textarea> we synthesize a
    // text node and use that for finding text since it allows us to re-use
    // the same handling for text nodes and 'value' attributes.

    let startNode: Node | null = position ? position.offsetNode : null;
    if (isTextInputNode(startNode)) {
      // If we selected the end of the text, skip it.
      if (position!.offset === startNode.value.length) {
        this._currentTextAtPoint = null;
        return null;
      }
      startNode = document.createTextNode(startNode.value);
    }

    // Try handling as a text node

    const isTextNode = (node: Node | null): node is CharacterData => {
      return !!node && node.nodeType === Node.TEXT_NODE;
    };

    if (isTextNode(startNode)) {
      // Due to line wrapping etc. sometimes caretPositionFromPoint can return
      // a point far away from the cursor.
      //
      // We don't need to do this for synthesized text nodes, however, since we
      // assume we'll be within their bounds.
      const distanceResult = this.getDistanceFromTextNode(
        startNode,
        position!.offset,
        point
      );
      if (distanceResult) {
        // If we're more than about three characters away, don't show the
        // pop-up.
        const { distance, glyphExtent } = distanceResult;
        if (distance > glyphExtent * 3) {
          this._currentTextAtPoint = null;
          return null;
        }
      }

      const result = this.getTextFromTextNode(
        startNode,
        position!.offset,
        point,
        maxLength
      );
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

        this._currentTextAtPoint = {
          result,
          position: position!,
          point,
        };
        return result;
      }
    }

    // Otherwise just pull whatever text we can off the element

    const elem = document.elementFromPoint(point.x, point.y);
    if (elem) {
      const text = this.getTextFromRandomElement(elem);
      if (text) {
        const result: GetTextResult = {
          text,
          rangeStart: null,
          rangeEnds: [],
        };
        this._currentTextAtPoint = {
          result,
          position: null,
          point,
        };

        return result;
      }
    }

    // We haven't found anything, but if the cursor hasn't moved far we should
    // just re-use the last result so the user doesn't have try to keep the
    // mouse over the text precisely in order to read the result.

    if (this._currentTextAtPoint) {
      const dx = this._currentTextAtPoint.point.x - point.x;
      const dy = this._currentTextAtPoint.point.y - point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4) {
        return this._currentTextAtPoint.result;
      }
    }

    this._currentTextAtPoint = null;
    return null;
  }

  getDistanceFromTextNode(
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

    // Ignore SVG content (it doesn't normally need distance checking, and
    // getBoundingClientRect is unreliable for SVG content due to bugs like bug
    // 1426594).
    if (startNode.parentElement.namespaceURI === SVG_NS) {
      return null;
    }

    // Ignore vertical writing. This is temporary until Mozilla bug 1159309 is
    // fixed.
    const computedStyle = getComputedStyle(startNode.parentElement);
    if (computedStyle.writingMode !== 'horizontal-tb') {
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

  getTextFromTextNode(
    startNode: CharacterData,
    startOffset: number,
    point: {
      x: number;
      y: number;
    },
    maxLength?: number
  ): GetTextResult | null {
    // TODO: Factor in the manual offset from the "next word" feature?

    const isRubyAnnotationElement = (element: Element | null) => {
      if (!element) {
        return false;
      }

      const tag = element.tagName.toLowerCase();
      return tag === 'rp' || tag === 'rt';
    };

    const isInline = (element: Element | null) =>
      element &&
      ['inline', 'ruby'].includes(getComputedStyle(element).display!);

    // Get the ancestor node for all inline nodes
    let inlineAncestor = startNode.parentElement;
    while (
      isInline(inlineAncestor) &&
      !isRubyAnnotationElement(inlineAncestor)
    ) {
      inlineAncestor = inlineAncestor!.parentElement;
    }

    // Check that our ancestor is, in fact, an ancestor of the point we're
    // looking at. (Sometimes caretPositionFromPoint can be too helpful and can
    // choose an element far away.)
    if (
      inlineAncestor &&
      !isInclusiveAncestor(
        inlineAncestor,
        document.elementFromPoint(point.x, point.y)
      )
    ) {
      return null;
    }

    // Skip ruby annotation elements when traversing. However, don't do that
    // if the inline ancestor is itself a ruby annotation element or else
    // we'll never be able to find the starting point within the tree walker.
    let filter: NodeFilter | undefined;
    if (!isRubyAnnotationElement(inlineAncestor)) {
      filter = {
        acceptNode: node =>
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
      console.error('Could not find node in tree');
      console.log(startNode);
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

    let result: GetTextResult | null = {
      text: '',
      rangeStart: {
        // If we're operating on a synthesized text node, use the actual
        // start node.
        container: node,
        offset: offset,
      },
      rangeEnds: [],
    };

    // Look for range ends
    do {
      // Search for non-Japanese text (or a delimiter of some sort even if it
      // is "Japanese" in the sense of being full-width).
      //
      // * U+25CB is 'white circle' often used to represent a blank
      //   (U+3007 is an ideographic zero that is also sometimes used for this
      //   purpose, but this is included in the U+3001~U+30FF range.)
      // * U+3000~U+30FF is ideographic punctuation but we skip U+3000
      //   (ideographic space), U+3001 (、 ideographic comma), U+3002
      //   (。 ideographic full stop), and U+3003 (〃 ditto mark) since these
      //   are typically only going to delimit words.
      // * U+3041~U+309F is the hiragana range
      // * U+30A0~U+30FF is the katakana range
      // * U+3400~U+4DBF is the CJK Unified Ideographs Extension A block (rare
      //   kanji)
      // * U+4E00~U+9FFF is the CJK Unified Ideographs block ("the kanji")
      // * U+F900~U+FAFF is the CJK Compatibility Ideographs block (random odd
      //   kanji, because standards)
      // * U+FF61~U+FF65 is some halfwidth ideographic symbols, e.g. ｡ but we
      //   skip them (although previus rikai-tachi included them) since
      //   they're mostly going to be delimiters
      // * U+FF66~U+FF9F is halfwidth katakana
      //
      const nonJapaneseOrDelimiter = /[^\u25cb\u3004-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;

      const nodeText = node.data.substr(offset);
      let textEnd = nodeText.search(nonJapaneseOrDelimiter);

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
        // The text node has disallowed characters mid-way through. Return up
        // to that point or maxLength, whichever comes first.
        result.text += nodeText.substr(0, textEnd);
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

    return result;
  }

  getTextFromRandomElement(elem: Element): string | null {
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

  highlightText(textAtPoint: GetTextResult, matchLen: number) {
    // TODO: Record when the mouse is down and don't highlight in that case
    //       (I guess that would interfere with selecting)

    if (this._config.noTextHighlight || !textAtPoint.rangeStart) {
      return;
    }

    this._selectedWindow =
      textAtPoint.rangeStart.container.ownerDocument.defaultView;

    // Check that the window wasn't closed since we started the lookup
    if (this._selectedWindow.closed) {
      this.clearHighlight(null);
      return;
    }

    // Check if there is already something selected in the page that is *not*
    // what we selected. If there is, leave it alone.
    const selection = this._selectedWindow.getSelection();
    if (selection.toString() && selection.toString() !== this._selectedText) {
      this._selectedText = null;
      return;
    }

    // Handle textarea/input selection separately since those elements have
    // a different selection API.
    if (isTextInputNode(textAtPoint.rangeStart.container)) {
      const node: HTMLInputElement | HTMLTextAreaElement =
        textAtPoint.rangeStart.container;
      const start = textAtPoint.rangeStart.offset;
      const end = start + matchLen;

      // If we were previously interacting with a different text box, restore
      // its range.
      if (this._selectedTextBox && node !== this._selectedTextBox.node) {
        this._restoreTextBoxSelection();
      }

      // If we were not already interacting with this text box, store its
      // existing range and focus it.
      if (!this._selectedTextBox || node !== this._selectedTextBox.node) {
        // Transfer the previous focus, if we have one, otherwise use the
        // currently focused element in the document.
        const previousFocus = this._selectedTextBox
          ? this._selectedTextBox.previousFocus
          : document.activeElement;
        node.focus();
        this._selectedTextBox = {
          node,
          previousStart: node.selectionStart,
          previousEnd: node.selectionEnd,
          previousDirection: node.selectionDirection,
          previousFocus,
        };
      }

      // Store the current scroll range so we can restore it.
      const { scrollTop, scrollLeft } = node;

      // Clear any other selection happenning in the page.
      selection.removeAllRanges();

      node.setSelectionRange(start, end);
      this._selectedText = node.value.substring(start, end);

      // Restore the scroll range. We need to do this on the next tick or else
      // something else (not sure what) will clobber it.
      requestAnimationFrame(() => {
        node.scrollLeft = scrollLeft;
        node.scrollTop = scrollTop;
      });
    } else {
      // If we were previously interacting with a text box, restore its range
      // and blur it.
      this._clearTextBoxSelection(null);

      const startNode = textAtPoint.rangeStart.container;
      const startOffset = textAtPoint.rangeStart.offset;
      let endNode = startNode;
      let endOffset = startOffset;

      let currentLen = 0;
      for (
        let i = 0;
        currentLen < matchLen && i < textAtPoint.rangeEnds.length;
        i++
      ) {
        const initialOffset = i == 0 ? startOffset : 0;
        endNode = textAtPoint.rangeEnds[i].container;
        const len = Math.min(
          textAtPoint.rangeEnds[i].offset - initialOffset,
          matchLen - currentLen
        );
        endOffset = initialOffset + len;
        currentLen += len;
      }

      const range = startNode.ownerDocument.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);

      const selection = this._selectedWindow.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      this._selectedText = selection.toString();
    }
  }

  clearHighlight(currentElement: Element | null) {
    this._currentTextAtPoint = null;
    this._currentSearchResult = null;
    this._currentTarget = null;
    this._currentTitle = null;

    if (this._selectedWindow && !this._selectedWindow.closed) {
      const selection = this._selectedWindow.getSelection();
      if (
        !selection.toString() ||
        selection.toString() === this._selectedText
      ) {
        selection.removeAllRanges();
      }

      this._clearTextBoxSelection(currentElement);
    }

    this._selectedWindow = null;
    this._selectedText = null;

    // Hide popup
    const popup = document.getElementById('rikaichamp-window');
    if (popup) {
      popup.classList.add('hidden');
    }
  }

  _clearTextBoxSelection(currentElement: Element | null) {
    if (!this._selectedTextBox) {
      return;
    }

    const textBox = this._selectedTextBox.node;

    // Store the previous scroll position so we can restore it, if need be.
    const { scrollTop, scrollLeft } = textBox;

    this._restoreTextBoxSelection();

    // If we are still interacting with the textBox, make sure to maintain its
    // scroll position (rather than jumping back to wherever the restored
    // selection is just because we didn't find a match).
    if (currentElement === textBox) {
      // As before, we need to restore this in the next tick or else it will get
      // clobbered.
      requestAnimationFrame(() => {
        textBox.scrollLeft = scrollLeft;
        textBox.scrollTop = scrollTop;
      });
    }

    // Otherwise, if we only focussed the textbox in order to highlight text,
    // restore the previous focus.
    if (
      isFocusable(this._selectedTextBox.previousFocus) &&
      this._selectedTextBox.previousFocus !== textBox
    ) {
      // First blur the text box since some Elements' focus() method does
      // nothing.
      this._selectedTextBox.node.blur();
      this._selectedTextBox.previousFocus.focus();
    }

    this._selectedTextBox = null;
  }

  _restoreTextBoxSelection() {
    if (!this._selectedTextBox) {
      return;
    }

    const textBox = this._selectedTextBox.node;
    textBox.selectionStart = this._selectedTextBox.previousStart;
    textBox.selectionEnd = this._selectedTextBox.previousEnd;
    textBox.selectionDirection = this._selectedTextBox.previousDirection;
  }

  async showPopup() {
    const referencePosition = this._currentTextAtPoint
      ? this._currentTextAtPoint.point
      : null;

    const fragment = this.makeHtmlForResult(
      this._currentSearchResult,
      this._currentTitle
    );
    if (!fragment) {
      this.clearHighlight(this._currentTarget);
      return;
    }

    const doc: Document = this._currentTarget
      ? this._currentTarget.ownerDocument
      : window.document;
    const isSvg = doc.documentElement.namespaceURI === SVG_NS;

    let popup = doc.getElementById('rikaichamp-window');
    // If there is an existing popup, clear it.
    if (popup) {
      while (popup.firstChild) {
        (<Element | CharacterData>popup.firstChild).remove();
      }
      // Restore display property if it was hidden.
      popup.classList.remove('hidden');
      // Otherwise, make a new popup element.
    } else {
      // For SVG documents we put both the <link> and <div> inside
      // a <foreignObject>. This saves us messing about with xml-stylesheet
      // processing instructions.
      let wrapperElement = null;
      if (isSvg) {
        const foreignObject = doc.createElementNS(SVG_NS, 'foreignObject');
        foreignObject.setAttribute('width', '600');
        foreignObject.setAttribute('height', '100%');
        doc.documentElement.append(foreignObject);
        wrapperElement = foreignObject;
      }

      // Add <style> element with popup CSS
      // (One day I hope Web Components might less us scope this now
      // that scoped stylesheets are dead.)
      const cssHref = browser.extension.getURL('css/popup.css');
      const link = doc.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('type', 'text/css');
      link.setAttribute('href', cssHref);
      link.setAttribute('id', 'rikaichamp-css');

      const linkContainer = wrapperElement || doc.head || doc.documentElement;
      linkContainer.appendChild(link);

      // Wait for the stylesheet to load so we can get a reliable width for the
      // popup and position it correctly.
      await styleSheetLoad(link);

      // Add the popup div
      popup = doc.createElement('div');
      popup.setAttribute('id', 'rikaichamp-window');
      popup.classList.add(`-${this._config.popupStyle}`);

      const popupContainer = wrapperElement || doc.documentElement;
      doc.documentElement.append(popup);

      // Previous rikai-tachi added a double-click listener here that
      // would hide the popup but how can you ever click it if it
      // updates on mousemove? Maybe a previous version had another way
      // of triggering it?
    }

    popup.append(fragment);

    // Position the popup
    const popupWidth = popup.offsetWidth || 200;
    const popupHeight = popup.offsetHeight;

    const getRefCoord = (coord: 'x' | 'y'): number =>
      referencePosition && !isNaN(parseInt(referencePosition[coord] as any))
        ? parseInt(referencePosition[coord] as any)
        : 0;
    let popupX = getRefCoord('x');
    let popupY = getRefCoord('y');

    if (this._currentTarget) {
      // Horizontal position: Go left if necessary
      //
      // (We should never be too far left since popupX, if set to
      // something non-zero, is coming from a mouse event which should
      // be positive.)
      if (popupX + popupWidth > doc.defaultView.innerWidth - 20) {
        popupX = doc.defaultView.innerWidth - popupWidth - 20;
        if (popupX < 0) {
          popupX = 0;
        }
      }

      // Vertical position: Position below the mouse cursor
      let verticalAdjust = 25;

      // If the element has a title, then there will probably be
      // a tooltip that we shouldn't cover up.
      if ((this._currentTarget as any).title) {
        verticalAdjust += 20;
      }

      // Check if we are too close to the bottom
      if (popupY + verticalAdjust + popupHeight > doc.defaultView.innerHeight) {
        // We are, try going up instead...
        const topIfWeGoUp = popupY - popupHeight - 30;
        if (topIfWeGoUp >= 0) {
          verticalAdjust = topIfWeGoUp - popupY;
        }
        // If can't go up, we should still go down to prevent blocking
        // the cursor.
      }

      popupY += verticalAdjust;

      // Adjust for scroll position
      popupX += doc.defaultView.scrollX;
      popupY += doc.defaultView.scrollY;
    }

    // This is only needed because Edge's WebIDL definitions are wrong
    // (they have documentElement as having type HTMLElement)
    const isSVGSVGElement = (elem: Element | null): elem is SVGSVGElement =>
      !!elem &&
      elem.namespaceURI === SVG_NS &&
      elem.nodeName.toUpperCase() === 'SVG';

    if (
      isSvg &&
      isSVGSVGElement(doc.documentElement) &&
      isForeignObjectElement(popup.parentElement)
    ) {
      // Set the x/y attributes on the <foreignObject> wrapper after converting
      // to document space.
      const svg: SVGSVGElement = doc.documentElement;
      const wrapper: SVGForeignObjectElement = popup.parentElement;
      wrapper.x.baseVal.value = popupX;
      wrapper.y.baseVal.value = popupY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const transform = svg.createSVGTransformFromMatrix(ctm.inverse());
        wrapper.transform.baseVal.initialize(transform);
      }
    } else {
      popup.style.left = `${popupX}px`;
      popup.style.top = `${popupY}px`;
    }
  }

  makeHtmlForResult(
    result: SearchResult | null,
    title: string | null
  ): DocumentFragment | null {
    if (!result) {
      return null;
    }

    const isKanjiEntry = (result: SearchResult): result is KanjiEntry =>
      (result as KanjiEntry).kanji !== undefined;

    if (isKanjiEntry(result)) {
      return this.makeHtmlForKanji(result);
    }

    const isNamesEntry = (result: SearchResult): result is WordSearchResult =>
      (result as WordSearchResult).names !== undefined;

    if (isNamesEntry(result)) {
      return this.makeHtmlForNames(result);
    }

    return this.makeHtmlForWords(result, title);
  }

  makeHtmlForWords(
    result: WordSearchResult | TranslateResult,
    title: string | null
  ): DocumentFragment {
    const fragment = document.createDocumentFragment();

    if (title) {
      const titleDiv = document.createElement('div');
      fragment.append(titleDiv);
      titleDiv.classList.add('w-title');
      titleDiv.append(title);
    }

    // Pre-process entries, parsing them and combining them when the kanji and
    // definition match.
    //
    // Each dictionary entry has the format:
    //
    //   仔クジラ [こくじら] /(n) whale calf/
    //
    // Or without kana reading:
    //
    //   あっさり /(adv,adv-to,vs,on-mim) easily/readily/quickly/(P)/
    //
    interface DisplayEntry {
      kanjiKana: string;
      kana: string[];
      definition: string;
      reason: string | null;
    }
    const entries: DisplayEntry[] = [];
    for (const [dictEntry, reason] of result.data) {
      const matches = dictEntry.match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
      if (!matches) {
        continue;
      }
      const [kanjiKana, kana, definition] = matches.slice(1);

      // Combine with previous entry if both kanji and definition match.
      const prevEntry = entries.length ? entries[entries.length - 1] : null;
      if (
        prevEntry &&
        prevEntry.kanjiKana === kanjiKana &&
        prevEntry.definition === definition
      ) {
        if (kana) {
          prevEntry.kana.push(kana);
        }
        continue;
      }

      const entry: DisplayEntry = {
        kanjiKana,
        kana: [],
        definition,
        reason,
      };
      if (kana) {
        entry.kana.push(kana);
      }
      entries.push(entry);
    }

    for (const entry of entries) {
      const kanjiSpan = document.createElement('span');
      fragment.append(kanjiSpan);
      kanjiSpan.classList.add(entry.kana.length ? 'w-kanji' : 'w-kana');
      kanjiSpan.append(entry.kanjiKana);

      for (const kana of entry.kana) {
        if (fragment.lastElementChild!.classList.contains('w-kana')) {
          fragment.append('、 ');
        }
        const kanaSpan = document.createElement('span');
        fragment.append(kanaSpan);
        kanaSpan.classList.add('w-kana');
        kanaSpan.append(kana);
      }

      if (entry.reason) {
        const reasonSpan = document.createElement('span');
        fragment.append(reasonSpan);
        reasonSpan.classList.add('w-conj');
        reasonSpan.append(`(${entry.reason})`);
      }

      if (!this._config.readingOnly) {
        // TODO: Do this with CSS
        fragment.append(document.createElement('br'));
        const definitionSpan = document.createElement('span');
        fragment.append(definitionSpan);
        definitionSpan.classList.add('w-def');
        definitionSpan.append(entry.definition.replace(/\//g, '; '));
      }

      // TODO: Do this with CSS
      fragment.append(document.createElement('br'));
    }

    if (result.more) {
      fragment.append('...');
      // TODO: Do this with CSS
      fragment.append(document.createElement('br'));
    }

    return fragment;
  }

  makeHtmlForNames(result: LookupResult): DocumentFragment {
    const fragment = document.createDocumentFragment();

    const titleDiv = document.createElement('div');
    fragment.append(titleDiv);
    titleDiv.classList.add('w-title');
    titleDiv.append('Names Dictionary');

    // Pre-process entries
    interface DisplayEntry {
      names: { kanji?: string; kana: string }[];
      definition: string;
    }
    const entries: DisplayEntry[] = [];
    for (const [dictEntry] of result.data) {
      // See makeHtmlForWords for an explanation of the format here
      const matches = dictEntry.match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
      if (!matches) {
        continue;
      }
      let [kanjiKana, kana, definition] = matches.slice(1);

      // Sometimes for names when we have a mix of katakana and hiragana we
      // actually have the same format in the definition field, e.g.
      //
      //   あか組４ [あかぐみふぉー] /あか組４ [あかぐみフォー] /Akagumi Four (h)//
      //
      // So we try reprocessing the definition field using the same regex.
      const rematch = definition.match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
      if (rematch) {
        [kanjiKana, kana, definition] = rematch.slice(1);
      }
      const name = kana
        ? { kanji: kanjiKana, kana }
        : { kanji: undefined, kana: kanjiKana };

      // Combine with previous entry if the definitions match.
      const prevEntry = entries.length ? entries[entries.length - 1] : null;
      if (prevEntry && prevEntry.definition === definition) {
        prevEntry.names.push(name);
        continue;
      }

      entries.push({
        names: [name],
        definition,
      });
    }

    const namesTable = document.createElement('table');
    fragment.append(namesTable);
    namesTable.classList.add('w-na-tb');

    const theRow = document.createElement('tr');
    namesTable.append(theRow);

    const theCell = document.createElement('td');
    theRow.append(theCell);

    // TODO: If there are more than four entries, split them into two columns
    // (You should see the code to do this in the original...)

    for (const entry of entries) {
      for (const name of entry.names) {
        if (name.kanji) {
          const kanjiSpan = document.createElement('span');
          theCell.append(kanjiSpan);
          kanjiSpan.classList.add('w-kanji');
          kanjiSpan.append(name.kanji);
        }

        const kanaSpan = document.createElement('span');
        theCell.append(kanaSpan);
        kanaSpan.classList.add('w-kana');
        kanaSpan.append(name.kana);

        // TODO: Do this with CSS
        theCell.append(document.createElement('br'));
      }

      const definitionSpan = document.createElement('span');
      theCell.append(definitionSpan);
      definitionSpan.classList.add('w-def');
      definitionSpan.append(entry.definition.replace(/\//g, '; '));

      // TODO: Do this with CSS
      theCell.append(document.createElement('br'));
    }

    if (result.more) {
      theCell.append('...');
      // TODO: Do this with CSS
      theCell.append(document.createElement('br'));
    }

    return fragment;
  }

  makeHtmlForKanji(entry: KanjiEntry): DocumentFragment {
    // (This is all just temporary. Long term we need to either use some sort of
    // templating system, or, if we can tidy up the markup enough by using more
    // modern CSS instead of relying on <br> elements etc., we might be able to
    // continue using the DOM API directly.)
    const fragment = document.createDocumentFragment();

    // Containing table
    const table = document.createElement('table');
    table.classList.add('k-main-tb');
    fragment.append(table);

    // Top row
    const topRow = document.createElement('tr');
    table.append(topRow);
    const topCell = document.createElement('td');
    topRow.append(topCell);
    topCell.setAttribute('valign', 'top');

    // Summary information
    const summaryTable = document.createElement('table');
    topCell.append(summaryTable);
    summaryTable.classList.add('k-abox-tb');

    const summaryFirstRow = document.createElement('tr');
    summaryTable.append(summaryFirstRow);

    const radicalCell = document.createElement('td');
    summaryFirstRow.append(radicalCell);
    radicalCell.classList.add('k-abox-r');
    radicalCell.append('radical');
    radicalCell.append(document.createElement('br'));
    radicalCell.append(`${entry.radical} ${entry.misc.B}`);

    // Kanji components
    if (entry.components) {
      const componentsTable = document.createElement('table');
      componentsTable.classList.add('k-bbox-tb');
      topCell.append(componentsTable);

      entry.components.forEach((component, index) => {
        const row = document.createElement('tr');
        componentsTable.append(row);

        const radicalCell = document.createElement('td');
        row.append(radicalCell);
        radicalCell.classList.add(`k-bbox-${(index + 1) % 2}a`);
        radicalCell.append(component.radical);

        const readingCell = document.createElement('td');
        row.append(readingCell);
        readingCell.classList.add(`k-bbox-${(index + 1) % 2}b`);
        readingCell.append(component.yomi);

        const englishCell = document.createElement('td');
        row.append(englishCell);
        englishCell.classList.add(`k-bbox-${(index + 1) % 2}b`);
        englishCell.append(component.english);
      });
    }

    const gradeCell = document.createElement('td');
    summaryFirstRow.append(gradeCell);
    gradeCell.classList.add('k-abox-g');
    let grade = document.createDocumentFragment();
    switch (entry.misc.G || '') {
      case '8':
        grade.append('general');
        grade.append(document.createElement('br'));
        grade.append('use');
        break;
      case '9':
        grade.append('name');
        grade.append(document.createElement('br'));
        grade.append('use');
        break;
      default:
        if (isNaN(parseInt(entry.misc.G))) {
          grade.append('-');
        } else {
          grade.append('grade');
          grade.append(document.createElement('br'));
          grade.append(entry.misc.G);
        }
        break;
    }
    gradeCell.append(grade);

    const summarySecondRow = document.createElement('tr');
    summaryTable.append(summarySecondRow);

    const frequencyCell = document.createElement('td');
    summarySecondRow.append(frequencyCell);
    frequencyCell.classList.add('k-abox-f');
    frequencyCell.append('freq');
    frequencyCell.append(document.createElement('br'));
    frequencyCell.append(entry.misc.F || '-');

    const strokesCell = document.createElement('td');
    summarySecondRow.append(strokesCell);
    strokesCell.classList.add('k-abox-s');
    strokesCell.append('strokes');
    strokesCell.append(document.createElement('br'));
    strokesCell.append(entry.misc.S);

    // The kanji itself
    const kanjiSpan = document.createElement('span');
    kanjiSpan.classList.add('k-kanji');
    kanjiSpan.append(entry.kanji);
    topCell.append(kanjiSpan);
    topCell.append(document.createElement('br'));

    // English
    const englishDiv = document.createElement('div');
    englishDiv.classList.add('k-eigo');
    englishDiv.append(entry.eigo);
    topCell.append(englishDiv);

    // Readings
    const yomiDiv = document.createElement('div');
    yomiDiv.classList.add('k-yomi');
    topCell.append(yomiDiv);

    // Readings come in the form:
    //
    //  ヨ、 あた.える、 あずか.る、 くみ.する、 ともに
    //
    // We want to take the bit after the '.' and wrap it in a span with an
    // appropriate class.
    entry.onkun.forEach((reading, index) => {
      if (index !== 0) {
        yomiDiv.append('\u3001');
      }
      const highlightIndex = reading.indexOf('.');
      if (highlightIndex === -1) {
        yomiDiv.append(reading);
      } else {
        yomiDiv.append(reading.substr(0, highlightIndex));
        const highlightSpan = document.createElement('span');
        highlightSpan.classList.add('k-yomi-hi');
        highlightSpan.append(reading.substr(highlightIndex + 1));
        yomiDiv.append(highlightSpan);
      }
    });

    // Optional readings
    if (entry.nanori.length) {
      const nanoriLabelSpan = document.createElement('span');
      nanoriLabelSpan.classList.add('k-yomi-ti');
      nanoriLabelSpan.append('名乗り');
      yomiDiv.append(
        document.createElement('br'),
        nanoriLabelSpan,
        ` ${entry.nanori.join('\u3001')}`
      );
    }

    if (entry.bushumei.length) {
      const bushumeiLabelSpan = document.createElement('span');
      bushumeiLabelSpan.classList.add('k-yomi-ti');
      bushumeiLabelSpan.append('部首名');
      yomiDiv.append(
        document.createElement('br'),
        bushumeiLabelSpan,
        ` ${entry.bushumei.join('\u3001')}`
      );
    }

    // Reference row
    const referenceRow = document.createElement('tr');
    table.append(referenceRow);
    const referenceCell = document.createElement('td');
    referenceRow.append(referenceCell);
    const referenceTable = document.createElement('table');
    referenceTable.classList.add('k-mix-tb');
    referenceCell.append(referenceTable);

    let toggle = 0;
    for (let ref of entry.miscDisplay) {
      const value = entry.misc[ref.abbrev] || '-';

      const row = document.createElement('tr');
      referenceTable.append(row);

      const className = `k-mix-td${(toggle ^= 1)}`;

      const nameCell = document.createElement('td');
      nameCell.classList.add(className);
      nameCell.append(ref.name);
      row.append(nameCell);

      const valueCell = document.createElement('td');
      valueCell.classList.add(className);
      valueCell.append(value);
      row.append(valueCell);
    }

    return fragment;
  }
}

let rikaiContent: RikaiContent | null = null;

// Event Listeners
browser.runtime.onMessage.addListener((request: any) => {
  if (typeof request.type !== 'string') {
    return;
  }

  switch (request.type) {
    case 'enable':
      console.assert(
        typeof request.config === 'object',
        'No config object provided with enable message'
      );
      if (rikaiContent) {
        rikaiContent.config = request.config;
      } else {
        rikaiContent = new RikaiContent(request.config);
      }
      break;

    case 'disable':
      if (rikaiContent) {
        rikaiContent.detach();
        rikaiContent = null;
      }
      break;

    default:
      console.error(`Unrecognized request ${JSON.stringify(request)}`);
      break;
  }
  return false;
});

// When a page first loads, checks to see if it should enable script
//
// Note that the background script might not have been initialized yet in which
// case this will fail. However, presumably once the background script has
// initialized it will call us if we need to be enabled.
browser.runtime.sendMessage({ type: 'enable?' }).catch(() => {
  /* Ignore */
});
