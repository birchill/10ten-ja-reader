import { useLayoutEffect, useMemo, useRef } from 'preact/hooks';

export type Props = { st: string };

const STROKE_SPEED = 150; // User units / second
const STROKE_GAP = 250; // ms
const FREEZE_LENGTH = 1000; // ms

export function KanjiStrokeAnimation(props: Props) {
  const animatedStrokeContainer = useRef<SVGGElement>(null);
  const subpaths = useMemo(() => props.st.split(/(?=[Mm][0-9])/), [props.st]);

  const currentAnimations = useRef<Array<Animation>>([]);

  // XXX Pause control
  // XXX Timeline with little icons

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
      cumulativeDuration += duration + STROKE_GAP;
    }

    currentAnimations.current = animations;

    return () => {
      currentAnimations.current.forEach((animation) => animation.cancel());
      currentAnimations.current = [];
    };
  }, [subpaths]);

  return (
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
  );
}
