import type { WordResult } from '@birchill/jpdict-idb';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import type { AccentDisplay } from '../../../common/content-config-params';
import type { MoraTimingData } from '../../../common/tts/tts-request';
import { classes } from '../../../utils/classes';

import type {
  TtsPlaybackController,
  TtsPlaybackState,
} from '../../tts-playback-controller';
import {
  type MoraDuration,
  computeMoraDurations,
} from '../../tts/mora-durations';
import type { ReadingToken } from '../../tts/reading-tokens';
import { getAccentPos, getReadingTokens } from '../../tts/reading-tokens';

import { useShouldAnimate } from '../hooks/use-should-animate';

import { accentClasses, accentLayer } from './Reading';

export type TtsReadingProps = {
  controller: Pick<TtsPlaybackController, 'subscribe' | 'state'>;
  entryIndex: number;
  readingIndex: number;
  kana: WordResult['r'][0];
  accentDisplay: AccentDisplay;
};

type Highlight = {
  timing: MoraTimingData;
  startedAt: number;
  fading: boolean;
  fadeElapsedMs?: number;
};
type AnimationPhase = 'a' | 'b';
type MoraPlaybackPhase = 'future' | 'active' | 'complete';

/**
 * A reading whose own glyphs become highlighted during TTS playback.
 *
 * There deliberately is no second visible copy of the reading. Two text
 * layers can have matching boxes and still expose one another when only one
 * copy is transformed or when the compositor rounds their antialiased edges.
 */
export function TtsReading(props: TtsReadingProps) {
  const shouldAnimate = useShouldAnimate();

  const [state, setState] = useState<TtsPlaybackState>(
    () => props.controller.state
  );
  useEffect(() => props.controller.subscribe(setState), [props.controller]);

  const playing = spokenNow(state, props.entryIndex, props.readingIndex);
  // Seed from the first render's state, not just the subscribe effect: a popup
  // rebuilt mid-playback must catch up on its first paint.
  const [highlight, setHighlight] = useState<Highlight | undefined>(() =>
    playing && shouldAnimate ? { ...playing, fading: false } : undefined
  );
  useEffect(() => {
    if (!shouldAnimate) {
      setHighlight(undefined);
    } else if (playing) {
      setHighlight({ ...playing, fading: false });
    } else {
      setHighlight((current) =>
        current && !current.fading
          ? {
              ...current,
              fading: true,
              fadeElapsedMs: Math.max(performance.now() - current.startedAt, 0),
            }
          : current
      );
    }
  }, [playing?.timing, playing?.startedAt, shouldAnimate]);

  // Read the clock once per clip, and again when animation is switched back on.
  // Unrelated renders must keep these delays stable or the sweep restarts.
  const startedAt = highlight?.startedAt;
  const elapsedMs = useMemo(
    () =>
      startedAt === undefined ? 0 : Math.max(performance.now() - startedAt, 0),
    [startedAt, shouldAnimate]
  );

  const accentPos = getAccentPos(props.kana.a);
  const accentDisplay = accentPos === undefined ? 'none' : props.accentDisplay;
  const tokens = getReadingTokens(props.kana.ent, accentPos, accentDisplay);
  const durations =
    shouldAnimate && highlight
      ? computeMoraDurations(tokens, props.kana.ent, highlight.timing)
      : undefined;
  const animationPhase = useAnimationPhase(
    durations ? highlight?.startedAt : undefined
  );

  return (
    <span class="tp:inline-grid tp:*:row-start-1 tp:*:col-start-1">
      <ReadingGlyphLayer
        tokens={tokens}
        durations={durations}
        elapsedMs={elapsedMs}
        accentDisplay={accentDisplay}
        animationPhase={animationPhase}
        fading={highlight?.fading ?? false}
        fadeElapsedMs={highlight?.fadeElapsedMs}
      />
      <ReadingAccentOverlay
        tokens={tokens}
        durations={durations}
        elapsedMs={elapsedMs}
        accentDisplay={accentDisplay}
        animationPhase={animationPhase}
        fading={highlight?.fading ?? false}
        fadeElapsedMs={highlight?.fadeElapsedMs}
        onFadeOutEnd={() => setHighlight(undefined)}
      />
    </span>
  );
}

/** One permanently mounted, visible glyph per mora. */
function ReadingGlyphLayer(props: {
  tokens: ReadonlyArray<ReadingToken>;
  durations: ReadonlyArray<MoraDuration> | undefined;
  elapsedMs: number;
  accentDisplay: AccentDisplay;
  animationPhase: AnimationPhase;
  fading: boolean;
  fadeElapsedMs: number | undefined;
}) {
  const layer = accentLayer(props.accentDisplay);
  const hasAccentBorders = props.tokens.some(
    (token) => token.accent !== undefined
  );

  return (
    <span
      class={classes(
        layer.classes,
        hasAccentBorders && 'tp:*:border-dotted',
        hasAccentBorders &&
          (props.accentDisplay === 'binary-hi-contrast'
            ? 'tp:*:border-(--hi-contrast-pitch-accent)'
            : 'tp:*:border-current')
      )}
      style={{ '--border-width': layer.borderWidth }}
    >
      {props.tokens.map((token, index) => {
        const duration = props.durations?.[index];
        const timing = animationTiming(duration, props.elapsedMs);
        const playbackPhase =
          duration && props.fadeElapsedMs !== undefined
            ? moraPlaybackPhase(duration, props.fadeElapsedMs)
            : undefined;
        const hop =
          timing && (!props.fading || playbackPhase === 'active')
            ? `tts-mora-hop-${props.animationPhase} ${timing}`
            : undefined;
        const color =
          duration && timing
            ? props.fading &&
              props.fadeElapsedMs !== undefined &&
              playbackPhase !== 'future'
              ? `tts-mora-unhighlight 400ms ease-in-out ${unhighlightDelay(
                  duration,
                  props.fadeElapsedMs
                )}ms forwards`
              : !props.fading
                ? `tts-mora-highlight-${props.animationPhase} ${timing} forwards`
                : undefined
            : undefined;

        return (
          <span
            key={index}
            class={classes('tp:inline-block', accentClasses(token.accent))}
          >
            <span
              class="tp:inline-block"
              style={{
                // Keep the delayed hop's resting paint state identical to the
                // idle one. Attaching a scale animation here made Chromium
                // rerasterize every gray mora before any highlight was visible.
                translate: '0 0',
                animation: [hop, color].filter(Boolean).join(', ') || undefined,
              }}
            >
              {token.text}
            </span>
            {token.downstep && (
              <span style={color ? { animation: color } : undefined}>ꜜ</span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/**
 * The only stacked layer contains pitch-accent ink, never visible glyphs.
 * Its hidden placeholders give each border the exact dimensions of its mora.
 */
function ReadingAccentOverlay(props: {
  tokens: ReadonlyArray<ReadingToken>;
  durations: ReadonlyArray<MoraDuration> | undefined;
  elapsedMs: number;
  accentDisplay: AccentDisplay;
  animationPhase: AnimationPhase;
  fading: boolean;
  fadeElapsedMs: number | undefined;
  onFadeOutEnd: () => void;
}) {
  const layer = accentLayer(props.accentDisplay);

  return (
    <span
      aria-hidden
      class="tp:pointer-events-none"
      style={
        props.fading && props.durations
          ? { animation: 'fade-out 400ms ease-in-out forwards' }
          : undefined
      }
      onAnimationEnd={(event) => {
        if (event.animationName === 'fade-out') {
          props.onFadeOutEnd();
        }
      }}
    >
      <span
        class={layer.classes || undefined}
        style={{ '--border-width': layer.borderWidth }}
      >
        {props.tokens.map((token, index) => {
          const duration = props.durations?.[index];
          const timing = animationTiming(duration, props.elapsedMs);
          const playbackPhase =
            duration && props.fadeElapsedMs !== undefined
              ? moraPlaybackPhase(duration, props.fadeElapsedMs)
              : undefined;
          const reveal =
            timing && (!props.fading || playbackPhase === 'active')
              ? `tts-mora-reveal-${props.animationPhase} ${timing} forwards`
              : undefined;
          const opacity = props.fading && playbackPhase === 'complete' ? 1 : 0;

          return (
            <span
              key={index}
              class={classes(
                'tp:inline-block',
                solidAccentClasses(token.accent)
              )}
              style={{ opacity, animation: reveal }}
            >
              <span class="tp:invisible">
                {token.text}
                {token.downstep && 'ꜜ'}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

function animationTiming(
  duration: MoraDuration | undefined,
  elapsedMs: number
): string | undefined {
  // A negative delay leaves an already-spoken mora at its filled end state,
  // which is how a popup mounted mid-reading catches up.
  return duration
    ? `${Math.round(duration.durationMs)}ms ease-in-out ${Math.round(
        duration.startMs - elapsedMs
      )}ms`
    : undefined;
}

function unhighlightDelay(
  duration: MoraDuration,
  fadeElapsedMs: number
): number {
  const progress = Math.min(
    Math.max(
      (fadeElapsedMs - duration.startMs) / Math.max(duration.durationMs, 1),
      0
    ),
    1
  );

  // The highlight and unhighlight both use the symmetric ease-in-out curve.
  // Starting the reverse animation at 1 - progress preserves the exact color
  // already on screen: future moras stay gray and a partial mora cannot flash.
  return Math.round(-(1 - progress) * 400);
}

function moraPlaybackPhase(
  duration: MoraDuration,
  elapsedMs: number
): MoraPlaybackPhase {
  if (elapsedMs <= duration.startMs) {
    return 'future';
  }
  if (elapsedMs < duration.startMs + duration.durationMs) {
    return 'active';
  }
  return 'complete';
}

/**
 * Alternating animation names restart an identical replay without remounting
 * the glyph nodes. Keeping those nodes stable prevents a baseline reraster.
 */
function useAnimationPhase(startedAt: number | undefined): AnimationPhase {
  const previous = useRef<
    { startedAt: number; phase: AnimationPhase } | undefined
  >(undefined);

  if (startedAt !== undefined && previous.current?.startedAt !== startedAt) {
    previous.current = {
      startedAt,
      phase: previous.current?.phase === 'a' ? 'b' : 'a',
    };
  }

  return previous.current?.phase ?? 'a';
}

function spokenNow(
  state: TtsPlaybackState,
  entryIndex: number,
  readingIndex: number
): { timing: MoraTimingData; startedAt: number } | undefined {
  if (
    state.kind !== 'playing' ||
    state.activeEntryIndex !== entryIndex ||
    state.readingIndex !== readingIndex ||
    state.moraTiming === undefined ||
    state.startedAt === undefined
  ) {
    return undefined;
  }

  return { timing: state.moraTiming, startedAt: state.startedAt };
}

function solidAccentClasses(
  accent: ReadingToken['accent']
): string | undefined {
  const borders = accentClasses(accent);

  // Only a mora that draws a line may name a border style: nothing in this
  // popup resets `border-width`, so `border-style` on its own resurrects the
  // browser's default `medium` width and pads the mora out by 3px a side.
  return borders
    ? classes('tp:border-solid tp:border-(--primary-highlight)', borders)
    : undefined;
}
