import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';

import { PuckSettingsForm, type ShowPuckSetting } from './PuckSettingsForm';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function PuckSettings(props: Props) {
  const { t } = useLocale();
  const showPuck = useConfigValue(props.config, 'showPuck');
  const onChangeShowPuck = useCallback(
    (value: ShowPuckSetting) => {
      props.config.showPuck = value;
    },
    [props.config]
  );

  return (
    <>
      <SectionHeading>{t('options_lookup_puck_heading')}</SectionHeading>
      <div class="py-4">
        <PuckSettingsForm showPuck={showPuck} onChange={onChangeShowPuck} />
      </div>
    </>
  );
}
