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

export function isInclusiveAncestor(
  ancestor: Element,
  testNode?: Node | null
): boolean {
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
}

export function isTextInputNode(
  node: Node | null
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
    (((<Element>node).tagName === 'INPUT' &&
      allowedInputTypes.includes((<HTMLInputElement>node).type)) ||
      (<Element>node).tagName === 'TEXTAREA')
  );
}

export const isTextNode = (node: Node | null): node is CharacterData =>
  !!node && node.nodeType === Node.TEXT_NODE;

export function isTopMostWindow() {
  return window.top === window.self;
}

export function isMessageSourceWindow(
  source: MessageEventSource | null
): source is Window {
  // This is mostly determined empirically, but basically we need to know if
  // a message source is a Window or not since the signature for postMessage
  // differs slightly for different sources.
  //
  // For cross-origin iframes, however, instanceof Window won't always work
  // (although it does in some browsers). Furthermore, we can't access prototype
  // etc. on the object.
  //
  // Instead we just try a few checks that so far see to work.
  if (!source) {
    return false;
  }

  if (source instanceof Window) {
    return true;
  }

  try {
    return (
      (source as unknown as Window).window ===
      (source as unknown as Window).self
    );
  } catch (_e) {
    return false;
  }
}

export function isSvg(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE
    ? node instanceof SVGElement
    : node.parentElement instanceof SVGElement;
}
