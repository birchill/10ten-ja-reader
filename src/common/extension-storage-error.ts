export class ExtensionStorageError extends Error {
  key: string;
  action: 'set' | 'get' | 'remove';

  constructor(
    { key, action }: { key: string; action: 'set' | 'get' | 'remove' },
    ...params: Array<any>
  ) {
    super(...params);
    Object.setPrototypeOf(this, ExtensionStorageError.prototype);

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ExtensionStorageError);
    }

    this.name = 'ExtensionStorageError';
    this.message = `Failed to ${action} '${key}'`;
    this.key = key;
    this.action = action;
  }
}
