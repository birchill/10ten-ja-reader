import type { RefObject } from 'preact';
import {
  type MutableRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'preact/hooks';

export type Props = { st: string };

const STROKE_SPEED = 150; // User units / second
const STROKE_GAP = 250; // ms
const FREEZE_LENGTH = 1000; // ms

const SCRUBBER_RANGE = 80; // px in SVG user unit space
// This is deliberately larger than the actual range the scrubber moves
// so that you have a bit more control over seeking.
const SCRUBBER_DRAG_RANGE = 100; // px in SVG user unit space
const TIMELINE_PADDING = 10; // px in SVG user unit space

export function KanjiStrokeAnimation(props: Props) {
  const animatedStrokeContainer = useRef<SVGGElement>(null);
  const timelineSvg = useRef<SVGSVGElement>(null);
  const scrubberContainer = useRef<SVGGElement>(null);
  const subpaths = useMemo(() => props.st.split(/(?=M[0-9])/), [props.st]);

  const currentAnimations = useRef<Array<Animation>>([]);

  const { applySeek, onScrubberPointerDown, onTimelineClick } =
    useDraggableScrubber(timelineSvg, currentAnimations);

  // Update the animation parameters
  useLayoutEffect(() => {
    if (!animatedStrokeContainer.current) {
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
            transform: ['translate(0)', 'translate(80px)', 'translate(80px)'],
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
  }, [subpaths]);

  return (
    <div class="tp-flex tp-flex-col tp-items-center tp-gap-2">
      <svg
        class="tp-h-big-kanji tp-w-big-kanji"
        viewBox="0 0 109 109"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke-width="5"
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
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke="var(--primary-highlight)"
          stroke-dasharray="100 100"
          stroke-dashoffset="100"
          fill="none"
          ref={animatedStrokeContainer}
        >
          {subpaths.map((path, index) => (
            <path key={index} d={path} fill="none" pathLength={100} />
          ))}
        </g>
      </svg>
      <div>
        <svg
          class="tp-w-big-kanji"
          viewBox="0 0 100 20"
          ref={timelineSvg}
          onClick={onTimelineClick}
        >
          <rect
            width={100}
            height={20}
            rx={10}
            ry={10}
            fill="var(--primary-highlight)"
            fill-opacity="0.1"
          />
          <g ref={scrubberContainer}>
            {/* Hit region for scrubber */}
            <rect
              x={-5}
              width={30}
              height={20}
              fill="none"
              class="tp-cursor-pointer tp-peer"
              pointer-events="all"
              onPointerDown={onScrubberPointerDown}
            />
            <circle
              cx={TIMELINE_PADDING}
              cy={10}
              r={6}
              class="tp-fill-[--primary-highlight] tp-opacity-50 peer-hover:tp-opacity-100"
              pointer-events="none"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

function useDraggableScrubber(
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
      Math.max((svgX - TIMELINE_PADDING) / SCRUBBER_RANGE, 0),
      1
    );

    // Seek the animations to that point
    for (const animation of currentAnimations.current) {
      const timing = animation.effect!.getComputedTiming();
      animation.currentTime =
        offset * ((timing.duration as number) - FREEZE_LENGTH);
    }
  }, []);

  return {
    onScrubberPointerDown,
    onTimelineClick,
    applySeek,
  };
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
