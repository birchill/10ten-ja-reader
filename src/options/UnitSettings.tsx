import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';

import { SectionHeading } from './SectionHeading';
import { UnitSettingsForm } from './UnitSettingsForm';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function UnitSettings(props: Props) {
  const { t } = useLocale();
  const preferredUnits = useConfigValue(props.config, 'preferredUnits');

  const onChangeUnits = useCallback(
    (value: 'metric' | 'imperial') => {
      props.config.preferredUnits = value;
    },
    [props.config]
  );

  if (!preferredUnits) {
    return null;
  }

  return (
    <>
      <SectionHeading>{t('options_unit_conversion_heading')}</SectionHeading>
      <div class="py-4">
        <UnitSettingsForm
          selectedUnits={preferredUnits}
          onChange={onChangeUnits}
        />
      </div>
    </>
  );
}
