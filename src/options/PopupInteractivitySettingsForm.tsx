import type { JSX } from 'preact';

import { TabDisplay } from '../common/content-config-params';
import { useLocale } from '../common/i18n';

import { CheckboxRow } from './CheckboxRow';
import { MouseInteractivityRadio } from './MouseInteractivityRadio';
import { TabDisplayRadio } from './TabDisplayRadio';

type Props = {
  enableTapLookup: boolean;
  hasMouse: boolean;
  hasTouch: boolean;
  mouseInteractivity: boolean;
  onChangeEnableTapLookup: (value: boolean) => void;
  onChangeMouseInteractivity: (value: boolean) => void;
  onChangeTabDisplay: (value: TabDisplay) => void;
  tabDisplay: TabDisplay;
  theme: string;
};

export function PopupInteractivitySettingsForm(props: Props) {
  const { t } = useLocale();

  return (
    <div class="flex flex-col gap-4">
      {props.hasMouse && (
        <div class="flex flex-col gap-4">
          <p class="m-0">{t('options_mouse_interactivity_label')}</p>
          <MouseInteractivityRadio
            onChange={props.onChangeMouseInteractivity}
            theme={props.theme}
            value={props.mouseInteractivity}
          />
        </div>
      )}
      {props.hasTouch && (
        <div class="my-1">
          <CheckboxRow>
            <input
              checked={props.enableTapLookup}
              id="enableTapLookup"
              name="enableTapLookup"
              onClick={(event: JSX.TargetedEvent<HTMLInputElement>) => {
                props.onChangeEnableTapLookup(event.currentTarget.checked);
              }}
              type="checkbox"
            />
            <label class="cursor-pointer select-none" for="enableTapLookup">
              {t('options_touch_enable_tap_lookup')}
            </label>
          </CheckboxRow>
        </div>
      )}
      <div class="flex flex-col gap-4">
        <p class="m-0">{t('options_tab_position_label')}</p>
        <TabDisplayRadio
          onChange={props.onChangeTabDisplay}
          theme={props.theme}
          value={props.tabDisplay}
        />
      </div>
    </div>
  );
}
