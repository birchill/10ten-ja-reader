export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type Split<
  S extends string,
  D extends string,
> = S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];

export type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][];

/**
 * Intersection of T & U but with the types of U being used where they overlap.
 */
export type Overwrite<T, U> = Omit<T, Extract<keyof T, keyof U>> & U;
