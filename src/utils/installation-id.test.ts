import { afterEach, expect, it, vi } from 'vitest';

import { getInstallationId } from './installation-id';

const storage = vi.hoisted(() => ({
  get: vi.fn<() => Promise<{ installid?: string }>>(),
  set: vi.fn<(values: { installid: string }) => Promise<void>>(),
}));
vi.mock('webextension-polyfill', () => ({
  default: { storage: { local: storage } },
}));

afterEach(() => vi.unstubAllGlobals());

it('serializes creation, reuses legacy IDs, and resets after local data is cleared', async () => {
  // Older Safari supports getRandomValues, but not randomUUID.
  vi.stubGlobal('crypto', {
    getRandomValues: crypto.getRandomValues.bind(crypto),
  });
  let saved: { installid?: string } = {};
  storage.get.mockImplementation(async () => ({ ...saved }));
  storage.set.mockImplementation(async (values) => {
    saved = values;
  });
  const [first, concurrent] = await Promise.all([
    getInstallationId(),
    getInstallationId(),
  ]);
  expect(first).toBeDefined();
  expect(concurrent).toBe(first);
  expect(storage.set).toHaveBeenCalledTimes(1);
  expect(await getInstallationId()).toBe(first);

  saved = { installid: '012345abcd' };
  expect(await getInstallationId()).toBe('012345abcd');
  saved = {};
  expect(await getInstallationId()).not.toBe(first);
});

it('omits the identity when it cannot persist it, and recovers on a later read', async () => {
  storage.get.mockResolvedValue({});
  storage.set.mockRejectedValueOnce(new Error('Storage unavailable'));
  expect(await getInstallationId()).toBeUndefined();
  storage.get.mockResolvedValue({ installid: '012345abcd' });
  expect(await getInstallationId()).toBe('012345abcd');
});
