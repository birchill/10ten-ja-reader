import type { WordResult } from '@birchill/jpdict-idb';
import { useEffect, useMemo, useState } from 'preact/hooks';

import type { AccentDisplay } from '../../../common/content-config-params';
import type { MoraTimingData } from '../../../common/tts/tts-request';
import { classes } from '../../../utils/classes';

import type {
  TtsPlaybackController,
  TtsPlaybackState,
} from '../../tts-playback-controller';
import { computeMoraDurations } from '../../tts/mora-durations';
import type { ReadingToken } from '../../tts/reading-tokens';
import { getAccentPos, getReadingTokens } from '../../tts/reading-tokens';

import { useShouldAnimate } from '../hooks/use-should-animate';

import { accentClasses, accentLayer } from './Reading';

export type TtsReadingOverlayProps = {
  controller: Pick<TtsPlaybackController, 'subscribe' | 'state'>;
  entryIndex: number;
  readingIndex: number;
  kana: WordResult['r'][0];
  accentDisplay: AccentDisplay;
};

type Highlight = { timing: MoraTimingData; startedAt: number; fading: boolean };

export function TtsReadingOverlay(props: TtsReadingOverlayProps) {
  const shouldAnimate = useShouldAnimate();

  const [state, setState] = useState<TtsPlaybackState>(
    () => props.controller.state
  );
  useEffect(() => props.controller.subscribe(setState), [props.controller]);

  const playing = spokenNow(state, props.entryIndex, props.readingIndex);
  // Seed from the first render's state, not just the subscribe effect: a popup
  // rebuilt mid-playback would otherwise paint one unhighlighted frame.
  const [highlight, setHighlight] = useState<Highlight | undefined>(() =>
    playing ? { ...playing, fading: false } : undefined
  );
  useEffect(() => {
    if (playing) {
      setHighlight({ ...playing, fading: false });
    } else {
      setHighlight((current) =>
        current && !current.fading ? { ...current, fading: true } : current
      );
    }
  }, [playing?.timing, playing?.startedAt]);

  // Read the clock once per clip, and again when animation is switched back on
  // — that builds a fresh subtree, which has its own catching up to do. Any
  // other render must reuse the reading, or the sweep restarts mid-word.
  const startedAt = highlight?.startedAt;
  const elapsedMs = useMemo(
    () =>
      startedAt === undefined ? 0 : Math.max(performance.now() - startedAt, 0),
    [startedAt, shouldAnimate]
  );

  if (!shouldAnimate || !highlight) {
    return null;
  }

  const tokens = getReadingTokens(
    props.kana.ent,
    getAccentPos(props.kana.a),
    props.accentDisplay
  );
  const durations = computeMoraDurations(
    tokens,
    props.kana.ent,
    highlight.timing
  );
  if (!durations) {
    return null;
  }

  const layer = accentLayer(props.accentDisplay);

  return (
    <span
      aria-hidden
      class="tp:pointer-events-none tp:text-(--primary-highlight)"
      style={
        highlight.fading
          ? { animation: 'fade-out 400ms ease-in-out forwards' }
          : undefined
      }
      onAnimationEnd={(event) => {
        if (event.animationName === 'fade-out') {
          setHighlight(undefined);
        }
      }}
    >
      <span
        // A CSS animation's clock starts when its element is created, and a
        // replay recomputes the very delays it computed the first time — so
        // there is nothing to write, nothing retimes, and the finished spans
        // stay lit. Keying per clip builds elements that start their own clocks.
        key={highlight.startedAt}
        class={layer.classes}
        style={{ '--border-width': layer.borderWidth }}
      >
        {tokens.map((token, index) => {
          // A negative delay leaves an already-spoken mora at its filled end
          // state, which is how a popup that mounts mid-reading catches up.
          const { startMs, durationMs } = durations[index];
          const timing = `${Math.round(durationMs)}ms ease-in-out ${Math.round(
            startMs - elapsedMs
          )}ms`;

          return (
            <span
              key={index}
              class={solidAccentClasses(token.accent)}
              style={{ opacity: 0, animation: `fade-in ${timing} forwards` }}
            >
              <span
                class="tp:inline-block"
                style={{
                  transformOrigin: 'center bottom',
                  animation: `tts-mora-grow ${timing}`,
                }}
              >
                {token.text}
              </span>
              {token.downstep && 'ꜜ'}
            </span>
          );
        })}
      </span>
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
