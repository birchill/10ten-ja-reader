import { useLocale } from '../../../common/i18n';

export type Props = { gr?: number };

export function GradeIndicator(props: Props) {
  const { t } = useLocale();

  let label: string;
  switch (props.gr || 0) {
    case 8:
      label = t('content_kanji_grade_general_use');
      break;

    case 9:
      label = t('content_kanji_grade_name_use');
      break;

    default:
      if (props.gr === undefined) {
        label = '-';
      } else {
        label = t('content_kanji_grade_label', [String(props.gr)]);
      }
      break;
  }

  return (
    <div class="tp-flex tp-gap-1.5 tp-items-center tp-text-smish">
      <svg
        class="tp-block tp-h-[12px] tp-w-[12px] tp-fill-current tp-opacity-50"
        role="presentation"
        viewBox="0 0 16 16"
      >
        <circle cx="14.5" cy="14.5" r="1.5" />
        <path d="M8,0A2.87,2.87,0,0,0,5,2.72v2.5A2.92,2.92,0,0,0,8,8a2.92,2.92,0,0,0,3-2.78V2.72A2.87,2.87,0,0,0,8,0Z" />
        <path d="M13.91,11.71A5.09,5.09,0,0,0,9.45,9H5.09A5.18,5.18,0,0,0,0,14.25.74.74,0,0,0,.73,15h10.9a.74.74,0,0,0,.73-.75,1.49,1.49,0,0,1,1.09-1.45.75.75,0,0,0,.49-.43A.76.76,0,0,0,13.91,11.71Z" />
      </svg>
      <span>{label}</span>
    </div>
  );
}
