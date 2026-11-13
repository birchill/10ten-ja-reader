import type { ComponentProps } from 'preact';

import { classes } from '../utils/classes';

type Props = Omit<ComponentProps<'button'>, 'class' | 'className'> & {
  variant: 'primary' | 'secondary' | 'link' | 'quiet-link';
  size?: 'normal' | 'small';
};

// The options page prevents buttons from wrapping. These labels can be long
// once translated so we allow them to wrap at narrow widths.
export function ReportingButton({ variant, size = 'normal', ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      class={classes(
        'cursor-pointer font-[inherit] text-sm whitespace-normal! disabled:cursor-default disabled:opacity-60',
        variant === 'primary' || variant === 'secondary'
          ? classes(
              'rounded-md border border-solid text-start!',
              size === 'small' ? 'px-3 py-1' : 'px-3.5 py-1.5'
            )
          : 'm-0 min-h-0! border-0 bg-transparent p-0 text-start! underline',
        variant === 'primary' &&
          'border-blue-800 bg-blue-800 text-white hover:border-blue-900 hover:bg-blue-900 dark:border-blue-300 dark:bg-blue-300 dark:text-black dark:hover:border-blue-200 dark:hover:bg-blue-200',
        variant === 'secondary' &&
          'border-zinc-400 bg-zinc-100 text-inherit hover:bg-zinc-200 dark:border-zinc-500 dark:bg-zinc-700 dark:hover:bg-zinc-600',
        variant === 'link' && 'text-blue-800 dark:text-blue-300',
        variant === 'quiet-link' &&
          'text-inherit decoration-dotted hover:decoration-solid'
      )}
    />
  );
}
