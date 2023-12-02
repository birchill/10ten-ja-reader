import { useCallback, useState } from 'preact/hooks';

import type { Config } from '../common/config';
import { HighlightStyle } from '../common/content-config-params';

import { GeneralSettingsForm } from './GeneralSettingsForm';
import { useConfigValue } from './use-config-value';

type Props = {
  config: Config;
};

export function GeneralSettings(props: Props) {
  const noTextHighlight = useConfigValue(props.config, 'noTextHighlight');
  const rawHighlightStyle = useConfigValue(props.config, 'highlightStyle');
  const highlightStyle = noTextHighlight ? 'none' : rawHighlightStyle;

  const onChangeHighlightStyle = useCallback(
    (value: HighlightStyle | 'none') => {
      if (value === 'none') {
        props.config.noTextHighlight = true;
      } else {
        props.config.highlightStyle = value;
        props.config.noTextHighlight = false;
      }
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

  const [supportsCssHighlight] = useState(
    CSS.supports('selector(::highlight(yer))')
  );

  return (
    <div class="pb-4">
      <GeneralSettingsForm
        contextMenuEnable={contextMenuEnable}
        highlightStyle={highlightStyle}
        onChangeContextMenuEnable={onChangeContextMenuEnable}
        onChangeHighlightStyle={onChangeHighlightStyle}
        supportsCssHighlight={supportsCssHighlight}
      />
    </div>
  );
}
