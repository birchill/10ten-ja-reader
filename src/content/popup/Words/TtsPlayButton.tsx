import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { useLocale } from '../../../common/i18n';
import { classes } from '../../../utils/classes';

import type {
  TtsPlaybackHandle,
  TtsPlaybackState,
} from '../../tts-playback-controller';

import type { TtsButtonState } from '../hooks/use-deferred-loading';
import { useDeferredLoading } from '../hooks/use-deferred-loading';
import { useShouldAnimate } from '../hooks/use-should-animate';
import { usePopupOptions } from '../options-context';
import { PLAY_PATH_OPTICALLY_CENTERED, STOP_PATH } from '../play-stop-paths';

export type TtsPlayButtonProps = {
  controller: TtsPlaybackHandle;
  entryIndex: number;
};

export function TtsPlayButton(props: TtsPlayButtonProps) {
  const { controller, entryIndex } = props;
  const { t, langTag } = useLocale();
  const { playReadingsShortcuts = [] } = usePopupOptions();
  const shouldAnimate = useShouldAnimate();

  const [state, setState] = useState<TtsPlaybackState>(() => controller.state);
  useEffect(() => controller.subscribe(setState), [controller]);

  const localKind = buttonState(state, entryIndex);
  const deferredState = useDeferredLoading(localKind);
  const isActive = localKind === 'loading' || localKind === 'playing';
  const dimForLoading = deferredState === 'loading' && !shouldAnimate;

  const label = t(
    isActive ? 'content_stop_readings_label' : 'content_play_readings_label'
  );
  const title = playReadingsShortcuts.length
    ? `${label} (${playReadingsShortcuts.join(' / ')})`
    : label;

  // Do not use --cell-highlight-bg; on yellow and black themes it blends
  // into a hovered row.
  const discBackground =
    'color-mix(in srgb, var(--text-color) 12%, transparent)';

  const hitAreaPadding = 'calc((13 / 14) * var(--base-font-size))';
  // Keep vertical padding smaller so the hit area does not overlap the first
  // definition.
  const hitAreaPaddingBlock =
    'max(calc((6 / 14) * var(--base-font-size)), calc((24px - var(--base-font-size)) / 2))';
  // The 14px row gap and 13px padding add 27px before the icon. Pull back
  // 15px to leave 12px.
  const marginInlineStart = 'calc((15 / 14) * var(--base-font-size))';
  const discInset = 'calc((9 / 14) * var(--base-font-size))';
  // Use a separate vertical inset so asymmetric button padding still produces
  // a round disc.
  const discInsetBlock =
    'calc((var(--tts-glyph) + 2 * var(--tts-pad-y) - 22 / 14 * var(--base-font-size)) / 2)';
  const glyphSize = 'calc((14 / 14) * var(--base-font-size))';
  const errorBadgeSize = 'calc((10 / 14) * var(--base-font-size))';
  // Without this optical adjustment, vertical-align: middle makes the disc
  // look too low.
  const verticalNudge = 'calc(-0.123 * var(--base-font-size))';

  return (
    <Fragment>
      <button
        type="button"
        lang={langTag}
        aria-label={label}
        title={title}
        style={{
          '--tts-disc-bg': discBackground,
          '--tts-pad': hitAreaPadding,
          '--tts-pad-y': hitAreaPaddingBlock,
          '--tts-margin-start': marginInlineStart,
          '--tts-disc-inset': discInset,
          '--tts-disc-inset-y': discInsetBlock,
          '--tts-glyph': glyphSize,
          '--tts-error-badge-size': errorBadgeSize,
          '--tts-nudge': verticalNudge,
        }}
        class={classes(
          'tts-play-button',
          'tp:group/tts tp:relative tp:inline-flex tp:items-center tp:justify-center',
          'tp:align-middle tp:cursor-pointer tp:box-content',
          'tp:appearance-none tp:border-0 tp:bg-transparent tp:text-inherit',
          'tp:rounded-full tp:translate-y-(--tts-nudge)',
          'tp:w-(--tts-glyph) tp:h-(--tts-glyph)',
          'tp:px-(--tts-pad) tp:py-(--tts-pad-y)',
          'tp:-me-(--tts-pad)',
          'tp:-my-(--tts-pad-y)',
          'tp:-ms-(--tts-margin-start)',
          'tp:before:absolute',
          'tp:before:inset-x-(--tts-disc-inset)',
          'tp:before:inset-y-(--tts-disc-inset-y)',
          'tp:before:rounded-full tp:before:pointer-events-none',
          'tp:hover:before:bg-(--tts-disc-bg)',
          'tp:hover:text-(--tts-highlight)',
          'tp:focus-visible:outline-2',
          'tp:focus-visible:-outline-offset-4',
          'tp:focus-visible:outline-(--tts-highlight)',
          'tp:forced-colors:focus-visible:outline-[Highlight]'
        )}
        onClick={(event) => {
          event.stopPropagation();
          controller.toggle(entryIndex);
        }}
      >
        <svg
          aria-hidden
          viewBox="-4 -1.5 28 28"
          class={classes(
            'tp:relative tp:w-(--tts-glyph) tp:h-(--tts-glyph)',
            'tp:group-active/tts:scale-[0.92]',
            // Do not apply hover opacity while loading; the pointer remains over
            // the button and would hide the dimmed state.
            dimForLoading
              ? 'tp:opacity-30'
              : 'tp:opacity-60 tp:group-hover/tts:opacity-100',
            deferredState === 'loading' &&
              shouldAnimate &&
              'tp:scan-line tp:animate-[scan-up_0.7s_infinite]'
          )}
        >
          <path
            d={
              deferredState === 'playing'
                ? STOP_PATH
                : PLAY_PATH_OPTICALLY_CENTERED
            }
            fill="currentColor"
            class={classes(
              shouldAnimate &&
                'tp:transition-[d] tp:duration-300 tp:ease-in-out'
            )}
          />
        </svg>
        {deferredState === 'error' && (
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            class={classes(
              'tts-error-badge',
              'tp:absolute',
              'tp:top-[calc(var(--tts-pad-y)-var(--tts-error-badge-size)/2)]',
              'tp:right-[calc(var(--tts-pad)-var(--tts-error-badge-size)/2)]',
              'tp:w-(--tts-error-badge-size)',
              'tp:h-(--tts-error-badge-size)',
              'tp:text-(--tts-error-badge-color)',
              shouldAnimate && 'tp:animate-[tts-badge-in_0.1s]'
            )}
          >
            <path
              fill="currentColor"
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            />
          </svg>
        )}
      </button>
      <span role="status" lang={langTag} class="tp:sr-only">
        {deferredState === 'error' ? t('content_play_readings_error') : ''}
      </span>
    </Fragment>
  );
}

function buttonState(
  state: TtsPlaybackState,
  entryIndex: number
): TtsButtonState {
  if (state.kind === 'idle' || state.activeEntryIndex !== entryIndex) {
    return 'idle';
  }

  // A gap between two readings is still playback as far as the button goes.
  // Reporting it as loading flips the glyph back to play mid-word.
  if (state.kind === 'loading' && state.audioStarted) {
    return 'playing';
  }

  return state.kind;
}
