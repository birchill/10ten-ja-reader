import { useMemo, useState } from 'preact/hooks';
import { useSelect, useValue } from 'react-cosmos/client';

import { PopupKeys, StoredKeyboardKeys } from '../common/popup-keys';
import { isMac } from '../utils/ua-utils';

import { KeyboardSettingsForm } from './KeyboardSettingsForm';
import { ResetShortcut } from './ToggleKeyForm';
import { Command } from './commands';
import './options.css';

export default function KeyboardSettingsFormFixture() {
  const [mac] = useValue('Mac?', { defaultValue: isMac() });

  // Toggle key

  const [toggleCommandString, setToggleCommandString] = useValue(
    'toggle command',
    { defaultValue: 'Ctrl+Alt+R' }
  );
  const [toggleKeyDisabled] = useSelect('toggle key disabled', {
    options: ['none', 'chrome', 'edge', 'other'],
    defaultValue: 'none',
  });

  const toggleCommand = useMemo(() => {
    try {
      return Command.fromString(toggleCommandString);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }, [toggleCommandString]);

  const onChangeToggleKey = (
    key: Command | typeof ResetShortcut | undefined
  ) => {
    if (key === ResetShortcut) {
      setToggleCommandString('Ctrl+Alt+R');
    } else {
      setToggleCommandString(key?.toString() || '');
    }
  };

  // Hold-to-show keys

  const [holdToShowKeys, setHoldToShowKeys] = useState({
    ctrl: true,
    alt: false,
  });
  const [holdToShowImageKeys, setHoldToShowImageKeys] = useState({
    ctrl: true,
    alt: false,
  });

  // Popup keys

  const [popupKeys, setPopupKeys] = useState(
    PopupKeys.reduce<Partial<StoredKeyboardKeys>>((defaultKeys, setting) => {
      defaultKeys[setting.name] = setting.enabledKeys;
      return defaultKeys;
    }, {}) as StoredKeyboardKeys
  );
  const updatePopupKey = (name: keyof StoredKeyboardKeys, keys: string[]) => {
    setPopupKeys({ ...popupKeys, [name]: keys });
  };

  return (
    <KeyboardSettingsForm
      holdToShowKeys={holdToShowKeys}
      holdToShowImageKeys={holdToShowImageKeys}
      isMac={mac}
      onChangeHoldToShowImageKeys={setHoldToShowImageKeys}
      onChangeHoldToShowKeys={setHoldToShowKeys}
      onChangeToggleKey={onChangeToggleKey}
      onUpdatePopupKey={updatePopupKey}
      popupKeys={popupKeys}
      toggleKey={toggleCommand}
      toggleKeyDisabled={
        toggleKeyDisabled === 'none' ? undefined : toggleKeyDisabled
      }
    />
  );
}
