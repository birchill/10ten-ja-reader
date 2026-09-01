export function withResolvers<T>(): PromiseWithResolvers<T> {
  if (hasWithResolvers(Promise)) {
    return Promise.withResolvers<T>();
  }

  let resolve!: PromiseWithResolvers<T>['resolve'];
  let reject!: PromiseWithResolvers<T>['reject'];
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type PromiseConstructorWithResolvers = PromiseConstructor & {
  withResolvers<T>(): PromiseWithResolvers<T>;
};

function hasWithResolvers(
  promiseConstructor: PromiseConstructor
): promiseConstructor is PromiseConstructorWithResolvers {
  return (
    'withResolvers' in promiseConstructor &&
    typeof promiseConstructor.withResolvers === 'function'
  );
}
