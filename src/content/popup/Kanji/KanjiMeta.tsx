import { useLocale } from '../../../common/i18n';

export type Props = { tags: Array<string> };

export function KanjiMeta(props: Props) {
  const { t, langTag } = useLocale();

  return (
    <div class="tp-flex tp-gap-2 -tp-mx-1">
      {props.tags.map((tag) => (
        <span
          key={tag}
          class="tp-text-sm tp-border tp-border-current tp-border-solid tp-rounded tp-py-0.5 tp-px-1"
          lang={langTag}
        >
          {t(`content_kanji_meta_${tag.replace(' ', '_')}`)}
        </span>
      ))}
    </div>
  );
}
