import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';

import { PopupStyleForm } from './PopupStyleForm';
import { useConfigValue } from './use-config-value';
import {
  AccentDisplay,
  AutoExpandableEntry,
  FontSize,
  PartOfSpeechDisplay,
} from '../common/content-config-params';

type Props = {
  config: Config;
};

export function PopupStyleSettings(props: Props) {
  const accentDisplay = useConfigValue(props.config, 'accentDisplay');
  const onChangeAccentDisplay = useCallback(
    (value: AccentDisplay) => {
      props.config.accentDisplay = value;
    },
    [props.config]
  );

  const autoExpand = useConfigValue(props.config, 'autoExpand');
  const onChangeAutoExpand = useCallback(
    (type: AutoExpandableEntry, value: boolean) => {
      props.config.toggleAutoExpand(type, value);
    },
    [props.config]
  );

  const posDisplay = useConfigValue(props.config, 'posDisplay');
  const onChangePosDisplay = useCallback(
    (value: PartOfSpeechDisplay) => {
      props.config.posDisplay = value;
    },
    [props.config]
  );

  const fontSize = useConfigValue(props.config, 'fontSize');
  const onChangeFontSize = useCallback(
    (value: FontSize) => {
      props.config.fontSize = value;
    },
    [props.config]
  );

  return (
    <div class="pb-4">
      <PopupStyleForm
        accentDisplay={accentDisplay}
        autoExpand={autoExpand}
        fontSize={fontSize}
        onChangeAccentDisplay={onChangeAccentDisplay}
        onChangeAutoExpand={onChangeAutoExpand}
        onChangeFontSize={onChangeFontSize}
        onChangePosDisplay={onChangePosDisplay}
        posDisplay={posDisplay}
      />
    </div>
  );
}
