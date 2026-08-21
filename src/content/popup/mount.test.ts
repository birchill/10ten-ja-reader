import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { mountPopupComponent, unmountPopupComponents } from './mount';

/**
 * @vitest-environment jsdom
 */

describe('mountPopupComponent / unmountPopupComponents', () => {
  it('runs the mounted component effect cleanup when its popup host is unmounted', async () => {
    const cleanup = vi.fn<() => void>();
    const popupHost = document.createElement('div');
    const container = document.createElement('div');

    await act(() => {
      mountPopupComponent({
        popupHost,
        container,
        vnode: h(CleanupProbe, { onCleanup: cleanup }),
      });
    });
    expect(cleanup).not.toHaveBeenCalled();

    unmountPopupComponents(popupHost);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('unmounts every container registered under the same popup host', async () => {
    const firstCleanup = vi.fn<() => void>();
    const secondCleanup = vi.fn<() => void>();
    const popupHost = document.createElement('div');
    const firstContainer = document.createElement('div');
    const secondContainer = document.createElement('div');

    await act(() => {
      mountPopupComponent({
        popupHost,
        container: firstContainer,
        vnode: h(CleanupProbe, { onCleanup: firstCleanup }),
      });
      mountPopupComponent({
        popupHost,
        container: secondContainer,
        vnode: h(CleanupProbe, { onCleanup: secondCleanup }),
      });
    });

    unmountPopupComponents(popupHost);

    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(secondCleanup).toHaveBeenCalledTimes(1);
  });

  it('leaves components registered under a different popup host mounted', async () => {
    const cleanup = vi.fn<() => void>();
    const popupHost = document.createElement('div');
    const puckHost = document.createElement('div');
    const container = document.createElement('div');

    await act(() => {
      mountPopupComponent({
        popupHost,
        container,
        vnode: h(CleanupProbe, { onCleanup: cleanup }),
      });
    });

    unmountPopupComponents(puckHost);

    expect(cleanup).not.toHaveBeenCalled();

    unmountPopupComponents(popupHost);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('unmounting a popup host with no registered components is a no-op', () => {
    const popupHost = document.createElement('div');

    expect(() => unmountPopupComponents(popupHost)).not.toThrow();
  });

  it('keeps a replacement mounted when a cleanup remounts one under the same popup host', async () => {
    const popupHost = document.createElement('div');
    const container = document.createElement('div');
    const replacementContainer = document.createElement('div');
    const replacementCleanup = vi.fn<() => void>();

    const onCleanup = () => {
      mountPopupComponent({
        popupHost,
        container: replacementContainer,
        vnode: h(CleanupProbe, { onCleanup: replacementCleanup }),
      });
    };

    await act(() => {
      mountPopupComponent({
        popupHost,
        container,
        vnode: h(CleanupProbe, { onCleanup }),
      });
    });

    await act(() => {
      unmountPopupComponents(popupHost);
    });

    expect(replacementCleanup).not.toHaveBeenCalled();

    unmountPopupComponents(popupHost);

    expect(replacementCleanup).toHaveBeenCalledTimes(1);
  });
});

function CleanupProbe({ onCleanup }: { onCleanup: () => void }) {
  useEffect(() => onCleanup, []);
  return null;
}
