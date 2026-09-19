import { describe, expect, it, vi } from 'vitest';

import { rejectWhenAborted } from './reject-when-aborted';

describe('rejectWhenAborted', () => {
  it('rejects immediately and runs onAbort when the signal is already aborted', async () => {
    const onAbort = vi.fn<() => void>();
    const controller = new AbortController();
    controller.abort();

    await expect(
      rejectWhenAborted(new Promise(() => {}), controller.signal, onAbort)
    ).rejects.toThrow('Aborted');

    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('does not leave an unhandled rejection when the already-aborted fast path drops the passed promise', async () => {
    let reject!: (reason: unknown) => void;
    const producedPromise = new Promise((_resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      rejectWhenAborted(producedPromise, controller.signal)
    ).rejects.toThrow('Aborted');

    reject(new Error('the producer settles late'));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('runs onAbort and rejects promptly on a mid-flight abort, without waiting for the promise', async () => {
    const onAbort = vi.fn<() => void>();
    const controller = new AbortController();

    const pending = rejectWhenAborted(
      new Promise(() => {}),
      controller.signal,
      onAbort
    );
    controller.abort();

    await expect(pending).rejects.toThrow('Aborted');
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('removes its abort listener once the promise settles on its own', async () => {
    const controller = new AbortController();
    const added = vi.spyOn(controller.signal, 'addEventListener');
    const removed = vi.spyOn(controller.signal, 'removeEventListener');

    await rejectWhenAborted(Promise.resolve('value'), controller.signal);
    await Promise.resolve();

    expect(added).toHaveBeenCalledWith('abort', expect.any(Function), {
      once: true,
    });
    expect(removed).toHaveBeenCalledWith(
      'abort',
      added.mock.calls[0]![1] as EventListener
    );
  });
});
