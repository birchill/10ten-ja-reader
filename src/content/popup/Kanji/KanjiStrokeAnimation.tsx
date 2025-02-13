import type { RefObject } from 'preact';
import {
  type MutableRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

import { useLocale } from '../../../common/i18n';
import { classes } from '../../../utils/classes';

export type Props = {
  onClick?: (trigger: 'touch' | 'mouse') => void;
  selectState: 'unselected' | 'selected' | 'flash';
  st: string;
};

const STROKE_SPEED = 150; // User units / second
const STROKE_GAP = 250; // ms
const FREEZE_LENGTH = 1000; // ms

const TIMELINE_RANGE = 50; // px in SVG user unit space

// This is a bit larger than the actual range the scrubber moves
// so that you have a bit more control over seeking.
const SCRUBBER_DRAG_RANGE = TIMELINE_RANGE + 10; // px in SVG user unit space

// How far the timeline is from the left edge of the SVG
const TIMELINE_OFFSET = 35; // px in SVG user unit space

export function KanjiStrokeAnimation(props: Props) {
  const { t } = useLocale();

  // References
  const animatedStrokeContainer = useRef<SVGGElement>(null);
  const timelineSvg = useRef<SVGSVGElement>(null);
  const scrubberContainer = useRef<SVGGElement>(null);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const currentAnimations = useRef<Array<Animation>>([]);

  // Scrubber handling
  const { applySeek, onScrubberPointerDown, onTimelineClick } = useScrubber(
    timelineSvg,
    currentAnimations
  );

  // Update the animation parameters
  const subpaths = useMemo(() => props.st.split(/(?=M[0-9])/), [props.st]);
  useLayoutEffect(() => {
    if (!animatedStrokeContainer.current || !isPlaying) {
      currentAnimations.current = [];
      return;
    }

    const animations: Array<Animation> = [];

    // Stroke animations
    const paths = Array.from(
      animatedStrokeContainer.current.querySelectorAll('path')
    );
    const strokeDurations = paths.map(
      (stroke) => stroke.getTotalLength() * (1000 / STROKE_SPEED)
    );
    const totalDuration =
      strokeDurations.reduce((acc, length) => acc + length, 0) +
      STROKE_GAP * (paths.length - 1) +
      FREEZE_LENGTH;

    let cumulativeDuration = 0;
    for (const [i, stroke] of paths.entries()) {
      const duration = strokeDurations[i];
      const startOffset = cumulativeDuration / totalDuration;
      const endOffset = Math.min(
        (cumulativeDuration + duration) / totalDuration,
        1
      );
      animations.push(
        stroke.animate(
          {
            strokeDashoffset: [100, 100, 0, 0],
            offset: [0, startOffset, endOffset, 1],
            easing: 'cubic-bezier(.28,.08,.79,.6)',
          },
          { duration: totalDuration, iterations: Infinity }
        )
      );
      cumulativeDuration += duration + STROKE_GAP;
    }

    // Scrubber animation
    if (scrubberContainer.current) {
      animations.push(
        scrubberContainer.current.animate(
          {
            transform: [
              'translate(0)',
              `translate(${TIMELINE_RANGE}px)`,
              `translate(${TIMELINE_RANGE}px)`,
            ],
            offset: [0, (totalDuration - FREEZE_LENGTH) / totalDuration],
          },
          { duration: totalDuration, iterations: Infinity }
        )
      );
    }

    // If we are currently seeking, fast-forward to the appropriate point
    applySeek(animations);

    currentAnimations.current = animations;

    return () => {
      currentAnimations.current.forEach((animation) => animation.cancel());
      currentAnimations.current = [];
    };
  }, [subpaths, isPlaying]);

  // Rendering parameters
  const strokeWidth = subpaths.length > 16 ? 4 : 5;

  // Copy state
  const lastPointerType = useRef<string>('touch');

  return (
    <div class="tp-flex tp-flex-col tp-items-center tp-gap-3">
      <svg
        class={classes(
          'tp-group',
          'tp-h-big-kanji tp-w-big-kanji tp-rounded-md',
          'hh:hover:tp-bg-[--hover-bg]',
          'hh:hover:tp-cursor-pointer',
          // Fade _out_ the color change
          'hh:tp-transition-colors hh:interactive:tp-duration-100',
          'hh:tp-ease-out',
          'hh:hover:tp-transition-none',
          // Ensure any selection colors are applied before fading in the
          // overlay
          props.selectState === 'selected' &&
            'no-overlay:tp-text-[--selected-highlight] no-overlay:tp-bg-[--selected-bg]',
          // Run the flash animation, but not until the overlay has
          // disappeared.
          props.selectState === 'flash' && 'no-overlay:tp-animate-flash'
        )}
        viewBox="0 0 109 109"
        onPointerUp={(evt) => {
          lastPointerType.current = evt.pointerType;
        }}
        onClick={() => {
          const trigger =
            lastPointerType.current === 'mouse' ? 'mouse' : 'touch';
          props.onClick?.(trigger);
        }}
      >
        <g
          stroke-width={strokeWidth}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke="var(--text-color)"
          opacity="0.3"
          fill="none"
        >
          {subpaths.map((path, index) => (
            <path key={index} d={path} fill="none" />
          ))}
        </g>
        <g
          class={classes(
            'tp-stroke-[--primary-highlight] hh:group-hover:tp-stroke-[--selected-highlight]',
            'hh:tp-transition-colors hh:interactive:tp-duration-100',
            'hh:tp-ease-out',
            'hh:hover:tp-transition-none',
            props.selectState === 'selected' &&
              'no-overlay:tp-stroke-[--selected-highlight]'
          )}
          stroke-width={strokeWidth}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke="var(--primary-highlight)"
          stroke-dasharray="100 100"
          stroke-dashoffset={isPlaying ? 100 : 0}
          fill="none"
          ref={animatedStrokeContainer}
        >
          {subpaths.map((path, index) => (
            <path
              key={index}
              d={path}
              fill="none"
              // We use 99.5 instead of 100 to work around path length
              // inaccuracies in Chrome. Without this you'd occasionally see a
              // dot at the end of a stroke that should be invisible.
              pathLength={99.5}
            />
          ))}
        </g>
      </svg>
      <div>
        {/* The content is only 25 user units high but we make it 50 so that we
         * can expand the hit regions vertically since iOS Safari doesn't do
         * very good hit detection of small targets. */}
        <svg
          class="tp-w-big-kanji"
          ref={timelineSvg}
          viewBox="0 0 100 50"
          style={{ webkitTapHighlightColor: 'transparent' }}
        >
          {/* Play/stop button */}
          <g
            onClick={() => setIsPlaying((prev) => !prev)}
            pointer-events="all"
            class="tp-cursor-pointer tp-opacity-30 hh:hover:tp-opacity-100 tp-fill-[--text-color] hh:hover:tp-fill-[--primary-highlight] tp-transition-transform tp-duration-500"
            style={{ transform: isPlaying ? 'none' : 'translate(40px)' }}
          >
            <title>
              {t(
                isPlaying
                  ? 'content_stroke_animation_stop'
                  : 'content_stroke_animation_play'
              )}
            </title>
            {/* Play/stop button hit region */}
            <rect
              x={isPlaying ? 0 : -40}
              width={isPlaying ? 25 : 100}
              height={50}
              fill="none"
            />
            <path
              d={
                isPlaying
                  ? 'M20 12.5v6a4 4 0 01-4 4l-12 0c0 0 0 0 0 0a4 4 90 01-4-4v-12a4 4 90 014-4c0 0 0 0 0 0l12 0a4 4 0 014 4z'
                  : 'M20 12.5v0a2 2 0 01-1 1.7l-16.1 8.1c-.3.1-.6.2-.9.2a2 2 90 01-2-2v-16a2 2 90 012-2c.3 0 .7.1 1 .2l16 8.1a2 2 0 011 1.7z'
              }
              class="tp-transition-[d] tp-duration-500"
              transform="scale(0.9)"
              transform-origin="10px 12.5px"
            />
          </g>
          {/* Timeline and scrubber */}
          <g
            style={{
              transform: isPlaying ? 'translate(25px)' : 'translate(65px)',
            }}
            class={classes(
              'tp-transition-transform tp-duration-500',
              isPlaying ? 'tp-delay-100' : 'tp-pointer-events-none'
            )}
          >
            {/* Timeline */}
            <g
              fill="var(--primary-highlight)"
              opacity="0.1"
              style={{
                transform: isPlaying ? 'scale(1)' : 'scale(0)',
                transformOrigin: '12.5px 12.5px',
              }}
              class={classes(
                'tp-transition-transform',
                !isPlaying && 'tp-delay-[450ms]'
              )}
              onClick={onTimelineClick}
            >
              {/* Timeline middle rectangle */}
              <rect
                x={12.5}
                // Add an extra pixel to the width to avoid a gap between the
                // scrubber and the right end of the timeline.
                width={TIMELINE_RANGE + 1}
                height={25}
                style={{
                  transform: isPlaying ? 'scale(1)' : 'scale(0, 1)',
                  transformOrigin: '12.5px 12.5px',
                }}
                class={classes(
                  'tp-transition-transform tp-duration-500',
                  isPlaying && 'tp-delay-100'
                )}
              />
              {/* Timeline rounded left end */}
              <path d="M12.5 0a12.5 12.5 0 0 0 0 25z" />
              {/* Timeline rounded right end */}
              <path
                d={`M${TIMELINE_RANGE + 12.5} 0a12.5 12.5 0 0 1 0 25z`}
                style={{
                  transform: isPlaying
                    ? 'translate(0)'
                    : `translate(-${TIMELINE_RANGE}px)`,
                }}
                class={classes(
                  'tp-transition-transform tp-duration-500',
                  isPlaying && 'tp-delay-100'
                )}
              />
            </g>
            {/* Scrubber group -- translation animation is applied here */}
            <g ref={scrubberContainer}>
              {/* Scrubber scale group */}
              <g
                style={{
                  transform: isPlaying ? 'scale(1)' : 'scale(0)',
                  transformOrigin: '12.5px 12.5px',
                }}
                class={classes(
                  'tp-transition-transform',
                  !isPlaying ? 'tp-delay-[400ms]' : 'tp-delay-50'
                )}
              >
                {/* Hit region for scrubber */}
                <rect
                  x={-10}
                  width={40}
                  height={50}
                  fill="none"
                  class="tp-cursor-pointer tp-peer"
                  pointer-events="all"
                  onPointerDown={onScrubberPointerDown}
                  // This is needed to prevent the container from scrolling
                  onTouchStart={(evt) => evt.preventDefault()}
                />
                <circle
                  cx={12.5}
                  cy={12.5}
                  r={8}
                  class="tp-fill-[--primary-highlight] tp-opacity-50 peer-hover:tp-opacity-100"
                  pointer-events="none"
                />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

function useScrubber(
  timelineSvg: RefObject<SVGSVGElement>,
  currentAnimations: MutableRef<Array<Animation>>
): {
  applySeek: (animations: Array<Animation>) => void;
  onScrubberPointerDown: (event: PointerEvent) => void;
  onTimelineClick: (event: MouseEvent) => void;
} {
  const seekState = useRef<{ scrubberStart: number; offset: number } | null>(
    null
  );

  // The following callback needs to be stable so that the caller doesn't need
  // to mark it as a dependency in their effects.

  const applySeek = useCallback((animations: Array<Animation>) => {
    if (!seekState.current) {
      return;
    }

    for (const animation of animations) {
      if (animation.playState !== 'paused') {
        animation.pause();
      }
      const timing = animation.effect!.getComputedTiming();
      animation.currentTime =
        seekState.current.offset *
        ((timing.duration as number) - FREEZE_LENGTH);
    }
  }, []);

  // The following callbacks need to be stable so we can unregister them from
  // the window when dragging stops or the component unmounts.

  const onWindowPointerMove = useCallback((event: PointerEvent) => {
    if (!seekState.current || !timelineSvg.current) {
      return;
    }

    // Calculate the offset of the scrubber
    const [svgX] = toSvgCoords(timelineSvg.current, event.clientX, 0);
    const offset = Math.min(
      Math.max(
        (svgX - seekState.current.scrubberStart) / SCRUBBER_DRAG_RANGE,
        0
      ),
      1
    );
    seekState.current.offset = offset;

    // Seek each of the animations to the equivalent point
    applySeek(currentAnimations.current);
  }, []);

  const onWindowPointerUpOrCancel = useCallback(() => {
    if (!seekState.current) {
      return;
    }

    currentAnimations.current.forEach((animation) => animation.play());
    seekState.current = null;

    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUpOrCancel);
    window.removeEventListener('pointercancel', onWindowPointerUpOrCancel);
  }, []);

  useEffect(() => {
    return () => {
      if (seekState.current) {
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUpOrCancel);
        window.removeEventListener('pointercancel', onWindowPointerUpOrCancel);
      }
    };
  }, []);

  const onScrubberPointerDown = (event: PointerEvent) => {
    if (seekState.current || !timelineSvg.current) {
      return;
    }

    // Work out how far we are into the animation
    if (currentAnimations.current.length === 0) {
      return;
    }
    const animationTiming =
      currentAnimations.current[0].effect!.getComputedTiming();
    const iterationProgress = animationTiming.progress as number;
    const iterationDuration = animationTiming.duration as number;
    const strokeAnimationProgress = Math.min(
      iterationProgress *
        (iterationDuration / (iterationDuration - FREEZE_LENGTH)),
      1
    );

    // Based on that, work out where the scrubber should start
    const [svgX] = toSvgCoords(timelineSvg.current, event.clientX, 0);
    const scrubberStart = svgX - strokeAnimationProgress * SCRUBBER_DRAG_RANGE;
    seekState.current = { scrubberStart, offset: strokeAnimationProgress };

    // Pause the animations
    currentAnimations.current.forEach((animation) => animation.pause());

    // Register the move/up/cancel events
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUpOrCancel);
    window.addEventListener('pointercancel', onWindowPointerUpOrCancel);
  };

  const onTimelineClick = useCallback((event: MouseEvent) => {
    if (seekState.current || !timelineSvg.current) {
      return;
    }

    const [svgX] = toSvgCoords(timelineSvg.current, event.clientX, 0);
    const offset = Math.min(
      Math.max((svgX - TIMELINE_OFFSET) / TIMELINE_RANGE, 0),
      1
    );

    // Seek the animations to that point
    for (const animation of currentAnimations.current) {
      const timing = animation.effect!.getComputedTiming();
      animation.currentTime =
        offset * ((timing.duration as number) - FREEZE_LENGTH);
    }
  }, []);

  return { onScrubberPointerDown, onTimelineClick, applySeek };
}

function toSvgCoords(
  svg: SVGSVGElement,
  x: number,
  y: number
): [number, number] {
  const ctm = svg.getScreenCTM()!;
  const point = svg.createSVGPoint();
  point.x = x;
  point.y = y;
  const transformed = point.matrixTransform(ctm.inverse());
  return [transformed.x, transformed.y];
}
