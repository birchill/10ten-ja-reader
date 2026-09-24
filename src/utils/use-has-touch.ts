import { useMemo } from 'preact/hooks';

import { isTouchDevice } from './device';
import { useMediaQuery } from './use-media-query';

export function useHasTouch(): boolean {
  const hasCoarsePointer = useMediaQuery('(any-pointer:coarse)');

  return useMemo(() => isTouchDevice(), [hasCoarsePointer]);
}
