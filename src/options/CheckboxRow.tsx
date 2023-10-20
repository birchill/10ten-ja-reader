import type { ComponentProps } from 'preact';

export function CheckboxRow(
  props: Omit<ComponentProps<'div'>, 'class' | 'className'>
) {
  return (
    <div
      {...props}
      class="my-2 flex items-baseline gap-2 [&>:not(input)]:flex-1 [&>:not(input)]:leading-snug"
    >
      {props.children}
    </div>
  );
}
