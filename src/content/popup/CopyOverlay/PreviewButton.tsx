import type { ComponentProps } from 'preact';

import { classes } from '../../../utils/classes';

import { Clipboard } from '../Icons/Clipboard';

type Props = ComponentProps<'button'> & {
  label: string;
  lang: string;
  previewText?: string;
};

export function PreviewButton({ label, lang, previewText, ...rest }: Props) {
  return (
    <button
      lang={lang}
      class={classes(
        'tp:appearance-none',
        'tp:m-0 tp:cursor-pointer tp:appearance-none tp:bg-white tp:px-8 tp:py-2',
        'tp:min-h-[60px]',
        'tp:rounded-2xl tp:border-[length:0.1px] tp:border-[hsl(0_0%_0%/10%)]',
        'tp:cursor-pointer tp:bg-white',
        'tp:text-lg tp:font-semibold tp:text-inherit',
        'tp:shadow-overlay-button',
        !previewText &&
          'tp:flex tp:items-center tp:justify-center tp:leading-[1.5]'
      )}
      {...rest}
    >
      {previewText ? (
        <>
          {label}
          <div
            class={classes(
              'tp:mt-1 tp:max-w-[200px]',
              'tp:flex tp:items-center',
              'tp:whitespace-nowrap tp:overflow-hidden',
              'tp:text-overlay-gray',
              'tp:text-sm tp:font-normal',
              'tp:mask-r-from-[180px]'
            )}
            role="presentation"
          >
            <div class="tp:shrink-0 tp:size-4 tp:mr-2 tp:opacity-60">
              <Clipboard />
            </div>
            <span lang="ja" class="min-w-0">
              {previewText}
            </span>
          </div>
        </>
      ) : (
        <>
          <div class="tp:size-5 tp:mr-2 tp:opacity-60 tp:-mt-0.5">
            <Clipboard />
          </div>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
