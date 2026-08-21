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

  // Drop the registry entry before running cleanups.
  // A cleanup can mount a replacement under this same popup host.
  // The replacement must land in a new entry, not this one.
  mountsByPopupHost.delete(popupHost);

  for (const container of mounts) {
    render(null, container);
  }
}
