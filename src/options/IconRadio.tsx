import type { ComponentProps, JSX } from 'preact';
import { forwardRef } from 'preact/compat';
import { useId } from 'preact/hooks';

import { classes } from '../utils/classes';

type InputProps = Omit<
  ComponentProps<'input'>,
  'id' | 'type' | 'class' | 'className'
> & { label?: string };

export const IconRadio = forwardRef<HTMLInputElement, InputProps>(
  (props: InputProps, ref) => {
    const id = useId();

    return (
      <div>
        <input
          ref={ref}
          id={id}
          type="radio"
          class="peer sr-only"
          {...{ ...props, children: undefined }}
        />
        <label
          class={classes(
            'peer-focus-visible:outline-auto group cursor-pointer rounded-md border border-solid',
            'text-center transition duration-300',
            !props.checked &&
              'opacity-50 grayscale hover:opacity-100 hover:grayscale-0 active:opacity-100 active:grayscale-0',
            props.label
              ? 'flex flex-col items-center overflow-hidden rounded-md border-zinc-500 bg-white dark:border-zinc-100/20 dark:bg-zinc-900'
              : 'border-transparent'
          )}
          for={id}
        >
          <div
            class={
              props.label
                ? 'w-full bg-zinc-100 group-hover:bg-zinc-200 dark:bg-zinc-800 dark:group-hover:bg-zinc-700'
                : ''
            }
          >
            {props.children}
          </div>
          {!!props.label && (
            <div class="flex w-full items-center gap-1.5 border-0 border-t border-solid border-t-zinc-500 px-2 py-1.5 dark:border-t-zinc-100/20">
              <Radio checked={props.checked} />
              {props.label}
            </div>
          )}
        </label>
      </div>
    );
  }
);

function Radio(props: {
  checked?: boolean | JSX.SignalLike<boolean | undefined>;
}) {
  return (
    <span
      class={classes(
        'inline-block size-4 rounded-full border border-solid border-zinc-500 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-700',
        props.checked
          ? 'border-blue-700 bg-white shadow-[inset_0_0_0_2.5px_theme(colors.blue.500)] dark:bg-zinc-900'
          : 'group-hover:bg-zinc-200 dark:group-hover:bg-zinc-600'
      )}
    />
  );
}
