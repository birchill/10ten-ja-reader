import type { ComponentProps, RenderableProps } from 'preact';
import { forwardRef } from 'preact/compat';
import { useId } from 'preact/hooks';

import { classes } from '../utils/classes';

type KeyboxProps = { label: string; isMac?: boolean };

export function KeyBox(props: KeyboxProps) {
  return (
    <kbd
      class={classes(
        'font-inherit my-0.5 inline-flex h-9 min-w-[2.5em] p-2 text-sm',
        'flex-col items-center justify-center',
        'rounded-lg border border-solid border-zinc-400 bg-white dark:bg-zinc-800',
        'border-b-[3px] border-b-zinc-500'
      )}
    >
      {translateKey(props.label, !!props.isMac)}
    </kbd>
  );
}

function translateKey(key: string, isMac: boolean) {
  if (!isMac) {
    return key;
  }

  switch (key) {
    case 'Command':
      return '⌘';

    case 'Ctrl':
      return 'Control';

    case 'Alt':
      return '⌥';

    default:
      return key;
  }
}

type CheckboxProps = Omit<
  ComponentProps<'input'>,
  'type' | 'class' | 'className'
>;

export const KeyCheckbox = forwardRef<
  HTMLInputElement,
  RenderableProps<CheckboxProps>
>((props: CheckboxProps, ref) => {
  const id = useId();

  // If we use align-items: normal etc. the checkboxes line up with the label
  // text nicely but we want to use align-items: baseline (`items-baseline`) so
  // that we can line up any descriptive text with the checkbox labels (i.e.
  // make this flexbox container into a container that "participates in baseline
  // alignment" (https://drafts.csswg.org/css-flexbox-1/#baseline-participation).
  //
  // Doing that, however, pushes the checkboxes up a bit so they no longer
  // appear vertically centered with the label text. To fix that we nudge the
  // checkboxes down a bit with `translate-y-0.5` which seems to do the trick in
  // at least Firefox and Chrome.
  return (
    <div class="flex items-baseline gap-1">
      <input
        class="translate-y-0.5 [&:disabled+label]:opacity-50 [&:not(:checked)+label]:opacity-50"
        id={props.id || id}
        type="checkbox"
        ref={ref}
        {...props}
      />
      <label for={props.id || id}>{props.children}</label>
    </div>
  );
});

type InputProps = Omit<ComponentProps<'input'>, 'class' | 'className'>;

export const KeyInput = forwardRef<HTMLInputElement, InputProps>(
  (props: InputProps, ref) => {
    return (
      <input
        class={classes(
          'transparent-caret font-inherit my-0.5 h-9 w-20 p-2 text-center text-sm',
          'rounded-lg border border-solid border-zinc-400 bg-white dark:bg-zinc-800',
          'border-b-[3px] border-b-zinc-500 disabled:opacity-50'
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
