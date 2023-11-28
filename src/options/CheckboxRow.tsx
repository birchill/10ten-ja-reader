import type { ComponentProps } from 'preact';

export function CheckboxRow(
  props: Omit<ComponentProps<'div'>, 'class' | 'className'>
) {
  return (
    <div
      {...props}
      class="flex items-baseline gap-2 [&>:not(input)]:flex-1 [&>:not(input)]:leading-snug [&>label]:cursor-pointer [&>label]:select-none"
    >
      {props.children}
    </div>
  );
}
