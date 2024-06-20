import { useLocale } from '../common/i18n';

type Props = {
  currencies: Array<string>;
  selectedCurrency: string;
  onChange: (currency: string) => void;
};

export function CurrencySettingsForm(props: Props) {
  const { t } = useLocale();

  const currencyNames = Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'currency' })
    : undefined;

  const options = [
    ['none', t('options_currency_none_label')],
    ...props.currencies.map((c) => {
      const label = currencyNames ? `${c} - ${currencyNames.of(c)}` : c;
      return [c, label];
    }),
  ];

  return (
    <>
      <label for="fxCurrency">{t('options_currency_label')}</label>
      <select
        id="fxCurrency"
        name="fxCurrency"
        onInput={(event) => {
          props.onChange(event.currentTarget.value);
        }}
      >
        {options.map(([value, label]) => (
          <option
            key={value}
            value={value}
            selected={value === props.selectedCurrency}
          >
            {label}
          </option>
        ))}
      </select>
    </>
  );
}
