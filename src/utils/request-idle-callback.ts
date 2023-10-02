// This is in part:
//
// - Missing typings for requestIdleCallback
// - Polyfill for browsers that don't support requestIdleCallback
// - Polyfill for non-Window contexts (e.g. workers)

interface IdleDeadline {
  timeRemaining: () => number;
  readonly didTimeout: boolean;
}

interface IdleRequestOptions {
  timeout: number;
}

type IdleCallbackHandle = number;

type IdleRequestCallback = (deadline: IdleDeadline) => void;

/** @public */
export let requestIdleCallback: (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
) => IdleCallbackHandle;

/** @public */
export let cancelIdleCallback: (handle: IdleCallbackHandle) => void;

if ((self as any).requestIdleCallback && (self as any).cancelIdleCallback) {
  requestIdleCallback = (self as any).requestIdleCallback.bind(self);
  cancelIdleCallback = (self as any).cancelIdleCallback.bind(self);
} else {
  requestIdleCallback = (
    callback: IdleRequestCallback,
    options: IdleRequestOptions
  ): IdleCallbackHandle => {
    // Use half the specified timeout since it probably represents a worst-case
    // scenario.
    const timeout = options ? options.timeout / 2 : 0;
    return self.setTimeout(() => {
      callback({ timeRemaining: () => 0, didTimeout: true });
    }, timeout);
  };

  cancelIdleCallback = (handle: IdleCallbackHandle) => {
    self.clearTimeout(handle);
  };
}

/** @public */
export function requestIdleCallbackPromise(
  options?: IdleRequestOptions
): Promise<void> {
  return new Promise((resolve) =>
    requestIdleCallback(() => {
      resolve();
    }, options)
  );
}
