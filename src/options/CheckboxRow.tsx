import type { ComponentProps } from 'preact';

export function CheckboxRow(
  props: Omit<ComponentProps<'div'>, 'class' | 'className'>
) {
  return (
    <div
      {...props}
      class="flex items-baseline gap-1.5 leading-snug [&>:not(input)]:flex-1 [&>label]:cursor-pointer [&>label]:select-none"
    >
      {props.children}
    </div>
  );
}
