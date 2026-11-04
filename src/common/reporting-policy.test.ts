import { afterEach, expect, it, vi } from 'vitest';

import { ReportingPolicy } from './reporting-policy';

const mocks = vi.hoisted(() => ({
  get: vi.fn<() => Promise<Record<string, unknown>>>(),
  addListener: vi.fn<() => void>(),
  removeListener: vi.fn<() => void>(),
}));
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      managed: { get: mocks.get },
      onChanged: {
        addListener: mocks.addListener,
        removeListener: mocks.removeListener,
      },
    },
  },
}));

let policy: ReportingPolicy;
afterEach(() => policy.dispose());

it('keeps the two restrictions independent and exposes their removal', async () => {
  mocks.get.mockResolvedValue({ DisableErrorReporting: true });
  policy = new ReportingPolicy();
  await policy.ready;
  expect(policy.state).toEqual({
    status: 'ready',
    disableErrorReporting: true,
    disableLocalErrorStorage: false,
  });

  mocks.get.mockResolvedValue({ DisableLocalErrorStorage: true });
  await policy.refresh();
  expect(policy.state).toEqual({
    status: 'ready',
    disableErrorReporting: false,
    disableLocalErrorStorage: true,
  });
  mocks.get.mockResolvedValue({});
  await policy.refresh();
  expect(policy.state).toEqual({
    status: 'ready',
    disableErrorReporting: false,
    disableLocalErrorStorage: false,
  });
});

it('distinguishes Firefox without configured policy from a failed policy read', async () => {
  mocks.get.mockRejectedValue(new Error('Managed storage manifest not found'));
  policy = new ReportingPolicy();
  expect(policy.state).toEqual({
    status: 'loading',
    disableErrorReporting: true,
    disableLocalErrorStorage: true,
  });
  await policy.ready;
  expect(policy.state.status).toBe('ready');
  expect(policy.state.disableErrorReporting).toBe(false);

  mocks.get.mockRejectedValue(new Error('Storage unavailable'));
  await policy.refresh();
  expect(policy.state).toEqual({
    status: 'error',
    disableErrorReporting: true,
    disableLocalErrorStorage: true,
  });
});
