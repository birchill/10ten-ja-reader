import type { JSX } from 'preact';

import { TabDisplay } from '../common/content-config-params';
import { useLocale } from '../common/i18n';
import { CheckboxRow } from './CheckboxRow';
import { TabDisplayRadio } from './TabDisplayRadio';

type Props = {
  enableTapLookup: boolean;
  hasTouch: boolean;
  onChangeEnableTapLookup: (value: boolean) => void;
  onChangeTabDisplay: (value: TabDisplay) => void;
  tabDisplay: TabDisplay;
  theme: string;
};

export function PopupInteractivitySettingsForm(props: Props) {
  const { t } = useLocale();

  return (
    <>
      {props.hasTouch && (
        <div class="mb-8">
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
      <p>{t('options_tab_position_label')}</p>
      <TabDisplayRadio
        onChange={props.onChangeTabDisplay}
        theme={props.theme}
        value={props.tabDisplay}
      />
      {/* TODO: Drop this one we move this inside a suitable block. */}
      <div class="h-4" />
    </>
  );
}
