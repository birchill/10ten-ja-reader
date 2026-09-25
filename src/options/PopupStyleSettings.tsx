import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import type {
  AccentDisplay,
  AutoExpandableEntry,
  FontFace,
  FontSize,
  PartOfSpeechDisplay,
} from '../common/content-config-params';
import { useLocale } from '../common/i18n';

import { PopupStyleForm } from './PopupStyleForm';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function PopupStyleSettings(props: Props) {
  const { t } = useLocale();

  const theme = useConfigValue(props.config, 'popupStyle');
  const onChangeTheme = useCallback(
    (value: string) => {
      props.config.popupStyle = value;
    },
    [props.config]
  );

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

  const showBunproDecks = useConfigValue(props.config, 'bunproDisplay');
  const onChangeShowBunproDecks = useCallback(
    (value: boolean) => {
      props.config.bunproDisplay = value;
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

  const fontFace = useConfigValue(props.config, 'fontFace');
  const onChangeFontFace = useCallback(
    (value: FontFace) => {
      props.config.fontFace = value;
    },
    [props.config]
  );

  return (
    <>
      <SectionHeading>{t('options_popup_style_heading')}</SectionHeading>
      <div class="py-4">
        <PopupStyleForm
          accentDisplay={accentDisplay}
          autoExpand={autoExpand}
          fontFace={fontFace}
          fontSize={fontSize}
          onChangeAccentDisplay={onChangeAccentDisplay}
          onChangeAutoExpand={onChangeAutoExpand}
          onChangeFontFace={onChangeFontFace}
          onChangeFontSize={onChangeFontSize}
          onChangePosDisplay={onChangePosDisplay}
          onChangeShowBunproDecks={onChangeShowBunproDecks}
          onChangeShowDefinitions={onChangeShowDefinitions}
          onChangeShowPriority={onChangeShowPriority}
          onChangeShowRomaji={onChangeShowRomaji}
          onChangeShowWaniKaniLevel={onChangeShowWaniKaniLevel}
          onChangeTheme={onChangeTheme}
          posDisplay={posDisplay}
          showBunproDecks={showBunproDecks}
          showDefinitions={showDefinitions}
          showPriority={showPriority}
          showRomaji={showRomaji}
          showWaniKaniLevel={waniKaniVocabDisplay === 'show-matches'}
          theme={theme}
        />
      </div>
    </>
  );
}
