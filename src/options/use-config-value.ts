import { useEffect, useState } from 'preact/hooks';

import { type ChangeCallback, Config } from '../common/config';

export function useConfigValue<K extends keyof Config>(
  config: Config,
  key: K
): Config[K] {
  const [value, setValue] = useState<Config[K]>(config[key]);

  useEffect(() => {
    const changeCallback: ChangeCallback = (changes) => {
      if (Object.keys(changes).includes(key)) {
        setValue(config[key]);
      }
    };

    config.addChangeListener(changeCallback);
    return () => config.removeChangeListener(changeCallback);
  }, [config, key]);

  return value;
}
