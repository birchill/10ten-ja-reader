import { classes } from '../../utils/classes';

import { usePopupOptions } from './options-context';

export function Tag({
  tagType,
  text,
  langTag,
}: {
  tagType: string;
  text?: string;
  langTag: string;
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
        'tp:border-[var(--color-tag-border,var(--tag-border))]',
        'tp:text-[var(--color-tag-text-color,var(--text-color))]',
        'tp:no-overlay:group-data-selected:border-(--selected-tag-border)',
        'tp:no-overlay:group-data-selected:text-(--selected-tag-color)',
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
