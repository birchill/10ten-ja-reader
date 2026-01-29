import type { KanjiResult } from '@birchill/jpdict-idb';

import { useLocale } from '../../../common/i18n';
import { classes } from '../../../utils/classes';

export type Props = { comp: KanjiResult['comp'] };

export function KanjiComponents(props: Props) {
  return (
    <div>
      <div
        // There's something odd in Firefox where, when you're viewing a
        // text/plain document, the text color rule on the window doesn't
        // inherit into the table so we have to explicitly re-establish the
        // color here.
        class="tp:-mx-3 tp:grid tp:grid-cols-[max-content_max-content_auto] tp:gap-y-2 tp:text-[--text-color] tp:text-xs tp:leading-normal"
      >
        {props.comp.map((c) => (
          <KanjiComponent key={c.c} comp={c} />
        ))}
      </div>
    </div>
  );
}

function KanjiComponent(props: { comp: KanjiResult['comp'][0] }) {
  const { comp } = props;

  return (
    <>
      <span
        lang="ja"
        class={classes(
          'tp:pl-3 tp:pr-2',
          props.comp.is_rad &&
            'tp:rounded-l-lg tp:bg-(--cell-highlight-bg) tp:text-(--cell-highlight-fg) tp:py-1'
        )}
      >
        {comp.c}
      </span>
      <span
        lang="ja"
        class={classes(
          'tp:px-2',
          comp.is_rad &&
            'tp:bg-(--cell-highlight-bg) tp:text-(--cell-highlight-fg) tp:py-1'
        )}
      >
        {comp.na?.length
          ? comp.is_rad
            ? comp.na.join('、')
            : comp.na[0]
          : '-'}
      </span>
      <span
        lang={comp.m_lang}
        class={classes(
          'tp:pl-2 tp:pr-3',
          comp.is_rad &&
            'tp:rounded-r-lg tp:bg-(--cell-highlight-bg) tp:text-(--cell-highlight-fg) tp:py-1'
        )}
      >
        {comp.m?.length ? (comp.is_rad ? comp.m.join(', ') : comp.m[0]) : '-'}
      </span>
      {comp.base && <BaseRadical {...comp.base} />}
      {comp.sub?.length && (
        <div class="tp:col-start-2 tp:col-end-4 tp:-mx-3 tp:grid tp:grid-cols-[max-content_max-content_auto] tp:gap-y-1 tp:pr-3 tp:pl-2">
          {comp.sub?.map((c) => (
            <KanjiComponent key={c.c} comp={c} />
          ))}
        </div>
      )}
    </>
  );
}

function BaseRadical(props: NonNullable<KanjiResult['comp'][0]['base']>) {
  const { t, langTag } = useLocale();

  return (
    <span
      lang={langTag}
      class="tp:col-start-2 tp:col-end-4 tp:-mt-1 tp:pl-2 tp:pr-3 tp:italic tp:text-(--cell-highlight-fg)"
    >
      {t('content_kanji_base_radical', [
        props.c,
        props.na[0] ? `(${props.na[0]})` : '',
      ])}
    </span>
  );
}
