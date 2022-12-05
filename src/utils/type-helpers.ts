export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type Split<
  S extends string,
  D extends string
> = S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];

export type ExpandRecursively<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T;

export type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][];
