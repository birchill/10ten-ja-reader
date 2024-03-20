export function throttle<T extends (...args: Array<any>) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastInvocationTimeout: number | undefined;
  let lastRan: number | undefined;
  return function (...args) {
    /* eslint @typescript-eslint/no-this-alias: 0 */
    const context = this;
    const run = () => {
      func.apply(context, args);
      lastRan = Date.now();
    };

    if (!lastRan) {
      run();
    } else {
      self.clearTimeout(lastInvocationTimeout);
      lastInvocationTimeout = self.setTimeout(
        function () {
          if (Date.now() - lastRan! >= limit) {
            run();
          }
        },
        limit - (Date.now() - lastRan)
      );
    }
  };
}
