import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';

import { CurrencySettingsForm } from './CurrencySettingsForm';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function CurrencySettings(props: Props) {
  const { t } = useLocale();
  const fxCurrency = useConfigValue(props.config, 'fxCurrency');
  const fxCurrencies = useConfigValue(props.config, 'fxCurrencies');

  const onChangeCurrency = useCallback(
    (value: string) => {
      props.config.fxCurrency = value;
    },
    [props.config]
  );

  if (!fxCurrencies) {
    return null;
  }

  return (
    <>
      <SectionHeading>
        {t('options_currency_conversion_heading')}
      </SectionHeading>
      <div class="py-4">
        <CurrencySettingsForm
          currencies={fxCurrencies}
          selectedCurrency={fxCurrency}
          onChange={onChangeCurrency}
        />
      </div>
    </>
  );
}
