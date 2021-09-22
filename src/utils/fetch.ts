export class TimeoutError extends Error {
  constructor(...params: any[]) {
    super(...params);
    Object.setPrototypeOf(this, TimeoutError.prototype);

    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, TimeoutError);
    }

    this.name = 'TimeoutError';
  }
}

export function fetchWithTimeout(
  resource: RequestInfo,
  options?: {
    timeout?: number | null;
  } & RequestInit
): Promise<Response> {
  const controller = new AbortController();
  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  // Set up timeout callback
  const { timeout = 5000 } = options || {};
  let didTimeout = false;
  let timeoutId: number | undefined;
  if (timeout && timeout !== Infinity) {
    timeoutId = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeout);
  }

  const responsePromise = new Promise<Response>((resolve, reject) => {
    fetch(resource, {
      ...options,
      signal: controller.signal,
    })
      .then((response) => {
        if (timeoutId) {
          self.clearTimeout(timeoutId);
        }
        resolve(response);
      })
      .catch((e) => {
        if (e?.name === 'AbortError' && didTimeout) {
          reject(new TimeoutError());
        } else {
          reject(e);
        }
      });
  });

  return responsePromise;
}
