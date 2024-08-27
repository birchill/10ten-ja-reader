import type { RenderableProps } from 'preact';

import { useLocale } from '../../common/i18n';
import { classes } from '../../utils/classes';

export type Props = {
  sc: number;
  isPlayingAnimation?: boolean;
  onToggleAnimation?: () => void;
};

export function StrokeCount(props: Props) {
  const { t } = useLocale();

  const strokeLabel =
    props.sc === 1
      ? t('content_kanji_strokes_label_1')
      : t('content_kanji_strokes_label', [String(props.sc)]);

  return (
    <DivOrButton
      class={classes(
        'tp-flex tp-gap-1.5 tp-items-center tp-text-smish tp-border-none tp-bg-transparent tp-appearance-none',
        props.onToggleAnimation &&
          'tp-cursor-pointer tp-text-[--cell-link-fg] tp-underline tp-decoration-dotted tp-underline-offset-2'
      )}
      onClick={props.onToggleAnimation}
    >
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
      {props.onToggleAnimation && (
        <svg
          class="tp-block tp-h-[12px] tp-w-[12px] tp-fill-current tp-opacity-50"
          role="presentation"
          viewBox="0 0 24 24"
        >
          {props.isPlayingAnimation ? (
            <rect width="24" height="24" rx="4" ry="4" />
          ) : (
            <path d="M24 12c0 .4-.1.8-.32 1.15-.21.35-.51.64-.88.84L3.52 23.74c-.34.17-.73.26-1.12.26-.43 0-.86-.12-1.23-.34a2.3 2.3 0 01-.86-.83C.1 22.5 0 22.1 0 21.7V2.3c0-.4.11-.79.32-1.13A2.43 2.43 0 012.33 0c.42-.01.83.08 1.2.26l19.24 9.73c.01 0 .01.02.03.02.37.2.67.49.88.84.21.35.32.74.32 1.15z" />
          )}
        </svg>
      )}
    </DivOrButton>
  );
}

function DivOrButton(
  props: RenderableProps<{ class?: string; onClick?: () => void }>
) {
  return props.onClick ? (
    <button type="button" onClick={props.onClick} {...props}>
      {props.children}
    </button>
  ) : (
    <div {...props}>{props.children}</div>
  );
}
