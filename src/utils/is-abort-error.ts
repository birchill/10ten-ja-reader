import type { AbortError } from '@birchill/jpdict-idb';

import { isObject } from './is-object';

type AbortDomException = DOMException & { name: 'AbortError' };

export function isAbortError(e: unknown): e is AbortError | AbortDomException {
  return isObject(e) && 'name' in e && e.name === 'AbortError';
}
