import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { TabDisplay } from '../common/content-config-params';
import { useHasTouch } from '../utils/use-has-touch';

import { useConfigValue } from './use-config-value';
import { PopupInteractivitySettingsForm } from './PopupInteractivitySettingsForm';

type Props = {
  config: Config;
};

export function PopupInteractivitySettings(props: Props) {
  const hasTouch = useHasTouch();
  const theme = useConfigValue(props.config, 'popupStyle');

  const enableTapLookup = useConfigValue(props.config, 'enableTapLookup');
  const onChangeEnableTapLookup = useCallback(
    (value: boolean) => {
      props.config.enableTapLookup = value;
    },
    [props.config]
  );

  const tabDisplay = useConfigValue(props.config, 'tabDisplay');
  const onChangeTabDisplay = useCallback(
    (value: TabDisplay) => {
      props.config.tabDisplay = value;
    },
    [props.config]
  );

  return (
    <PopupInteractivitySettingsForm
      enableTapLookup={enableTapLookup}
      hasTouch={hasTouch}
      onChangeEnableTapLookup={onChangeEnableTapLookup}
      onChangeTabDisplay={onChangeTabDisplay}
      tabDisplay={tabDisplay}
      theme={theme}
    />
  );
}
