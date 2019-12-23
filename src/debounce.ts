export function debounce(func: Function, wait: number) {
  let timeout: number | null = null;
  return function() {
    const context = this;
    const args = arguments;
    if (timeout !== null) {
      self.clearTimeout(timeout);
    }
    timeout = self.setTimeout(() => {
      timeout = null;
      func.apply(context, args);
    }, wait);
  };
}
