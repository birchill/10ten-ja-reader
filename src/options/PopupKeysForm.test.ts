import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { StoredKeyboardKeys } from '../common/popup-keys';

import { PopupKeysForm } from './PopupKeysForm';

/**
 * @vitest-environment jsdom
 */

vi.mock('../common/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, langTag: 'en' }),
}));

let container: HTMLDivElement | undefined;

beforeEach(() => {
  // Before both this badge's expiry and the dropped 2023-10-10 one, so a
  // returning stale entry would still fail the badge-absence assertion.
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2020-01-01'));
});

afterEach(() => {
  vi.useRealTimers();

  if (container) {
    render(null, container);
    container.remove();
    container = undefined;
  }
});

describe('PopupKeysForm new-key badges', () => {
  it('shows the new badge for playReadings but not for the stale expandPopup entry', () => {
    container = document.createElement('div');
    document.body.append(container);

    const emptyKeys: StoredKeyboardKeys = {
      closePopup: [],
      expandPopup: [],
      kanjiLookup: [],
      movePopupDownOrUp: [],
      nextDictionary: [],
      pinPopup: [],
      playReadings: [],
      startCopy: [],
      toggleDefinition: [],
    };

    act(() => {
      render(
        h(PopupKeysForm, {
          isMac: false,
          keys: emptyKeys,
          onUpdateKey: () => {},
          isHoldToShowShiftEnabled: false,
        }),
        container!
      );
    });

    // The mocked `t` returns the l10n key verbatim, so a row with a badge
    // reads as its label text immediately followed by the badge's l10n key.
    const text = container.textContent ?? '';
    expect(text).toContain('options_popup_play_readingsoptions_new_badge_text');
    expect(text).not.toContain(
      'options_popup_expand_popupoptions_new_badge_text'
    );
  });
});
