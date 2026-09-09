/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Runtime } from 'webextension-polyfill';

import type { ContentConfigParams } from '../common/content-config-params';

import TabManager from './tab-manager';

type MessageListener = (
  request: unknown,
  sender: Runtime.MessageSender
) => unknown;

const { browserMock, messageListeners } = vi.hoisted(() => {
  const messageListeners: Array<MessageListener> = [];
  const browserMock = {
    runtime: {
      onMessage: {
        addListener: vi.fn<(listener: MessageListener) => void>((listener) => {
          messageListeners.push(listener);
        }),
      },
    },
    storage: {
      local: { get: vi.fn<() => Promise<object>>(() => Promise.resolve({})) },
    },
    tabs: {
      onActivated: {
        addListener:
          vi.fn<(listener: (details: { tabId: number }) => unknown) => void>(),
      },
      query: vi.fn<() => Promise<Array<never>>>(() => Promise.resolve([])),
      sendMessage: vi.fn<() => Promise<string>>(() => Promise.resolve('ok')),
    },
  };

  return { browserMock, messageListeners };
});

vi.mock('@birchill/bugsnag-zero', () => ({
  default: {
    leaveBreadcrumb: vi.fn<(...args: Array<unknown>) => void>(),
    notify: vi.fn<(...args: Array<unknown>) => void>(),
  },
}));
vi.mock('webextension-polyfill', () => ({ default: browserMock }));

describe('TabManager', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('drops stale child frames when the root frame navigates', async () => {
    vi.useFakeTimers();

    const manager = new TabManager();
    await manager.init({} as ContentConfigParams);

    const onMessage = messageListeners[0];
    expect(onMessage).toBeDefined();

    const sendEnabled = (frameId: number, src: string) =>
      onMessage({ type: 'enabled', src }, {
        frameId,
        tab: { id: 1 },
      } as Runtime.MessageSender);

    await sendEnabled(0, 'https://example.com/old');
    await sendEnabled(2, 'https://example.com/old-frame');
    expect(manager.getInitialFrameSrc({ tabId: 1, frameId: 2 })).toBe(
      'https://example.com/old-frame'
    );

    await sendEnabled(0, 'https://example.com/new');

    expect(manager.getInitialFrameSrc({ tabId: 1, frameId: 0 })).toBe(
      'https://example.com/new'
    );
    expect(
      manager.getInitialFrameSrc({ tabId: 1, frameId: 2 })
    ).toBeUndefined();
  });
});
