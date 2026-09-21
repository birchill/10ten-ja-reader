/**
 * @vitest-environment jsdom
 */
import { h, render } from 'preact';
import { afterEach, expect, it, vi } from 'vitest';

import type { JpdictState } from '../background/jpdict';

import { DbStatus } from './DbStatus';

vi.mock('webextension-polyfill', () => ({
  default: { i18n: { getMessage: (key: string) => key } },
}));

const state: JpdictState = {
  words: { state: 'empty', version: null },
  kanji: { state: 'empty', version: null },
  radicals: { state: 'empty', version: null },
  names: { state: 'empty', version: null },
  updateState: { type: 'idle', lastCheck: null },
};

afterEach(() => render(null, document.body));

it('uses the existing update callback to re-download unreadable data', () => {
  const onUpdateDb = vi.fn<() => void>();
  render(
    h(DbStatus, {
      dbState: {
        ...state,
        updateError: {
          name: 'NotReadableError',
          message: 'Cannot read dictionary data',
        },
      },
      onUpdateDb,
    }),
    document.body
  );
  expect(document.body.textContent).toContain('options_db_corrupt');
  const button = document.querySelector('button')!;
  expect(button.textContent).toBe('options_db_rebuild_button');
  button.click();
  expect(onUpdateDb).toHaveBeenCalledOnce();
});

it('does not offer to delete data for a generic update error', () => {
  render(
    h(DbStatus, {
      dbState: {
        ...state,
        updateError: { name: 'UnknownError', message: 'Unknown failure' },
      },
    }),
    document.body
  );
  expect(document.body.textContent).not.toContain('options_db_rebuild_button');
  expect(document.querySelector('button')?.textContent).toBe(
    'options_update_check_button_label'
  );
});
