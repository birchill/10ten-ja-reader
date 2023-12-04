import type { RenderableProps } from 'preact';

import type { EmptyProps } from '../utils/type-helpers';

export function SectionHeading(props: RenderableProps<EmptyProps>) {
  return (
    <h1 class="mb-2 mt-4 border-0 border-t border-solid border-t-zinc-300 pt-4 text-2xl font-light first-of-type:mt-2 first-of-type:border-none first-of-type:pt-0">
      {props.children}
    </h1>
  );
}
