import { useLocale } from '../common/i18n';

import { NewBadge } from './NewBadge';

type Props = {
  selectedUnits: 'metric' | 'imperial';
  onChange: (currency: string) => void;
};

export function UnitSettingsForm(props: Props) {
  const { t } = useLocale();

  const options = [
    ['metric', t('options_units_metric_label')],
    ['imperial', t('options_units_imperial_label')],
  ];

  return (
    <>
      <label for="preferredUnits">{t('options_units_label')}</label>
      <NewBadge expiry={new Date('2024-09-30')} />
      <select
        id="preferredUnits"
        name="preferredUnits"
        onInput={(event) => {
          props.onChange(event.currentTarget.value);
        }}
      >
        {options.map(([value, label]) => (
          <option
            key={value}
            value={value}
            selected={value === props.selectedUnits}
          >
            {label}
          </option>
        ))}
      </select>
    </>
  );
}
