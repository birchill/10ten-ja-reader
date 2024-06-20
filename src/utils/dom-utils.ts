export const SVG_NS = 'http://www.w3.org/2000/svg';
export const HTML_NS = 'http://www.w3.org/1999/xhtml';

export function empty(elem: Element) {
  while (elem.firstChild) {
    (elem.firstChild as any).remove();
  }
}

export function isContentEditableNode(node: Node | null): boolean {
  if (!node) {
    return false;
  }

  const nodeOrParent = nodeOrParentElement(node);
  if (!(nodeOrParent instanceof HTMLElement)) {
    return false;
  }

  let currentNode: HTMLElement | null = nodeOrParent as HTMLElement;
  while (currentNode) {
    if (currentNode.contentEditable === 'true') {
      return true;
    } else if (currentNode.contentEditable === 'false') {
      return false;
    }
    currentNode = currentNode.parentElement;
  }
  return false;
}

function nodeOrParentElement(node: Node): Element | null {
  return node.nodeType !== Node.ELEMENT_NODE
    ? node.parentElement
    : (node as Element);
}

export function isEditableNode(node: Node | null): boolean {
  return isTextInputNode(node) || isContentEditableNode(node);
}

/**
 * Tests whether an element is 'interactive', i.e. an element
 * that we should not do lookups on when tapped on mobile.
 */
export function isInteractiveElement(node: Node | null) {
  return (
    isContentEditableNode(node) ||
    (isElement(node) &&
      (node.tagName === 'A' ||
        node.tagName === 'BUTTON' ||
        node.tagName === 'INPUT' ||
        node.tagName === 'TEXTAREA' ||
        node.tagName === 'SELECT' ||
        node.tagName === 'DATALIST' ||
        node.tagName === 'OPTGROUP' ||
        node.tagName === 'OPTION'))
  );
}

export interface Focusable {
  focus(): void;
}

// Both HTMLElement and SVGElement interfaces have a focus() method but I guess
// Edge doesn't currently support focus() on SVGElement so we just duck-type
// this.
export function isFocusable(element?: any): element is Focusable {
  return (
    element && typeof element.focus === 'function' && element.focus.length === 0
  );
}

export function isTextInputNode(
  node: Node | null | undefined
): node is HTMLInputElement | HTMLTextAreaElement {
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
    (((node as Element).tagName === 'INPUT' &&
      allowedInputTypes.includes((node as HTMLInputElement).type)) ||
      (node as Element).tagName === 'TEXTAREA')
  );
}

export const isTextNode = (node: Node | null | undefined): node is Text =>
  !!node && node.nodeType === Node.TEXT_NODE;

export const isElement = (node: Node | null | undefined): node is Element =>
  !!node && node.nodeType === Node.ELEMENT_NODE;

export function isSvg(node: Node): node is SVGElement {
  return node.nodeType === Node.ELEMENT_NODE
    ? node instanceof SVGElement
    : node.parentElement instanceof SVGElement;
}

export function isVerticalText(node: Node): boolean {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;

  return (
    !!element &&
    !!element.ownerDocument.defaultView
      ?.getComputedStyle(element)
      .writingMode.startsWith('vertical')
  );
}
