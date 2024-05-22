export class AbortError extends Error {
  constructor(...params: any[]) {
    super(...params);
    Object.setPrototypeOf(this, AbortError.prototype);

    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, AbortError);
    }

    this.name = 'AbortError';
  }
}
