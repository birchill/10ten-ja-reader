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
  const showPriority = useConfigValue(props.config, 'showPriority');
  const onChangeShowPriority = useCallback(
    (value: boolean) => {
      props.config.showPriority = value;
    },
    [props.config]
  );

  const waniKaniVocabDisplay = useConfigValue(
    props.config,
    'waniKaniVocabDisplay'
  );
  const onChangeShowWaniKaniLevel = useCallback(
    (value: boolean) => {
      props.config.waniKaniVocabDisplay = value ? 'show-matches' : 'hide';
    },
    [props.config]
  );

  const showRomaji = useConfigValue(props.config, 'showRomaji');
  const onChangeShowRomaji = useCallback(
    (value: boolean) => {
      props.config.showRomaji = value;
    },
    [props.config]
  );

  const showDefinitions = !useConfigValue(props.config, 'readingOnly');
  const onChangeShowDefinitions = useCallback(
    (value: boolean) => {
      props.config.readingOnly = !value;
    },
    [props.config]
  );

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
        onChangeShowDefinitions={onChangeShowDefinitions}
        onChangeShowPriority={onChangeShowPriority}
        onChangeShowRomaji={onChangeShowRomaji}
        onChangeShowWaniKaniLevel={onChangeShowWaniKaniLevel}
        posDisplay={posDisplay}
        showDefinitions={showDefinitions}
        showPriority={showPriority}
        showRomaji={showRomaji}
        showWaniKaniLevel={waniKaniVocabDisplay === 'show-matches'}
      />
    </div>
  );
}
