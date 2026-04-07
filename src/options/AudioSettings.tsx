import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';

import { CheckboxRow } from './CheckboxRow';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function AudioSettings(props: Props) {
  const { t } = useLocale();

  const autoSpeak = useConfigValue(props.config, 'autoSpeak');
  const onChangeAutoSpeak = useCallback(
    (value: boolean) => {
      props.config.autoSpeak = value;
    },
    [props.config]
  );

  return (
    <>
      <SectionHeading>{t('options_audio_heading')}</SectionHeading>
      <div class="py-4">
        <CheckboxRow>
          <input
            id="autoSpeak"
            name="autoSpeak"
            type="checkbox"
            checked={autoSpeak}
            onChange={(e) => onChangeAutoSpeak(e.currentTarget.checked)}
          />
          <label for="autoSpeak">{t('options_auto_speak')}</label>
        </CheckboxRow>
      </div>
    </>
  );
}
