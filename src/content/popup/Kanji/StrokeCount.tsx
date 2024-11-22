import { useLocale } from '../../../common/i18n';

export type Props = { sc: number };

export function StrokeCount(props: Props) {
  const { t } = useLocale();

  const strokeLabel =
    props.sc === 1
      ? t('content_kanji_strokes_label_1')
      : t('content_kanji_strokes_label', [String(props.sc)]);

  return (
    <div class="tp-flex tp-gap-1.5 tp-items-center tp-text-smish">
      <svg
        class="tp-block tp-h-[12px] tp-w-[12px] tp-fill-current tp-opacity-50"
        role="presentation"
        viewBox="0 0 16 16"
      >
        <circle cx="14.5" cy="1.5" r="1.5" />
        <polyline
          points="13 4.5 4 13.5 1 15 2.5 12 11.5 3"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>{strokeLabel}</span>
    </div>
  );
}
