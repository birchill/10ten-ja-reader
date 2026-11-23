/**
 * @vitest-environment jsdom
 */
import type { Client } from '@birchill/bugsnag-zero';
import { afterEach, expect, it, vi } from 'vitest';

import { FlatFileDatabaseLoader } from './flat-file';

vi.mock('webextension-polyfill', () => ({
  default: { runtime: { getURL: (url: string) => url } },
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('reports a final timeout after the initial caller has stopped waiting', async () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal!.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    )
  );

  const notify = vi.fn<Client['notify']>();
  const bugsnag = {
    notify,
    leaveBreadcrumb: vi.fn<Client['leaveBreadcrumb']>(),
  } as unknown as Client;
  const loader = new FlatFileDatabaseLoader({ bugsnag });
  const initialLoad = loader.database;
  const initialFailure = initialLoad.catch((error: unknown) => error);

  await vi.advanceTimersByTimeAsync(5000);
  expect(await initialFailure).toEqual(
    new Error('Load of data/words.ljson timed out.')
  );
  expect(notify).not.toHaveBeenCalled();

  await vi.runAllTimersAsync();
  expect(loader.loadState).toBe('error');
  expect(notify).toHaveBeenCalledOnce();
  expect(notify.mock.calls[0][0]).toEqual(
    new Error('Load of data/words.ljson timed out.')
  );
});
