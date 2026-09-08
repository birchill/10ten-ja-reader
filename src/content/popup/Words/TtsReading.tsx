import type { WordResult } from '@birchill/jpdict-idb';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import type { AccentDisplay } from '../../../common/content-config-params';
import type { MoraTimingData } from '../../../common/tts/tts-request';
import { classes } from '../../../utils/classes';
import { useShouldAnimate } from '../../../utils/use-should-animate';

import type {
  TtsPlaybackController,
  TtsPlaybackState,
} from '../../tts-playback-controller';
import {
  type MoraDuration,
  computeMoraDurations,
} from '../../tts/mora-durations';
import type { ReadingToken, ReadingTokenGroup } from '../../tts/reading-tokens';
import {
  getAccentPos,
  getReadingTokens,
  groupReadingTokens,
} from '../../tts/reading-tokens';

import { accentClasses, accentLayer } from './Reading';

const FADE_MS = 400;

export type TtsReadingProps = {
  controller: Pick<TtsPlaybackController, 'subscribe' | 'state'>;
  entryIndex: number;
  readingIndex: number;
  kana: Pick<WordResult['r'][0], 'ent' | 'a'>;
  accentDisplay: AccentDisplay;
};

type Highlight = {
  timing: MoraTimingData;
  startedAt: number;
  fade?: { elapsedMs: number };
};
type AnimationPhase = 'a' | 'b';
type MoraPlaybackPhase = 'future' | 'active' | 'complete';

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
    playing ? { ...playing } : undefined
  );
  useEffect(() => {
    if (playing) {
      setHighlight({ ...playing });
    } else {
      setHighlight((current) =>
        current && !current.fade
          ? {
              ...current,
              fade: {
                elapsedMs: Math.max(performance.now() - current.startedAt, 0),
              },
            }
          : current
      );
    }
  }, [playing?.timing, playing?.startedAt]);

  const fade = highlight?.fade;
  useEffect(() => {
    if (!fade) {
      return;
    }

    // Time the fade out rather than listening for its animation to end. The
    // accent layer that used to carry it is dropped for accent-less readings.
    const timer = setTimeout(() => setHighlight(undefined), FADE_MS);
    return () => clearTimeout(timer);
  }, [fade]);

  // Read the clock once per clip. Unrelated renders must keep these delays
  // stable or the sweep restarts.
  const startedAt = highlight?.startedAt;
  const elapsedMs = useMemo(
    () =>
      startedAt === undefined ? 0 : Math.max(performance.now() - startedAt, 0),
    [startedAt]
  );

  const accentPos = getAccentPos(props.kana.a);
  const accentDisplay = accentPos === undefined ? 'none' : props.accentDisplay;
  const tokens = getReadingTokens(props.kana.ent, accentPos, accentDisplay);
  const groups = groupReadingTokens(tokens);
  const durations = highlight
    ? computeMoraDurations(tokens, highlight.timing)
    : undefined;
  const animationPhase = useAnimationPhase(
    durations ? highlight?.startedAt : undefined
  );

  const timeline: Timeline = {
    durations,
    elapsedMs,
    animationPhase,
    fade,
    grow: shouldAnimate,
  };
  const hasAccents = tokens.some((token) => token.accent !== undefined);

  return (
    <span class="tp:inline-grid tp:*:row-start-1 tp:*:col-start-1">
      <ReadingGlyphLayer
        groups={groups}
        accentDisplay={accentDisplay}
        timeline={timeline}
      />
      {hasAccents && (
        <ReadingAccentOverlay
          tokens={tokens}
          accentDisplay={accentDisplay}
          timeline={timeline}
        />
      )}
    </span>
  );
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
    state.moraTiming === undefined
  ) {
    return undefined;
  }

  return { timing: state.moraTiming, startedAt: state.startedAt };
}

function useAnimationPhase(startedAt: number | undefined): AnimationPhase {
  const previous = useRef<
    { startedAt: number; phase: AnimationPhase } | undefined
  >(undefined);

  // Alternating names restart an identical replay without remounting the
  // glyph nodes, which would otherwise reraster their baseline.
  if (startedAt !== undefined && previous.current?.startedAt !== startedAt) {
    previous.current = {
      startedAt,
      phase: previous.current?.phase === 'a' ? 'b' : 'a',
    };
  }

  return previous.current?.phase ?? 'a';
}

type Timeline = {
  durations: ReadonlyArray<MoraDuration> | undefined;
  elapsedMs: number;
  animationPhase: AnimationPhase;
  fade: { elapsedMs: number } | undefined;
  grow: boolean;
};

function ReadingGlyphLayer(props: {
  groups: ReadonlyArray<ReadingTokenGroup>;
  accentDisplay: AccentDisplay;
  timeline: Timeline;
}) {
  const layer = accentLayer(props.accentDisplay);
  const hasAccentBorders = props.groups.some(
    (group) => group.accent !== undefined
  );
  let moraIndex = 0;

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
      {props.groups.map((group, groupIndex) => (
        // The border sits on a plain inline box, exactly as it does in
        // `Reading`. An inline-block here would size it to the line box and
        // shift every accent line a few pixels off the glyphs.
        <span key={groupIndex} class={accentClasses(group.accent)}>
          {group.tokens.map((token) => (
            <MoraGlyph
              key={moraIndex}
              token={token}
              mora={moraIndex++}
              timeline={props.timeline}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

function MoraGlyph(props: {
  token: ReadingToken;
  mora: number;
  timeline: Timeline;
}) {
  const { durations, elapsedMs, animationPhase, fade, grow } = props.timeline;
  const duration = durations?.[props.mora];
  const timing = animationTiming(duration, elapsedMs);
  const playbackPhase =
    duration && fade ? moraPlaybackPhase(duration, fade.elapsedMs) : undefined;

  const swell =
    grow && timing && (!fade || playbackPhase === 'active')
      ? `tts-mora-grow-${animationPhase} ${timing}`
      : undefined;
  const color =
    duration && timing
      ? fade
        ? playbackPhase !== 'future'
          ? `tts-mora-unhighlight ${FADE_MS}ms ease-in-out ${unhighlightDelay(
              duration,
              fade.elapsedMs
            )}ms forwards`
          : undefined
        : `tts-mora-highlight-${animationPhase} ${timing} forwards`
      : undefined;

  return (
    <span class={classes('tp:inline-block', 'tp:leading-none')}>
      <span
        class="tp:inline-block"
        style={{
          scale: '1',
          transformOrigin: 'center bottom',
          animation: [swell, color].filter(Boolean).join(', ') || undefined,
        }}
      >
        {props.token.text}
      </span>
      {props.token.downstep && (
        <span style={color ? { animation: color } : undefined}>ꜜ</span>
      )}
    </span>
  );
}

function ReadingAccentOverlay(props: {
  tokens: ReadonlyArray<ReadingToken>;
  accentDisplay: AccentDisplay;
  timeline: Timeline;
}) {
  const layer = accentLayer(props.accentDisplay);
  const { durations, elapsedMs, animationPhase, fade } = props.timeline;

  return (
    <span
      aria-hidden
      class="tp:pointer-events-none"
      style={
        fade && durations
          ? { animation: `fade-out ${FADE_MS}ms ease-in-out forwards` }
          : undefined
      }
    >
      <span
        class={layer.classes}
        style={{ '--border-width': layer.borderWidth }}
      >
        {props.tokens.map((token, index) => {
          const duration = durations?.[index];
          const timing = animationTiming(duration, elapsedMs);
          const playbackPhase =
            duration && fade
              ? moraPlaybackPhase(duration, fade.elapsedMs)
              : undefined;

          let reveal: string | undefined;
          if (timing && !fade) {
            reveal = `tts-mora-reveal-${animationPhase} ${timing} forwards`;
          } else if (duration && fade && playbackPhase === 'active') {
            // Freeze the half-revealed mora. Letting its reveal run while the
            // layer fades multiplies two curves and flashes the ink brighter.
            reveal =
              `tts-mora-reveal-${animationPhase} ` +
              `${Math.round(duration.durationMs)}ms ease-in-out ` +
              `${-Math.round(fade.elapsedMs - duration.startMs)}ms ` +
              `forwards paused`;
          }
          const opacity = fade && playbackPhase === 'complete' ? 1 : 0;

          return (
            <span
              key={index}
              class={solidAccentClasses(token.accent)}
              style={{ opacity, animation: reveal }}
            >
              <span class="tp:invisible tp:inline-block tp:leading-none">
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

function unhighlightDelay(
  duration: MoraDuration,
  fadeElapsedMs: number
): number {
  const progress = Math.min(
    Math.max((fadeElapsedMs - duration.startMs) / duration.durationMs, 0),
    1
  );

  // Highlight and unhighlight share the symmetric ease-in-out curve, so
  // starting the reverse at 1 - progress keeps the colour already on screen.
  return Math.round(-(1 - progress) * FADE_MS);
}

function solidAccentClasses(
  accent: ReadingToken['accent']
): string | undefined {
  const borders = accentClasses(accent);

  // Only a mora that draws a line may name a border style: nothing in this
  // popup resets `border-width`, so `border-style` on its own resurrects the
  // browser's default `medium` width and pads the mora out by 3px a side.
  return borders
    ? classes('tp:border-solid tp:border-(--tts-highlight)', borders)
    : undefined;
}
