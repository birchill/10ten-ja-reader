import { useLocale } from '../common/i18n';
import { StoredKeyboardKeys } from '../common/popup-keys';

import type { Command } from './commands';
import { PopupKeysForm } from './PopupKeysForm';
import { type HoldToShowSetting, ShowPopupKeysForm } from './ShowPopupKeysForm';
import { ToggleKeyForm } from './ToggleKeyForm';

type Props = {
  holdToShowImageKeys: HoldToShowSetting;
  holdToShowKeys: HoldToShowSetting;
  isMac: boolean;
  onChangeHoldToShowImageKeys: (value: HoldToShowSetting) => void;
  onChangeHoldToShowKeys: (value: HoldToShowSetting) => void;
  onChangeToggleKey: (key: Command) => void;
  onUpdatePopupKey: (
    name: keyof StoredKeyboardKeys,
    keys: Array<string>
  ) => void;
  popupKeys: StoredKeyboardKeys;
  toggleKey?: Command;
  toggleKeyDisabled?: 'chrome' | 'edge' | 'other';
};

export function KeyboardSettingsForm(props: Props) {
  const { t } = useLocale();

  return (
    <div class="section-content">
      <ToggleKeyForm
        disabled={props.toggleKeyDisabled}
        isMac={props.isMac}
        onChangeToggleKey={props.onChangeToggleKey}
        toggleKey={props.toggleKey}
      />
      <p>{t('options_show_popup_subheading')}</p>
      <ShowPopupKeysForm
        holdToShowImageKeys={props.holdToShowImageKeys}
        holdToShowKeys={props.holdToShowKeys}
        isMac={props.isMac}
        onChangeHoldToShowImageKeys={props.onChangeHoldToShowImageKeys}
        onChangeHoldToShowKeys={props.onChangeHoldToShowKeys}
      />
      <p>{t('options_popup_keys_subheading')}</p>
      <PopupKeysForm
        isMac={props.isMac}
        keys={props.popupKeys}
        onUpdateKey={props.onUpdatePopupKey}
      />
    </div>
  );
}
