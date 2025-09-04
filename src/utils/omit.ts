type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, Extract<K, keyof T>>
  : never;

/**
 * A helper to strip certain fields from an object.
 */
export function omit<T, K extends keyof T>(
  o: T,
  ...fields: Array<K>
): DistributiveOmit<T, K> {
  const result = { ...o };
  for (const field of fields) {
    delete result[field];
  }
  return result as DistributiveOmit<T, K>;
}
