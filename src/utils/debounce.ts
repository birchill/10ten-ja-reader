export function debounce(func: (...args: Array<any>) => any, delay: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Array<any>) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const context = this;
    // clearTimeout doesn't throw with invalid timeout, so the ! is harmless
    clearTimeout(timeoutId!);
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func.apply(context, args);
    }, delay);
  };
}
