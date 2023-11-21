import { useEffect, useMemo, useState } from 'preact/hooks';

import { getThemeClass } from './themes';

export function useThemeClass(theme: string): string {
  const [darkMode, setDarkMode] = useState(false);

  // Only register for dark mode changes if the theme is the default one.
  useEffect(() => {
    if (theme !== 'default') {
      return;
    }

    const onMqlChange = (evt: MediaQueryListEvent) => {
      setDarkMode(evt.matches);
    };

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', onMqlChange);
    setDarkMode(mql.matches);

    return () => {
      mql.removeEventListener('change', onMqlChange);
    };
  }, [theme]);

  return useMemo(() => getThemeClass(theme), [darkMode, theme]);
}
