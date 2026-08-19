import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { describe, expect, it, vi } from 'vitest';

import {
  mountPopupComponent,
  unmountPopupComponents,
  withPopupRoot,
} from './mount';

/**
 * @vitest-environment jsdom
 */

describe('mountPopupComponent / unmountPopupComponents', () => {
  it('runs the mounted component effect cleanup when its root is unmounted', async () => {
    const cleanup = vi.fn<() => void>();
    const root = document.createElement('div');
    const container = document.createElement('div');

    await act(() => {
      withPopupRoot(root, () => {
        mountPopupComponent(container, h(CleanupProbe, { onCleanup: cleanup }));
      });
    });
    expect(cleanup).not.toHaveBeenCalled();

    unmountPopupComponents(root);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('unmounts every container registered under the same root', async () => {
    const firstCleanup = vi.fn<() => void>();
    const secondCleanup = vi.fn<() => void>();
    const root = document.createElement('div');
    const firstContainer = document.createElement('div');
    const secondContainer = document.createElement('div');

    await act(() => {
      withPopupRoot(root, () => {
        mountPopupComponent(
          firstContainer,
          h(CleanupProbe, { onCleanup: firstCleanup })
        );
        mountPopupComponent(
          secondContainer,
          h(CleanupProbe, { onCleanup: secondCleanup })
        );
      });
    });

    unmountPopupComponents(root);

    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(secondCleanup).toHaveBeenCalledTimes(1);
  });

  it('leaves components registered under a different root mounted', async () => {
    const cleanup = vi.fn<() => void>();
    const popupRoot = document.createElement('div');
    const puckRoot = document.createElement('div');
    const container = document.createElement('div');

    await act(() => {
      withPopupRoot(popupRoot, () => {
        mountPopupComponent(container, h(CleanupProbe, { onCleanup: cleanup }));
      });
    });

    unmountPopupComponents(puckRoot);

    expect(cleanup).not.toHaveBeenCalled();

    unmountPopupComponents(popupRoot);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('unmounting a root with no registered components is a no-op', () => {
    const root = document.createElement('div');

    expect(() => unmountPopupComponents(root)).not.toThrow();
  });

  it('keeps a replacement mounted when a cleanup remounts one under the same root', async () => {
    const root = document.createElement('div');
    const container = document.createElement('div');
    const replacementContainer = document.createElement('div');
    const replacementCleanup = vi.fn<() => void>();

    const onCleanup = () => {
      withPopupRoot(root, () => {
        mountPopupComponent(
          replacementContainer,
          h(CleanupProbe, { onCleanup: replacementCleanup })
        );
      });
    };

    await act(() => {
      withPopupRoot(root, () => {
        mountPopupComponent(container, h(CleanupProbe, { onCleanup }));
      });
    });

    await act(() => {
      unmountPopupComponents(root);
    });

    expect(replacementCleanup).not.toHaveBeenCalled();

    unmountPopupComponents(root);

    expect(replacementCleanup).toHaveBeenCalledTimes(1);
  });

  it('throws when mounting outside a withPopupRoot scope', () => {
    const container = document.createElement('div');

    expect(() =>
      mountPopupComponent(
        container,
        h(CleanupProbe, { onCleanup: vi.fn<() => void>() })
      )
    ).toThrow(/popup root/);
  });
});

function CleanupProbe({ onCleanup }: { onCleanup: () => void }) {
  useEffect(() => onCleanup, []);
  return null;
}
