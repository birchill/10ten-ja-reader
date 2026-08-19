import { type VNode, render } from 'preact';

let activeRoot: Element | undefined;

const mountsByRoot = new Map<Element, Set<Element>>();

export function mountPopupComponent(
  container: Element,
  vnode: VNode<any>
): void {
  render(vnode, container);

  if (!activeRoot) {
    return;
  }

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

  for (const container of mounts) {
    render(null, container);
  }
  mountsByRoot.delete(root);
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
