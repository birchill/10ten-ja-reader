import type { JSX } from 'preact';
import { useCallback } from 'preact/hooks';

import { useLocale } from '../common/i18n';

export type ShowPuckSetting = 'auto' | 'show' | 'hide';
export type HandednessSetting = 'unset' | 'left' | 'right';

type Props = {
  showPuck: ShowPuckSetting;
  onChangeShowPuck: (value: ShowPuckSetting) => void;
  handedness: HandednessSetting;
  onChangeHandedness: (value: HandednessSetting) => void;
};

const showPuckLabelKeys: Record<ShowPuckSetting, string> = {
  auto: 'options_show_puck_option_auto',
  show: 'options_show_puck_option_show',
  hide: 'options_show_puck_option_hide',
};

const handednessLabelKeys: Record<HandednessSetting, string> = {
  unset: 'options_handedness_option_unset',
  left: 'options_handedness_option_left',
  right: 'options_handedness_option_right',
};

export function PuckSettingsForm(props: Props) {
  const { t } = useLocale();

  const onChangeShowPuck = useCallback(
    (event: JSX.TargetedEvent<HTMLInputElement>) => {
      const setting = event.currentTarget.value as ShowPuckSetting;
      props.onChangeShowPuck(setting);
    },
    [props.onChangeShowPuck]
  );

  const onChangeHandedness = useCallback(
    (event: JSX.TargetedEvent<HTMLInputElement>) => {
      const setting = event.currentTarget.value as HandednessSetting;
      props.onChangeHandedness(setting);
    },
    [props.onChangeHandedness]
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
            onChange={onChangeShowPuck}
            checked={props.showPuck === value}
          />
          <label class="mr-2 ml-1" for={`showPuck-${value}`}>
            {t(showPuckLabelKeys[value])}
          </label>
        </>
      ))}

      <p>{t('options_handedness_label')}</p>
      {(['unset', 'left', 'right'] as const).map((value) => (
        <>
          <input
            type="radio"
            name="handedness"
            id={`handedness-${value}`}
            value={value}
            onChange={onChangeHandedness}
            checked={props.handedness === value}
          />
          <label class="mr-2 ml-1" for={`handedness-${value}`}>
            {t(handednessLabelKeys[value])}
          </label>
        </>
      ))}
    </>
  );
}
