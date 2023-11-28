import type { JSX } from 'preact';
import { useCallback } from 'preact/hooks';

import { useLocale } from '../common/i18n';

export type ShowPuckSetting = 'auto' | 'show' | 'hide';

type Props = {
  showPuck: ShowPuckSetting;
  onChange: (value: ShowPuckSetting) => void;
};

const labelKeys: Record<ShowPuckSetting, string> = {
  auto: 'options_show_puck_option_auto',
  show: 'options_show_puck_option_show',
  hide: 'options_show_puck_option_hide',
};

export function PuckSettingsForm(props: Props) {
  const { t } = useLocale();

  const onChange = useCallback(
    (event: JSX.TargetedEvent<HTMLInputElement>) => {
      const setting = event.currentTarget.value as ShowPuckSetting;
      props.onChange(setting);
    },
    [props.onChange]
  );

  return (
    <>
      <p class="mt-0">{t('options_show_puck_label')}</p>
      {(['auto', 'show', 'hide'] as const).map((value) => (
        <>
          <input
            type="radio"
            name="showPuck"
            id={`showPuck-${value}`}
            value={value}
            onChange={onChange}
            checked={props.showPuck === value}
          />
          <label class="ml-1 mr-2" for={`showPuck-${value}`}>
            {t(labelKeys[value])}
          </label>
        </>
      ))}
    </>
  );
}
