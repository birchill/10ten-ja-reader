export function rejectWhenAborted<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  if (signal.aborted) {
    void promise.catch(() => {});
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  return new Promise<T>((resolve, reject) => {
    const abortListener = () =>
      reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', abortListener, { once: true });
    void promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', abortListener);
    });
  });
}
