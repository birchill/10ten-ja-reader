import { useMediaQuery } from './use-media-query';

export function useHasMouse(): boolean {
  return useMediaQuery('(any-hover:hover), (any-pointer:fine)');
}
