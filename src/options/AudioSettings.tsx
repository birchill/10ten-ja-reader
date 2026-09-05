import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';

import { AudioSettingsForm } from './AudioSettingsForm';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function AudioSettings(props: Props) {
  const { t } = useLocale();
  const playReadings = useConfigValue(props.config, 'playReadings');

  const onChangePlayReadings = useCallback(
    (value: boolean) => {
      props.config.playReadings = value;
    },
    [props.config]
  );

  return (
    <>
      <SectionHeading>{t('options_audio_heading')}</SectionHeading>
      <div class="py-4">
        <AudioSettingsForm
          playReadings={playReadings}
          onChangePlayReadings={onChangePlayReadings}
        />
      </div>
    </>
  );
}
