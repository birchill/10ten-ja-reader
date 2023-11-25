import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { TabDisplay } from '../common/content-config-params';
import { useHasMouse } from '../utils/use-has-mouse';
import { useHasTouch } from '../utils/use-has-touch';

import { useConfigValue } from './use-config-value';
import { PopupInteractivitySettingsForm } from './PopupInteractivitySettingsForm';

type Props = {
  config: Config;
};

export function PopupInteractivitySettings(props: Props) {
  const hasMouse = useHasMouse();
  const hasTouch = useHasTouch();
  const theme = useConfigValue(props.config, 'popupStyle');

  const mouseInteractivity = useConfigValue(props.config, 'popupInteractive');
  const onChangeMouseInteractivity = useCallback(
    (value: boolean) => {
      props.config.popupInteractive = value;
    },
    [props.config]
  );

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
      hasMouse={hasMouse}
      hasTouch={hasTouch}
      mouseInteractivity={mouseInteractivity}
      onChangeEnableTapLookup={onChangeEnableTapLookup}
      onChangeMouseInteractivity={onChangeMouseInteractivity}
      onChangeTabDisplay={onChangeTabDisplay}
      tabDisplay={tabDisplay}
      theme={theme}
    />
  );
}
