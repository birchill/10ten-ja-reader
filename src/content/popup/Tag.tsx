import { classes } from '../../utils/classes';

import { usePopupOptions } from './options-context';

export function Tag({
  tagType,
  text,
  langTag,
  selectState,
}: {
  tagType: string;
  text?: string;
  langTag: string;
  selectState: 'unselected' | 'selected' | 'flash';
}) {
  const { interactive } = usePopupOptions();

  const tagColors: Record<string, string> = {
    fem: 'pink',
    masc: 'blue',
    place: 'green',
    field: 'green',
    misc: 'blue',
    dial: 'pink',
  };
  const tagColor = tagColors[tagType];

  return text ? (
    <span
      class={classes(
        'tp:text-2xs tp:px-1 tp:whitespace-nowrap',
        'tp:rounded-sm tp:border-solid tp:border',
        'tp:bg-[var(--color-tag-bg,transparent)]',
        ...(selectState === 'selected'
          ? [
              'tp:no-overlay:border-(--selected-tag-border)',
              'tp:no-overlay:text-(--selected-tag-color)',
            ]
          : [
              'tp:border-[var(--color-tag-border,var(--tag-border))]',
              'tp:text-[var(--color-tag-text-color,var(--text-color))]',
            ]),
        interactive &&
          classes(
            'tp:group-hover:border-(--selected-tag-border)',
            'tp:group-hover:text-(--selected-tag-color)'
          )
      )}
      style={
        tagColor && {
          '--color-tag-bg': `var(--tag-${tagColor}-bg)`,
          '--color-tag-border': `var(--tag-${tagColor}-border)`,
          '--color-tag-text-color': `var(--tag-${tagColor}-text)`,
        }
      }
      lang={langTag}
    >
      {text}
    </span>
  ) : null;
}
