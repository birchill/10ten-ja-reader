import { useEffect, useMemo, useState } from 'preact/hooks';

import { isTouchDevice } from './device';

export function useHasTouch(): boolean {
  const mql = useMemo(() => window.matchMedia('(any-pointer:coarse)'), []);
  const [hasCoarsePointer, setHasCoarsePointer] = useState(mql.matches);

  useEffect(() => {
    const onMqlChange = (evt: MediaQueryListEvent) => {
      setHasCoarsePointer(evt.matches);
    };

    mql.addEventListener('change', onMqlChange);
    return () => {
      mql.removeEventListener('change', onMqlChange);
    };
  }, []);

  return useMemo(() => isTouchDevice(), [hasCoarsePointer]);
}
