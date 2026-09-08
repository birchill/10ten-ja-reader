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
  // Freeze the clock before the badge's expiry, or this test starts failing
  // once that date passes.
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

describe('PopupKeysForm playReadings row', () => {
  it('hides the row while the play-readings setting is off', () => {
    const form = renderForm({ playReadingsEnabled: false });

    expect(findKeyRow(form, 'options_popup_play_readings')).toBeUndefined();
  });

  it('shows the row, with its new badge, once the play-readings setting is on', () => {
    const form = renderForm({ playReadingsEnabled: true });

    const row = findKeyRow(form, 'options_popup_play_readings');
    expect(row).toBeDefined();
    expect(row?.querySelector('span')?.textContent).toBe(
      'options_new_badge_text'
    );
  });
});

function renderForm({
  playReadingsEnabled,
}: {
  playReadingsEnabled: boolean;
}): HTMLDivElement {
  container = document.createElement('div');
  document.body.append(container);

  const target = container;
  act(() => {
    render(
      h(PopupKeysForm, {
        isMac: false,
        keys: emptyKeys,
        onUpdateKey: () => {},
        isHoldToShowShiftEnabled: false,
        playReadingsEnabled,
      }),
      target
    );
  });

  return target;
}

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

function findKeyRow(
  form: HTMLDivElement,
  l10nKey: string
): HTMLDivElement | undefined {
  return [...form.querySelectorAll('div')].find(
    (row) => row.firstChild?.textContent === l10nKey
  );
}
