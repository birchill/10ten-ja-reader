import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AudioSettingsForm } from './AudioSettingsForm';

/**
 * @vitest-environment jsdom
 */

vi.mock('../common/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, langTag: 'en' }),
}));

let container: HTMLDivElement | undefined;

afterEach(() => {
  if (container) {
    render(null, container);
    container.remove();
    container = undefined;
  }
});

describe('AudioSettingsForm accessibility', () => {
  it('associates the checkbox with its description via aria-describedby', () => {
    container = document.createElement('div');
    document.body.append(container);

    act(() => {
      render(
        h(AudioSettingsForm, {
          playReadings: false,
          onChangePlayReadings: () => {},
        }),
        container!
      );
    });

    const checkbox = container.querySelector('input[type="checkbox"]')!;
    const describedById = checkbox.getAttribute('aria-describedby');

    expect(describedById).toBeTruthy();

    const description = container.querySelector(`#${describedById}`);
    expect(description).not.toBeNull();
    expect(description!.textContent).toBe('options_play_readings_description');
  });
});
