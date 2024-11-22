import { useLocale } from '../../../common/i18n';

export type Props = { frequency?: number };

export function FrequencyIndicator(props: Props) {
  const { t } = useLocale();

  return (
    <div class="tp-flex tp-gap-1.5 tp-items-center tp-text-smish">
      <svg
        class="tp-block tp-h-[12px] tp-w-[12px] tp-fill-current"
        role="presentation"
        viewBox="0 0 8 8"
      >
        <rect
          x="0"
          y="5"
          width="2"
          height="3"
          rx="0.5"
          ry="0.5"
          opacity={!props.frequency ? '0.5' : undefined}
        />
        <rect
          x="3"
          y="3"
          width="2"
          height="5"
          rx="0.5"
          ry="0.5"
          opacity={
            !props.frequency || props.frequency >= (2500 * 2) / 3
              ? '0.5'
              : undefined
          }
        />
        <rect
          x="6"
          width="2"
          height="8"
          rx="0.5"
          ry="0.5"
          opacity={
            !props.frequency || props.frequency >= 2500 / 3 ? '0.5' : undefined
          }
        />
      </svg>
      <span>
        {props.frequency ? (
          <>
            {`${t('content_kanji_frequency_label')} ${props.frequency.toLocaleString()}`}
            <span class="tp-text-xs"> / {Number(2500).toLocaleString()}</span>
          </>
        ) : (
          '-'
        )}
      </span>
    </div>
  );
}
