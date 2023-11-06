import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';

import { CurrencySettingsForm } from './CurrencySettingsForm';
import { useConfigValue } from './use-config-value';
import { SectionHeading } from './SectionHeading';
import { useLocale } from '../common/i18n';

type Props = {
  config: Config;
};

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
      <CurrencySettingsForm
        currencies={fxCurrencies}
        selectedCurrency={fxCurrency}
        onChange={onChangeCurrency}
      />
    </>
  );
}
