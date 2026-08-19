import { type VNode, render } from 'preact';

let activeRoot: Element | undefined;

const mountsByRoot = new Map<Element, Set<Element>>();

export function mountPopupComponent(
  container: Element,
  vnode: VNode<any>
): void {
  if (!activeRoot) {
    // Call this only inside withPopupRoot.
    // A silent skip here would break cleanup on unmount.
    throw new Error('mountPopupComponent: no active popup root');
  }

  render(vnode, container);

  let mounts = mountsByRoot.get(activeRoot);
  if (!mounts) {
    mounts = new Set();
    mountsByRoot.set(activeRoot, mounts);
  }
  mounts.add(container);
}

export function unmountPopupComponents(root: Element): void {
  const mounts = mountsByRoot.get(root);
  if (!mounts) {
    return;
  }

  // Drop the registry entry before running cleanups.
  // A cleanup can mount a replacement under this same root.
  // The replacement must land in a new entry, not this one.
  mountsByRoot.delete(root);

  for (const container of mounts) {
    render(null, container);
  }
}

export function withPopupRoot<T>(root: Element, run: () => T): T {
  const previousRoot = activeRoot;
  activeRoot = root;
  try {
    return run();
  } finally {
    activeRoot = previousRoot;
  }
}
