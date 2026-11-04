import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Permissions, Storage } from 'webextension-polyfill';

import { ReportingConsent } from './reporting-consent';

const mocks = vi.hoisted(() => {
  function event<Args extends Array<unknown>>() {
    const listeners = new Set<(...args: Args) => void>();
    return {
      addListener: (listener: (...args: Args) => void) =>
        listeners.add(listener),
      removeListener: (listener: (...args: Args) => void) =>
        listeners.delete(listener),
      emit: (...args: Args) =>
        listeners.forEach((listener) => listener(...args)),
    };
  }

  return {
    permissions: {
      getAll: vi.fn<() => Promise<Permissions.AnyPermissions>>(),
      request: vi.fn<() => Promise<boolean>>(),
      remove: vi.fn<() => Promise<boolean>>(),
      onAdded: event<[Permissions.Permissions]>(),
      onRemoved: event<[Permissions.Permissions]>(),
    },
    storage: {
      local: {
        get: vi.fn<() => Promise<Record<string, unknown>>>(),
        set: vi.fn<(values: Record<string, unknown>) => Promise<void>>(),
      },
      onChanged:
        event<[Record<string, Storage.StorageChange>, string | undefined]>(),
    },
  };
});

vi.mock('webextension-polyfill', () => ({ default: mocks }));

let consent: ReportingConsent;
let stored: Record<string, unknown>;

beforeEach(() => {
  vi.resetAllMocks();
  stored = {};
  mocks.permissions.getAll.mockResolvedValue({});
  mocks.storage.local.get.mockImplementation(async () => ({ ...stored }));
  mocks.storage.local.set.mockImplementation(async (values) => {
    Object.assign(stored, values);
  });
});

afterEach(() => consent.dispose());

it('defaults off without native support and preserves deliberate local consent', async () => {
  consent = new ReportingConsent();
  expect(consent.state).toEqual({ mode: 'loading', enabled: false });
  await consent.ready;
  expect(consent.state).toEqual({ mode: 'local', enabled: false });

  await consent.setEnabled(true);
  consent.dispose();
  consent = new ReportingConsent();
  await consent.ready;
  expect(consent.state).toEqual({ mode: 'local', enabled: true });
  expect(mocks.permissions.request).not.toHaveBeenCalled();

  // Another page disables reporting; Safari 18 omits the storage area name.
  stored.automaticErrorReporting = false;
  mocks.storage.onChanged.emit(
    { automaticErrorReporting: { newValue: false } },
    undefined
  );
  expect(consent.state.enabled).toBe(false);
  await vi.waitFor(() =>
    expect(consent.state).toEqual({ mode: 'local', enabled: false })
  );
});

it('uses native consent over a saved local opt-in and requests it without awaiting', async () => {
  stored.automaticErrorReporting = true;
  let granted = false;
  mocks.permissions.getAll.mockImplementation(async () => ({
    data_collection: granted ? ['technicalAndInteraction'] : [],
  }));
  consent = new ReportingConsent();
  await consent.ready;
  expect(consent.state).toEqual({ mode: 'native', enabled: false });

  mocks.permissions.request.mockResolvedValue(false);
  const request = consent.setEnabled(true);
  // This must happen synchronously in the caller's user-event handler.
  expect(mocks.permissions.request).toHaveBeenCalledWith({
    data_collection: ['technicalAndInteraction'],
  });
  await request;
  expect(consent.state.enabled).toBe(false);

  mocks.permissions.request.mockImplementation(async () => (granted = true));
  await consent.setEnabled(true);
  expect(consent.state.enabled).toBe(true);
  mocks.permissions.remove.mockImplementation(async () => {
    granted = false;
    return true;
  });
  await consent.setEnabled(false);
  expect(mocks.permissions.remove).toHaveBeenCalledWith({
    data_collection: ['technicalAndInteraction'],
  });
  expect(consent.state.enabled).toBe(false);
  expect(mocks.storage.local.set).not.toHaveBeenCalled();
});

it('keeps reporting off after a query failure instead of using stale local consent', async () => {
  stored.automaticErrorReporting = true;
  mocks.permissions.getAll.mockRejectedValueOnce(new Error('Query failed'));
  consent = new ReportingConsent();
  await consent.ready;
  expect(consent.state).toEqual({ mode: 'error', enabled: false });
  expect(mocks.storage.local.get).not.toHaveBeenCalled();

  mocks.permissions.getAll.mockResolvedValue({ data_collection: [] });
  await consent.refresh();
  expect(consent.state).toEqual({ mode: 'native', enabled: false });
});

it('does not let an older query undo an external revocation', async () => {
  let resolveQuery!: (permissions: Permissions.AnyPermissions) => void;
  mocks.permissions.getAll.mockReturnValue(
    new Promise((resolve) => {
      resolveQuery = resolve;
    })
  );
  consent = new ReportingConsent();
  const changed = vi.fn<() => void>();
  consent.addChangeListener(changed);
  mocks.permissions.onRemoved.emit({
    data_collection: ['technicalAndInteraction'],
  });
  expect(consent.state).toEqual({ mode: 'native', enabled: false });

  resolveQuery({ data_collection: ['technicalAndInteraction'] });
  await consent.ready;
  expect(consent.state).toEqual({ mode: 'native', enabled: false });
  expect(changed).toHaveBeenCalledExactlyOnceWith(consent.state);
});
