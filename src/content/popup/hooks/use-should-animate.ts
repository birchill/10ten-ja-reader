import { useMediaQuery } from '../../../utils/use-media-query';

export function useShouldAnimate(): boolean {
  return !useMediaQuery('(prefers-reduced-motion: reduce)');
}
