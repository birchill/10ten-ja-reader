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

/**
 * Props type for a component that takes no props (but may take children).
 *
 * FunctionComponents etc. have an argument type of RenderableProps<Props> where
 * RenderableProps is defined as:
 *
 * export type RenderableProps<P, RefType = any> = P &
 *   Readonly<Attributes & { children?: ComponentChildren; ref?: Ref<RefType> }>;
 *
 * If `P` here is `void` or `Record<string, never>` or some such then the
 * intersection type will end up obliterating the `children` member. See:
 *
 * https://stackoverflow.com/questions/68241929/empty-object-type-that-intersects-nicely-with-non-empty-object
 *
 * Instead we need a special type that allows us to intersect with the above
 * such that `children` is preserved but no other props are added.
 *
 * Intersestingly this issue doesn't seem to arise if we include any code (i.e.
 * not just types) from `preact/compat` in the file defining the component so
 * there must be some side effects from that code.
 */
export type EmptyProps = { __tag?: never };
