import { getHash } from '../utils/hash';
import { HTML_NS, SVG_NS } from '../utils/dom-utils';

import { isForeignObjectElement, isSvgDoc } from './svg';

export function getOrCreateEmptyContainer({
  doc,
  id,
  styles,
  before,
  legacyIds,
}: {
  doc: Document;
  id: string;
  styles: string;
  before?: string;
  legacyIds?: Array<string>;
}): HTMLElement {
  // Drop any legacy containers
  if (legacyIds?.length) {
    const legacyContainers = doc.querySelectorAll(
      legacyIds.map((id) => `#${id}`).join(', ')
    );
    for (const container of legacyContainers) {
      removeContainerElement(container);
    }
  }

  // Look for an existing container we can re-use
  const existingContainers = Array.from<HTMLElement>(
    doc.querySelectorAll(`#${id}`)
  );
  if (existingContainers.length) {
    // Drop any duplicate containers, returning only the last one
    while (existingContainers.length > 1) {
      removeContainerElement(existingContainers.shift()!);
    }

    // Drop any existing content (except styles)
    resetContent(existingContainers[0]);

    // Make sure the styles are up-to-date
    resetStyles({ container: existingContainers[0], doc, styles });

    // Make sure we have a fullscreenchange callback registered
    addFullScreenChangeCallback({ doc, id, before });

    return existingContainers[0];
  }

  // We didn't find an existing content container so create a new one
  const container = doc.createElementNS(HTML_NS, 'div');
  container.id = id;
  addContainerElement({ doc, elem: container, before });

  // Reset any styles the page may have applied.
  container.style.all = 'initial';

  // Add the necessary style element
  resetStyles({ container, doc, styles });

  // Update the position in the document if we go to/from fullscreen mode
  addFullScreenChangeCallback({ doc, id, before });

  return container;
}

export function removeContentContainer({
  doc,
  id,
}: {
  doc: Document;
  id: string | Array<string>;
}) {
  const containerIds = typeof id === 'string' ? [id] : id;
  const containers = Array.from<HTMLElement>(
    doc.querySelectorAll(containerIds.map((id) => `#${id}`).join(', '))
  );
  for (const container of containers) {
    removeContainerElement(container);
  }
  for (const id of containerIds) {
    removeFullScreenChangeCallback({ doc, id });
  }
}

// --------------------------------------------------------------------------
//
// Implementation helpers
//
// --------------------------------------------------------------------------

function addContainerElement({
  doc,
  elem,
  before,
}: {
  doc: Document;
  elem: HTMLElement;
  before?: string;
}) {
  const previousParent = elem.parentElement;

  // Set up a method to add to the DOM, respecting any `before` ID we might
  // have.
  const insertBefore = (parent: Element, elem: Element) => {
    const beforeElem = before ? parent.children.namedItem(before) : null;
    if (beforeElem) {
      parent.insertBefore(elem, beforeElem);
    } else {
      parent.append(elem);
    }
  };

  let parent: Element;
  if (doc.fullscreenElement) {
    parent = doc.fullscreenElement;
  } else if (isSvgDoc(doc)) {
    // For SVG documents we put the container <div> inside a <foreignObject>.
    const foreignObject = doc.createElementNS(SVG_NS, 'foreignObject');
    foreignObject.setAttribute('width', '100%');
    foreignObject.setAttribute('height', '100%');
    foreignObject.style.setProperty('pointer-events', 'none', 'important');
    foreignObject.style.setProperty('overflow', 'visible', 'important');
    insertBefore(doc.documentElement, foreignObject);
    parent = foreignObject;
  } else {
    parent = doc.documentElement;
  }

  insertBefore(parent, elem);

  // If our previous parent was a foreignObject wrapper, drop it
  if (isForeignObjectElement(previousParent)) {
    previousParent.remove();
  }
}

function removeContainerElement(elem: Element) {
  if (isForeignObjectElement(elem.parentElement)) {
    elem.parentElement.remove();
  } else {
    elem.remove();
  }
}

const fullScreenChangedCallbacks: Record<string, (event: Event) => void> = {};

function addFullScreenChangeCallback({
  doc,
  id,
  before,
}: {
  doc: Document;
  id: string;
  before?: string;
}) {
  const existingCallback = fullScreenChangedCallbacks[id];
  if (typeof existingCallback !== 'undefined') {
    return;
  }

  const callback = () => {
    const container = doc.getElementById(id);
    if (!container) {
      return;
    }

    // Re-add the container element, respecting the updated
    // document.fullScreenElement property.
    addContainerElement({ doc, elem: container, before });
  };

  doc.addEventListener('fullscreenchange', callback);
  fullScreenChangedCallbacks[id] = callback;
}

function removeFullScreenChangeCallback({
  doc,
  id,
}: {
  doc: Document;
  id: string;
}) {
  const callback = fullScreenChangedCallbacks[id];
  if (callback) {
    doc.removeEventListener('fullscreenchange', callback);
  }
}

function resetContent(elem: HTMLElement) {
  if (!elem.shadowRoot) {
    return;
  }

  const children = Array.from(elem.shadowRoot.children);
  for (const child of children) {
    // We need to convert to uppercase because for standalone SVG documents the
    // tag name case is not normalized.
    if (child.tagName.toUpperCase() !== 'STYLE') {
      child.remove();
    }
  }
}

function resetStyles({
  container,
  doc,
  styles,
}: {
  container: HTMLElement;
  doc: Document;
  styles: string;
}) {
  const styleHash = getHash(styles);

  if (!container.shadowRoot) {
    container.attachShadow({ mode: 'open' });

    // Add <style>
    const style = doc.createElementNS(HTML_NS, 'style');
    style.textContent = styles;
    style.dataset.hash = styleHash;
    container.shadowRoot!.append(style);
  } else {
    // Reset style
    let existingStyle = container.shadowRoot.querySelector('style');
    if (existingStyle && existingStyle.dataset.hash !== styleHash) {
      existingStyle.remove();
      existingStyle = null;
    }

    if (!existingStyle) {
      const style = doc.createElementNS(HTML_NS, 'style');
      style.textContent = styles;
      style.dataset.hash = styleHash;
      container.shadowRoot!.append(style);
    }
  }
}
