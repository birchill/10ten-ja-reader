import { HTML_NS, SVG_NS } from '../utils/dom-utils';
import { getHash } from '../utils/hash';

import { isForeignObjectElement, isSvgDoc } from './svg';

export function getOrCreateEmptyContainer({
  id,
  styles,
  before,
  legacyIds,
}: {
  id: string;
  styles: string;
  before?: string;
  legacyIds?: Array<string>;
}): HTMLElement {
  // Drop any legacy containers
  if (legacyIds?.length) {
    const legacyContainers = document.querySelectorAll(
      legacyIds.map((id) => `#${id}`).join(', ')
    );
    for (const container of legacyContainers) {
      removeContainerElement(container);
    }
  }

  // Look for an existing container we can re-use
  const existingContainers = Array.from<HTMLElement>(
    document.querySelectorAll(`#${id}`)
  );
  if (existingContainers.length) {
    // Drop any duplicate containers, returning only the last one
    while (existingContainers.length > 1) {
      removeContainerElement(existingContainers.shift()!);
    }

    // Drop any existing content (except styles)
    resetContent(existingContainers[0]);

    // Make sure the styles are up-to-date
    resetStyles({ container: existingContainers[0], styles });

    // Make sure the container is in the right place in the document and, if
    // we're using the top layer, that it is above any content the page has put
    // there since we last showed it.
    addContainerElement({ elem: existingContainers[0], before });

    // Make sure we have a fullscreenchange callback registered
    addFullScreenChangeCallback({ id, before });

    return existingContainers[0];
  }

  // We didn't find an existing content container so create a new one
  const container = document.createElementNS(HTML_NS, 'div');
  container.id = id;
  addContainerElement({ elem: container, before });

  // Reset any styles the page may have applied.
  container.style.all = 'initial';

  // Add the necessary style element
  resetStyles({ container, styles });

  // Update the position in the document if we go to/from fullscreen mode
  addFullScreenChangeCallback({ id, before });

  return container;
}

// Re-inserts the container into the top layer so that it appears above any
// dialogs or popovers the page has shown since we last did this.
export function raiseContentContainer(id: string) {
  const container = document.getElementById(id);
  if (container) {
    addContainerElement({ elem: container });
  }
}

// Whether we can put our content in the top layer.
//
// Content in the top layer is painted above everything else on the page --
// including fullscreen elements, popovers, and modal dialogs -- and is
// positioned relative to the initial containing block no matter where it
// appears in the DOM.
//
// Note that when this returns true, `addContainerElement` shows _every_
// container it adds as a popover, so we can take it to mean our content is
// actually in the top layer, and not merely that it could be.
//
// We don't use the top layer for standalone SVG documents since there we
// position the popup by way of the <foreignObject> element that wraps it.
export function canUseTopLayer(): boolean {
  return 'popover' in HTMLElement.prototype && !isSvgDoc(document);
}

export function removeContentContainer(id: string | Array<string>) {
  const containerIds = typeof id === 'string' ? [id] : id;
  const containers = Array.from<HTMLElement>(
    document.querySelectorAll(containerIds.map((id) => `#${id}`).join(', '))
  );
  for (const container of containers) {
    removeContainerElement(container);
  }
  for (const id of containerIds) {
    removeFullScreenChangeCallback(id);
  }
}

// --------------------------------------------------------------------------
//
// Implementation helpers
//
// --------------------------------------------------------------------------

function addContainerElement({
  elem,
  before,
}: {
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
  if (canUseTopLayer()) {
    // A modal <dialog>, like a fullscreen element, makes everything outside its
    // subtree inert so, in order for our content to remain interactive, we need
    // to make it a child of whichever of those is showing. Being in the top
    // layer means we are still painted above it and are unaffected by any
    // clipping or transforms it applies.
    //
    // Only the _topmost_ modal dialog makes the rest of the page inert, but
    // there is no way to query the ordering of the top layer, so we use the
    // last modal dialog in document order. Likewise, we won't find dialogs
    // inside shadow trees. In either case we simply end up inert, i.e. no worse
    // than not doing this at all.
    const modalDialogs = document.querySelectorAll('dialog:modal');
    parent = modalDialogs.length
      ? modalDialogs[modalDialogs.length - 1]
      : (document.fullscreenElement ?? document.documentElement);
  } else if (document.fullscreenElement) {
    parent = document.fullscreenElement;
  } else if (isSvgDoc(document)) {
    // For SVG documents we put the container <div> inside a <foreignObject>.
    const foreignObject = document.createElementNS(SVG_NS, 'foreignObject');
    foreignObject.setAttribute('width', '100%');
    foreignObject.setAttribute('height', '100%');
    foreignObject.style.setProperty('pointer-events', 'none', 'important');
    foreignObject.style.setProperty('overflow', 'visible', 'important');
    insertBefore(document.documentElement, foreignObject);
    parent = foreignObject;
  } else {
    parent = document.documentElement;
  }

  if (elem.parentElement !== parent) {
    insertBefore(parent, elem);
  }

  // If our previous parent was a foreignObject wrapper, drop it
  if (isForeignObjectElement(previousParent) && previousParent !== parent) {
    previousParent.remove();
  }

  if (canUseTopLayer()) {
    // Re-showing the popover moves it to the end of the top layer so that it is
    // painted above anything the page has added there in the meantime.
    //
    // We use a manual popover since that's the only kind that neither dismisses
    // the page's own popovers nor gets dismissed by them.
    elem.setAttribute('popover', 'manual');
    if (elem.matches(':popover-open')) {
      elem.hidePopover();
    }
    elem.showPopover();
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
  id,
  before,
}: {
  id: string;
  before?: string;
}) {
  const existingCallback = fullScreenChangedCallbacks[id];
  if (typeof existingCallback !== 'undefined') {
    return;
  }

  const callback = () => {
    const container = document.getElementById(id);
    if (!container) {
      return;
    }

    // Re-add the container element, respecting the updated
    // document.fullScreenElement property.
    addContainerElement({ elem: container, before });
  };

  document.addEventListener('fullscreenchange', callback);
  fullScreenChangedCallbacks[id] = callback;
}

function removeFullScreenChangeCallback(id: string) {
  const callback = fullScreenChangedCallbacks[id];
  if (callback) {
    document.removeEventListener('fullscreenchange', callback);
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
  styles,
}: {
  container: HTMLElement;
  styles: string;
}) {
  const styleHash = getHash(styles);

  if (!container.shadowRoot) {
    container.attachShadow({ mode: 'open' });

    // Add <style>
    const style = document.createElementNS(HTML_NS, 'style');
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
      const style = document.createElementNS(HTML_NS, 'style');
      style.textContent = styles;
      style.dataset.hash = styleHash;
      container.shadowRoot!.append(style);
    }
  }
}
