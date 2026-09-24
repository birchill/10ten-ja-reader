export function rejectWhenAborted<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  onAbort?: () => void
): Promise<T> {
  if (signal.aborted) {
    onAbort?.();
    void promise.catch(() => {});
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }

  return new Promise<T>((resolve, reject) => {
    const abortListener = () => {
      onAbort?.();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', abortListener, { once: true });
    void promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', abortListener);
    });
  });
}
