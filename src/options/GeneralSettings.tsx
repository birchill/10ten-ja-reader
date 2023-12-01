import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';

import { GeneralSettingsForm } from './GeneralSettingsForm';
import { useConfigValue } from './use-config-value';

type Props = {
  config: Config;
};

export function GeneralSettings(props: Props) {
  const highlightText = !useConfigValue(props.config, 'noTextHighlight');
  const onChangeHighlightText = useCallback(
    (value: boolean) => {
      props.config.noTextHighlight = !value;
    },
    [props.config]
  );

  const contextMenuEnable = useConfigValue(props.config, 'contextMenuEnable');
  const onChangeContextMenuEnable = useCallback(
    (value: boolean) => {
      props.config.contextMenuEnable = value;
    },
    [props.config]
  );

  return (
    <div class="pb-4">
      <GeneralSettingsForm
        contextMenuEnable={contextMenuEnable}
        highlightText={highlightText}
        onChangeContextMenuEnable={onChangeContextMenuEnable}
        onChangeHighlightText={onChangeHighlightText}
      />
    </div>
  );
}
