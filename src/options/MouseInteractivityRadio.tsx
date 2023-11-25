import { useLocale } from '../common/i18n';
import { useThemeClass } from '../utils/use-theme-class';

import { IconRadio } from './IconRadio';

type Props = {
  onChange: (enabled: boolean) => void;
  theme: string;
  value: boolean;
};

export function MouseInteractivityRadio(props: Props) {
  const { t } = useLocale();
  const themeClass = useThemeClass(props.theme);

  return (
    <div class="grid w-max grid-cols-1 gap-2 min-[400px]:grid-cols-2">
      <IconRadio
        checked={!props.value}
        label={t('options_mouse_interactivity_disable')}
        name="mouseInteractivity"
        onChange={() => props.onChange(false)}
        value="disable"
      >
        <div class="flex items-center justify-center px-4 py-3">
          <svg
            class={`${themeClass} w-[150px] select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]`}
            viewBox="0 0 200 150"
          >
            <use href="#interactivity-disabled-popup" />
          </svg>
        </div>
      </IconRadio>
      <IconRadio
        checked={props.value}
        label={t('options_mouse_interactivity_enable')}
        name="mouseInteractivity"
        onChange={() => props.onChange(true)}
        value="enable"
      >
        <div class="flex items-center justify-center px-4 py-3">
          <svg
            class={`${themeClass} w-[150px] select-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]`}
            viewBox="0 0 200 150"
          >
            <use href="#interactivity-enabled-popup" />
          </svg>
        </div>
      </IconRadio>
    </div>
  );
}
