import { isAbortError } from './is-abort-error';

class TimeoutError extends Error {
  constructor(...params: Array<any>) {
    super(...params);
    Object.setPrototypeOf(this, TimeoutError.prototype);

    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, TimeoutError);
    }

    this.name = 'TimeoutError';
  }
}

export async function fetchWithTimeout(
  resource: RequestInfo,
  options?: { timeout?: number | null } & RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options?.signal?.addEventListener('abort', onAbort);

  // Set up timeout callback
  const { timeout = 5000 } = options || {};
  let didTimeout = false;
  let timeoutId: number | undefined;
  if (timeout && timeout !== Infinity) {
    // This should be safe to use even in service workers because if the worker
    // is terminated before the timeout happens, presumably the fetch will be
    // cancelled anyway.
    timeoutId = self.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeout);
  }

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });

    if (timeoutId) {
      self.clearTimeout(timeoutId);
    }

    return response;
  } catch (e) {
    if (isAbortError(e) && didTimeout) {
      throw new TimeoutError();
    }

    throw e;
  } finally {
    options?.signal?.removeEventListener('abort', onAbort);
  }
}
