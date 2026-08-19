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

/**
 * @vitest-environment jsdom
 */

const popupId = 'tenten-ja-window';
const puckId = 'tenten-ja-puck';

describe('removeContentContainer', () => {
  afterEach(() => {
    removeContentContainer([popupId, puckId]);
  });

  it('unmounts the popup islands registered under a removed container before removing it', async () => {
    const cleanup = vi.fn<() => void>();
    const host = getOrCreateEmptyContainer({ id: popupId, styles: '' });
    const container = document.createElement('div');
    host.shadowRoot!.append(container);

    await act(() => {
      withPopupRoot(host, () => {
        mountPopupComponent(container, h(CleanupProbe, { onCleanup: cleanup }));
      });
    });

    removeContentContainer(popupId, unmountPopupComponents);

    expect(cleanup).toHaveBeenCalledTimes(1);
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
});

function CleanupProbe({ onCleanup }: { onCleanup: () => void }) {
  useEffect(() => onCleanup, []);
  return null;
}
