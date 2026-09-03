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
import { PLAY_PATH_OPTICALLY_CENTERED, STOP_PATH } from '../play-stop-paths';

export type TtsPlayButtonProps = {
  controller: TtsPlaybackHandle;
  entryIndex: number;
};

export function TtsPlayButton(props: TtsPlayButtonProps) {
  const { controller, entryIndex } = props;
  const { t, langTag } = useLocale();
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

  // Do not use --cell-highlight-bg for this color. On the yellow and black
  // themes, --cell-highlight-bg sits close to --hover-bg. A disc in that
  // color would not show on a hovered row.
  const discBackground =
    'color-mix(in srgb, var(--text-color) 12%, transparent)';

  const hitAreaPadding = 'calc((13 / 14) * var(--base-font-size))';
  // Keep the block padding well under the inline one: the hit box is not
  // clipped to the row, so matching the 13px would reach past the
  // half-leading and swallow clicks meant for the first definition line.
  const hitAreaPaddingBlock =
    'max(calc((6 / 14) * var(--base-font-size)), calc((24px - var(--base-font-size)) / 2))';
  // `tp:space-x-4` puts its 14px on the *preceding* sibling's inline-end, not
  // on this element, so that gap and the uncancelled 13px padding both stack in
  // front of the glyph. `tp:-ms` negates this, leaving 13 + 14 - 15 == 12px.
  const marginInlineStart = 'calc((15 / 14) * var(--base-font-size))';
  const discInset = 'calc((9 / 14) * var(--base-font-size))';
  // The disc has to stay round while the block padding is smaller than the
  // inline one, so its inset cannot be shared between the two axes.
  const discInsetBlock =
    'calc((var(--tts-glyph) + 2 * var(--tts-pad-y) - 22 / 14 * var(--base-font-size)) / 2)';
  const glyphSize = 'calc((14 / 14) * var(--base-font-size))';
  // vertical-align: middle centres on half the local font's x-height, not on
  // the text's own visual centre, so the disc sits low without this.
  const verticalNudge = 'calc(-0.123 * var(--base-font-size))';

  return (
    <Fragment>
      <button
        type="button"
        lang={langTag}
        aria-label={label}
        title={label}
        style={{
          '--tts-disc-bg': discBackground,
          '--tts-pad': hitAreaPadding,
          '--tts-pad-y': hitAreaPaddingBlock,
          '--tts-margin-start': marginInlineStart,
          '--tts-disc-inset': discInset,
          '--tts-disc-inset-y': discInsetBlock,
          '--tts-glyph': glyphSize,
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
            // The pointer sits on the button right after the click that
            // started loading, so the hover opacity has to stand down or the
            // dim below is the one thing the user never sees.
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
              'tp:absolute tp:top-0 tp:right-0',
              'tp:w-[calc((7/14)*var(--base-font-size))]',
              'tp:h-[calc((7/14)*var(--base-font-size))]',
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
