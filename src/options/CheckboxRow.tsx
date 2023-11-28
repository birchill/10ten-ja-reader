import type { ComponentProps } from 'preact';

export function CheckboxRow(
  props: Omit<ComponentProps<'div'>, 'class' | 'className'>
) {
  return (
    <div
      {...props}
      class="flex items-baseline gap-1.5 leading-snug [&>:not(input)]:flex-1 [&>input]:translate-y-px [&>label]:cursor-pointer [&>label]:select-none"
    >
      {props.children}
    </div>
  );
}
