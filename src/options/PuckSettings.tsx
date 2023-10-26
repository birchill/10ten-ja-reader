import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';

import { PuckSettingsForm, type ShowPuckSetting } from './PuckSettingsForm';
import { useConfigValue } from './use-config-value';

type Props = {
  config: Config;
};

export function PuckSettings(props: Props) {
  const showPuck = useConfigValue(props.config, 'showPuck');
  const onChangeShowPuck = useCallback(
    (value: ShowPuckSetting) => {
      props.config.showPuck = value;
    },
    [props.config]
  );

  return <PuckSettingsForm showPuck={showPuck} onChange={onChangeShowPuck} />;
}
