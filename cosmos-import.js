import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(pathToFileURL('cosmos-import.js'));

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react') {
    return nextResolve('preact/compat', context);
  }

  return nextResolve(specifier, context);
}
