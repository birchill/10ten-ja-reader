import { useEffect, useMemo, useState } from 'preact/hooks';

export function useMediaQuery(query: string): boolean {
  const mql = useMemo(() => window.matchMedia(query), [query]);
  const [matches, setMatches] = useState(mql.matches);

  useEffect(() => {
    setMatches(mql.matches);

    const onMqlChange = (evt: MediaQueryListEvent) => {
      setMatches(evt.matches);
    };

    mql.addEventListener('change', onMqlChange);
    return () => {
      mql.removeEventListener('change', onMqlChange);
    };
  }, [mql]);

  return matches;
}
