import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { TabDisplay } from '../common/content-config-params';
import { useLocale } from '../common/i18n';

import { TabDisplayRadio } from './TabDisplayRadio';
import { useConfigValue } from './use-config-value';

type Props = {
  config: Config;
};

export function PopupInteractivitySettings(props: Props) {
  const { t } = useLocale();
  const tabDisplay = useConfigValue(props.config, 'tabDisplay');
  const theme = useConfigValue(props.config, 'popupStyle');

  const onChangeTabDisplay = useCallback(
    (value: TabDisplay) => {
      props.config.tabDisplay = value;
    },
    [props.config]
  );

  return (
    <>
      <p>{t('options_tab_position_label')}</p>
      <TabDisplayRadio
        onChange={onChangeTabDisplay}
        theme={theme}
        value={tabDisplay}
      />
      {/* TODO: This should go _before_ the options_tab_position_label paragraph
          once we migrate the other content into this component. */}
      <div class="h-4" />
    </>
  );
}
