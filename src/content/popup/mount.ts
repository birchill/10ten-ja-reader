import { type VNode, render } from 'preact';

const mountsByPopupHost = new Map<Element, Set<Element>>();

export function mountPopupComponent({
  popupHost,
  container,
  vnode,
}: {
  popupHost: Element;
  container: Element;
  vnode: VNode<any>;
}): void {
  render(vnode, container);

  let mounts = mountsByPopupHost.get(popupHost);
  if (!mounts) {
    mounts = new Set();
    mountsByPopupHost.set(popupHost, mounts);
  }
  mounts.add(container);
}

export function unmountPopupComponents(popupHost: Element): void {
  const mounts = mountsByPopupHost.get(popupHost);
  if (!mounts) {
    return;
  }

  // Remove the old registry entry before unmounting its components.
  // An effect cleanup may synchronously call mountPopupComponent() for the
  // same popup host; that replacement must be registered in a new entry.
  mountsByPopupHost.delete(popupHost);

  for (const container of mounts) {
    render(null, container);
  }
}
