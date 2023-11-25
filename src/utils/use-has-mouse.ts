import { useEffect, useMemo, useState } from 'preact/hooks';

export function useHasMouse(): boolean {
  const mql = useMemo(
    () => window.matchMedia('(any-hover:hover), (any-pointer:fine)'),
    []
  );
  const [hasMouse, setHasMouse] = useState(mql.matches);

  useEffect(() => {
    const onMqlChange = (evt: MediaQueryListEvent) => {
      setHasMouse(evt.matches);
    };

    mql.addEventListener('change', onMqlChange);
    return () => {
      mql.removeEventListener('change', onMqlChange);
    };
  }, []);

  return hasMouse;
}
