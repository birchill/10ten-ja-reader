export function isObject(a: unknown): a is Record<string, any> {
  return typeof a === 'object' && a !== null && !Array.isArray(a);
}
