import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from './content-container';
import {
  mountPopupComponent,
  unmountPopupComponents,
  withPopupRoot,
} from './popup/mount';
import { removePopup } from './popup/popup';

/**
 * @vitest-environment jsdom
 */

vi.mock('webextension-polyfill', () => ({
  default: {
    i18n: { getMessage: () => '' },
    runtime: { getURL: (path: string) => path },
  },
}));

const popupId = 'tenten-ja-window';
const puckId = 'tenten-ja-puck';

describe('removePopup', () => {
  afterEach(() => {
    removeContentContainer([popupId, puckId]);
  });

  it("unmounts the popup's islands before detaching the host from the document", async () => {
    const host = getOrCreateEmptyContainer({ id: popupId, styles: '' });
    const container = document.createElement('div');
    host.shadowRoot!.append(container);

    let hostWasConnected: boolean | undefined;
    const cleanup = vi.fn<() => void>(() => {
      hostWasConnected = host.isConnected;
    });

    await act(() => {
      withPopupRoot(host, () => {
        mountPopupComponent(container, h(CleanupProbe, { onCleanup: cleanup }));
      });
    });

    removePopup();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(hostWasConnected).toBe(true);
    expect(document.getElementById(popupId)).toBeNull();
  });
});

describe('getOrCreateEmptyContainer', () => {
  afterEach(() => {
    removeContentContainer([popupId, puckId]);
  });

  it('does not unmount popup islands when an unrelated container is reset', async () => {
    const cleanup = vi.fn<() => void>();
    const host = getOrCreateEmptyContainer({ id: popupId, styles: '' });
    const container = document.createElement('div');
    host.shadowRoot!.append(container);

    await act(() => {
      withPopupRoot(host, () => {
        mountPopupComponent(container, h(CleanupProbe, { onCleanup: cleanup }));
      });
    });

    // The first call creates the puck container.
    // The second call resets it and discards its old content.
    getOrCreateEmptyContainer({ id: puckId, styles: '' });
    getOrCreateEmptyContainer({ id: puckId, styles: '' });

    expect(cleanup).not.toHaveBeenCalled();
  });

  it('unmounts the original popup root when a later duplicate causes it to be discarded', async () => {
    const cleanup = vi.fn<() => void>();
    const originalHost = getOrCreateEmptyContainer({
      id: popupId,
      styles: '',
      onBeforeRemove: unmountPopupComponents,
    });
    const container = document.createElement('div');
    originalHost.shadowRoot!.append(container);

    await act(() => {
      withPopupRoot(originalHost, () => {
        mountPopupComponent(container, h(CleanupProbe, { onCleanup: cleanup }));
      });
    });

    // This has the same id and comes after the original in document order.
    // The duplicate-recovery loop below then discards the original.
    const duplicate = document.createElement('div');
    duplicate.id = popupId;
    document.documentElement.append(duplicate);

    getOrCreateEmptyContainer({
      id: popupId,
      styles: '',
      onBeforeRemove: unmountPopupComponents,
    });

    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

function CleanupProbe({ onCleanup }: { onCleanup: () => void }) {
  useEffect(() => onCleanup, []);
  return null;
}
