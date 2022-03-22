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

    return existingContainers[0];
  }

  // We didn't find an existing content container so create a new one

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

  // For SVG documents we put container <div> inside a <foreignObject>.
  let parent: Element;
  if (isSvgDoc(doc)) {
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

  // Actually create the container element
  const container = doc.createElementNS(HTML_NS, 'div');
  container.id = id;
  insertBefore(parent, container);

  // Reset any styles the page may have applied.
  container.style.all = 'initial';

  // Add the necessary style element
  resetStyles({ container, doc, styles });

  return container;
}

export function removeContentContainer(id: string | Array<string>) {
  const containerIds = typeof id === 'string' ? [id] : id;
  const containers = Array.from<HTMLElement>(
    document.querySelectorAll(containerIds.map((id) => `#${id}`).join(', '))
  );
  for (const container of containers) {
    removeContainerElement(container);
  }
}

// --------------------------------------------------------------------------
//
// Implementation helpers
//
// --------------------------------------------------------------------------

function removeContainerElement(elem: Element) {
  if (isForeignObjectElement(elem.parentElement)) {
    elem.parentElement.remove();
  } else {
    elem.remove();
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
