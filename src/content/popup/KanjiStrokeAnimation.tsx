import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';

export type Props = { st: string };

const STROKE_SPEED = 150; // User units / second
const STROKE_GAP = 250; // ms
const FREEZE_LENGTH = 1000; // ms

export function KanjiStrokeAnimation(props: Props) {
  const animatedStrokeContainer = useRef<SVGGElement>(null);
  const subpaths = useMemo(() => props.st.split(/(?=[Mm][0-9])/), [props.st]);

  const currentAnimations = useRef<Array<Animation>>([]);

  const [paused, setPaused] = useState<boolean>(false);
  const onTogglePause = () => {
    setPaused((paused) => {
      if (paused) {
        currentAnimations.current.forEach((animation) => animation.play());
      } else {
        currentAnimations.current.forEach((animation) => animation.pause());
      }
      return !paused;
    });
  };

  // XXX Scrubber

  // Calculate the animation parameters for each stroke
  useLayoutEffect(() => {
    if (!animatedStrokeContainer.current) {
      currentAnimations.current = [];
      return;
    }

    const animations: Array<Animation> = [];
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
          {
            duration: totalDuration,
            iterations: Infinity,
          }
        )
      );
      if (paused) {
        animations.at(-1)!.pause();
      }
      cumulativeDuration += duration + STROKE_GAP;
    }

    currentAnimations.current = animations;

    return () => {
      currentAnimations.current.forEach((animation) => animation.cancel());
      currentAnimations.current = [];
    };
  }, [subpaths]);

  return (
    <div class="tp-flex tp-flex-col tp-items-center tp-gap-3">
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
      <button
        class="tp-inline-flex tp-opacity-50 hover:tp-opacity-100 tp-items-center tp-justify-center tp-border-none tp-bg-white/20 tp-rounded-full tp-p-2 tp-appearance-none tp-cursor-pointer tp-select-none focus:tp-outline-none"
        onClick={onTogglePause}
        type="button"
      >
        <svg class="tp-h-4 tp-w-4 tp-fill-[--text-color]" viewBox="0 0 24 24">
          {paused ? (
            <path d="M24 12c0 .4-.1.8-.32 1.15-.21.35-.51.64-.88.84L3.52 23.74c-.34.17-.73.26-1.12.26-.43 0-.86-.12-1.23-.34a2.3 2.3 0 01-.86-.83C.1 22.5 0 22.1 0 21.7V2.3c0-.4.11-.79.32-1.13A2.43 2.43 0 012.33 0c.42-.01.83.08 1.2.26l19.24 9.73c.01 0 .01.02.03.02.37.2.67.49.88.84.21.35.32.74.32 1.15z" />
          ) : (
            <>
              <rect width={8} height={24} rx={4} />
              <rect x={16} width={8} height={24} rx={4} />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
