export function getFrameByProperties({
  frames: srcFrames,
  src,
  width,
  height,
}: {
  // This is assumed to be in the same format as the frames stored by the
  // various tab managers, i.e. a sparse array indexed by frameID
  frames: Array<{
    initialSrc: string;
    currentSrc?: string;
    dimensions?: {
      width: number;
      height: number;
    };
  }>;
  src: string;
  width: number;
  height: number;
}): number | undefined {
  const frames = Object.keys(srcFrames)
    .map(Number)
    .map((frameId) => ({ frameId, ...srcFrames[frameId] }));
  if (!frames.length) {
    return undefined;
  }

  // Try to narrow by src
  let candidates = frames.filter(
    (frame) => frame.currentSrc === src || frame.initialSrc === src
  );
  if (!candidates.length) {
    candidates = frames;
  }
  if (candidates.length === 1) {
    return candidates[0].frameId;
  }

  // Narrow by dimensions
  candidates.sort((a, b) => {
    if (
      typeof a.dimensions === 'undefined' &&
      typeof b.dimensions === 'undefined'
    ) {
      return 0;
    }
    if (typeof a.dimensions === 'undefined') {
      return 1;
    }
    if (typeof b.dimensions === 'undefined') {
      return -1;
    }
    const aDiff =
      Math.abs(width - a.dimensions.width) +
      Math.abs(height - a.dimensions.height);
    const bDiff =
      Math.abs(width - b.dimensions.width) +
      Math.abs(height - b.dimensions.height);

    return aDiff - bDiff;
  });

  return candidates[0].frameId;
}
