// Convert an error into a form that able to sent with postMessage and that
// is also compatible with Bugsnag's NotifiableError type.
export function serializeError(
  error: Error
): { name: string; message: string } {
  let name: string;

  // We need to be careful not to read the 'code' field unless it's a string
  // because DOMExceptions, for example, have a code field that is a number
  // but what we really want from them is their 'name' field.
  if (typeof (error as any).code === 'string') {
    name = (error as any).code;
  } else {
    name = (error as any).name || (error as any).message;
  }

  // Also, if we get a generic "Error" with a more specific message field, we
  // should use that.
  if (
    name === 'Error' &&
    typeof (error as any).message === 'string' &&
    (error as any).message.length
  ) {
    name = (error as any).message;
  }

  // Common conversions to more specific/useful error classes.
  if (error instanceof TypeError && error.message.startsWith('NetworkError')) {
    name = 'NetworkError';
  }
  if (name === 'NetworkError' && !self.navigator.onLine) {
    name = 'OfflineError';
  }

  // Set the message to the message field, unless we're already using that as
  // the name.
  let message = (error as any).message || '';
  if (message === name) {
    message = '';
  }

  return { name, message };
}
