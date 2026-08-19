import { HTML_NS, SVG_NS } from '../utils/dom-utils';
import { getHash } from '../utils/hash';

import { isForeignObjectElement, isSvgDoc } from './svg';

export function getOrCreateEmptyContainer({
  id,
  styles,
  before,
  legacyIds,
  onBeforeRemove,
}: {
  id: string;
  styles: string;
  before?: string;
  legacyIds?: Array<string>;
  onBeforeRemove?: (container: HTMLElement) => void;
}): HTMLElement {
  // Drop any legacy containers
  if (legacyIds?.length) {
    const legacyContainers = document.querySelectorAll<HTMLElement>(
      legacyIds.map((id) => `#${id}`).join(', ')
    );
    for (const container of legacyContainers) {
      onBeforeRemove?.(container);
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
      const duplicate = existingContainers.shift()!;
      onBeforeRemove?.(duplicate);
      removeContainerElement(duplicate);
    }

    // Drop any existing content (except styles)
    resetContent(existingContainers[0]);

    // Make sure the styles are up-to-date
    resetStyles({ container: existingContainers[0], styles });

    registerContainer({ id, before });

    // Make sure our containers are in the right place in the document and, if
    // we're using the top layer, that they are above any content the page has
    // put there since we last showed them.
    updateContainers();

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

  registerContainer({ id, before });
  updateContainers();

  return container;
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

export function removeContentContainer(
  id: string | Array<string>,
  onBeforeRemove?: (container: HTMLElement) => void
) {
  const containerIds = typeof id === 'string' ? [id] : id;
  const containers = Array.from<HTMLElement>(
    document.querySelectorAll(containerIds.map((id) => `#${id}`).join(', '))
  );
  for (const container of containers) {
    onBeforeRemove?.(container);
    removeContainerElement(container);
  }
  for (const id of containerIds) {
    unregisterContainer(id);
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

// The containers we have added, mapped to the ID of the element they should be
// inserted before, if any.
const containers = new Map<string, string | undefined>();

let dialogObserver: MutationObserver | undefined;

function registerContainer({ id, before }: { id: string; before?: string }) {
  const isFirstContainer = !containers.size;
  containers.set(id, before);

  if (!isFirstContainer) {
    return;
  }

  document.addEventListener('fullscreenchange', updateContainers);

  // `showModal()` and `close()` set and clear the `open` attribute so we can
  // watch for that to know when we need to move our containers into or out of a
  // modal dialog.
  //
  // We need to do this even when nothing has triggered a re-render of the popup
  // since the puck, in particular, needs to keep working without a mouse.
  if (canUseTopLayer()) {
    dialogObserver = new MutationObserver((records) => {
      if (records.some((record) => record.target.nodeName === 'DIALOG')) {
        updateContainers();
      }
    });
    dialogObserver.observe(document.documentElement, {
      subtree: true,
      attributeFilter: ['open'],
    });
  }
}

function unregisterContainer(id: string) {
  containers.delete(id);

  if (containers.size) {
    return;
  }

  document.removeEventListener('fullscreenchange', updateContainers);
  dialogObserver?.disconnect();
  dialogObserver = undefined;
}

// Re-adds our containers so that they end up attached to the right element and,
// when we're using the top layer, at the top of it.
function updateContainers() {
  if (!containers.size) {
    return;
  }

  // Process the containers in document order since, in the top layer, it is the
  // order in which content is added that determines what appears on top. That
  // way the puck, which we always insert after the popup, stays above it.
  const elems = document.querySelectorAll<HTMLElement>(
    [...containers.keys()].map((id) => `#${id}`).join(', ')
  );
  for (const elem of elems) {
    addContainerElement({ elem, before: containers.get(elem.id) });
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
