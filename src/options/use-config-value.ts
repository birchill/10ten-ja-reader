import { useSyncExternalStore } from 'preact/compat';
import { useCallback, useRef } from 'preact/hooks';

import { type ChangeCallback, Config } from '../common/config';

export function useConfigValue<K extends keyof Config>(
  config: Config,
  key: K
): Config[K] {
  const snapshot = useRef(config[key]);

  const subscribe = useCallback(
    (callback: () => void) => {
      const changeCallback: ChangeCallback = (changes) => {
        if (Object.keys(changes).includes(key)) {
          snapshot.current = config[key];
          callback();
        }
      };

      config.addChangeListener(changeCallback);
      return () => config.removeChangeListener(changeCallback);
    },
    [config, key]
  );

  const getSnapshot = () => snapshot.current;

  return useSyncExternalStore(subscribe, getSnapshot);
}
