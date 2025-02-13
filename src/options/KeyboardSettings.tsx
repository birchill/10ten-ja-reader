import Bugsnag from '@birchill/bugsnag-zero';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import browser, { type Commands } from 'webextension-polyfill';

import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';
import { StoredKeyboardKeys } from '../common/popup-keys';
import { isChromium, isEdge, isMac, isSafari } from '../utils/ua-utils';

import { KeyboardSettingsForm } from './KeyboardSettingsForm';
import { SectionHeading } from './SectionHeading';
import type { HoldToShowSetting } from './ShowPopupKeysForm';
import { ResetShortcut } from './ToggleKeyForm';
import { Command, CommandError } from './commands';
import { useConfigValue } from './use-config-value';

const mac = isMac();

type CommandChangeCallback = Parameters<
  Commands.Static['onChanged']['addListener']
>[0];

export function KeyboardSettings(props: { config: Config }) {
  const { t } = useLocale();

  //
  // Toggle key
  //

  const [toggleKey, setToggleKey] = useState<Command | undefined>(undefined);

  // Fetch the current toggle key when the component mounts and set up a
  // listener to update the toggle key when it changes.
  useEffect(() => {
    void getToggleKey().then((toggleKey) => setToggleKey(toggleKey));

    if (!browser.commands || typeof browser.commands.onChanged !== 'object') {
      return;
    }

    const listener: CommandChangeCallback = (changeInfo) => {
      if (
        changeInfo.name !==
        (__MV3__ ? '_execute_action' : '_execute_browser_action')
      ) {
        return;
      }

      try {
        setToggleKey(
          changeInfo.newShortcut
            ? Command.fromString(changeInfo.newShortcut)
            : undefined
        );
      } catch (e) {
        console.error(`Failed to parse key: ${changeInfo.newShortcut}`);
        const error =
          e instanceof CommandError
            ? browser.i18n.getMessage(e.code, e.substitutions)
            : e;
        void Bugsnag.notify(error);
      }
    };

    browser.commands.onChanged.addListener(listener);

    return () => {
      browser.commands.onChanged.removeListener(listener);
    };
  }, []);

  const onChangeToggleKey = (
    key: Command | typeof ResetShortcut | undefined
  ) => {
    void (async () => {
      try {
        if (key === ResetShortcut) {
          await browser.commands.reset(
            __MV3__ ? '_execute_action' : '_execute_browser_action'
          );
          setToggleKey(await getToggleKey());
        } else {
          await browser.commands.update({
            name: __MV3__ ? '_execute_action' : '_execute_browser_action',
            shortcut: key ? key.toString() : '',
          });
          setToggleKey(key);
        }
      } catch (e) {
        console.error(`Failed to set toggle key to ${key?.toString()}`, e);
        void Bugsnag.notify(e);

        // Set the key back to its previous value
        setToggleKey(await getToggleKey());
      }
    })();
  };

  const [toggleKeyDisabled] = useState<undefined | 'chrome' | 'edge' | 'other'>(
    () => {
      // Disable any controls associated with configuring browser.commands if the
      // necessary APIs are not available.
      const canConfigureCommands =
        browser.commands &&
        typeof browser.commands.update === 'function' &&
        typeof browser.commands.reset === 'function';

      if (canConfigureCommands) {
        return undefined;
      }

      if (isEdge()) {
        return 'edge';
      }

      if (isChromium()) {
        return 'chrome';
      }

      return 'other';
    }
  );

  //
  // Hold-to-show keys
  //

  const [holdToShowKeys, setHoldToShowKeys] = useHoldToShowKeysSetting(
    props.config,
    'holdToShowKeys'
  );
  const [holdToShowImageKeys, setHoldToShowImageKeys] =
    useHoldToShowKeysSetting(props.config, 'holdToShowImageKeys');

  //
  // Popup keys
  //

  const popupKeys = useConfigValue(props.config, 'keys');
  const onUpdatePopupKey = useCallback(
    (key: keyof StoredKeyboardKeys, value: Array<string>) => {
      props.config.updateKeys({ [key]: value });
    },
    [props.config]
  );

  return (
    <>
      <SectionHeading>{t('options_keyboard_heading')}</SectionHeading>
      <div class="py-4">
        <KeyboardSettingsForm
          holdToShowKeys={holdToShowKeys}
          holdToShowImageKeys={holdToShowImageKeys}
          isMac={mac}
          toggleKey={toggleKey}
          toggleKeyDisabled={toggleKeyDisabled}
          onChangeToggleKey={onChangeToggleKey}
          onChangeHoldToShowKeys={setHoldToShowKeys}
          onChangeHoldToShowImageKeys={setHoldToShowImageKeys}
          onUpdatePopupKey={onUpdatePopupKey}
          popupKeys={popupKeys}
        />
      </div>
    </>
  );
}

async function getToggleKey(): Promise<Command | undefined> {
  // Firefox for Android does not support the browser.commands API at all
  // but probably not many people want to use keyboard shortcuts on Android
  // anyway so we can just return null from here in that case.
  if (!browser.commands) {
    return undefined;
  }

  const commands = await browser.commands.getAll();

  // Safari (14.1.1) has a very broken implementation of
  // chrome.commands.getAll(). It returns an object but it has no properties
  // and is not iterable.
  //
  // There's not much we can do in that case so we just hard code the default
  // key since Safari also has no way of changing shortcut keys. Hopefully
  // Safari will fix chrome.commands.getAll() before or at the same time it
  // provides a way of re-assigning shortcut keys.
  //
  // (See notes below for more recent versions of Safari.)
  if (
    typeof commands === 'object' &&
    typeof commands[Symbol.iterator] !== 'function'
  ) {
    return new Command('R', 'MacCtrl', 'Ctrl');
  }

  for (const command of commands) {
    if (
      command.name ===
        (__MV3__ ? '_execute_action' : '_execute_browser_action') &&
      command.shortcut
    ) {
      try {
        return Command.fromString(command.shortcut);
      } catch (e) {
        console.error(`Failed to parse key: ${command.shortcut}`);
        const error =
          e instanceof CommandError
            ? browser.i18n.getMessage(e.code, e.substitutions)
            : e;
        void Bugsnag.notify(error);
      }
    }
  }

  // In Safari 17.1, getAll returns an array of opaque WBSWebExtensionCommand
  // objects.
  //
  // Again, just return the hard-coded default key in this case.
  if (isSafari()) {
    return new Command('R', 'MacCtrl', 'Ctrl');
  }

  return undefined;
}

function useHoldToShowKeysSetting(
  config: Config,
  key: 'holdToShowKeys' | 'holdToShowImageKeys'
): [HoldToShowSetting, (value: HoldToShowSetting) => void] {
  const value = useConfigValue(config, key);

  const setting = useMemo(() => {
    const parts: Array<string> =
      typeof value === 'string'
        ? value.split('+').map((part) => part.trim().toLowerCase())
        : [];
    return { ctrl: parts.includes('ctrl'), alt: parts.includes('alt') };
  }, [value]);

  const setValue = useCallback(
    (value: HoldToShowSetting) => {
      const parts = [];
      if (value.ctrl) {
        parts.push('Ctrl');
      }
      if (value.alt) {
        parts.push('Alt');
      }
      config[key] = parts.length ? parts.join('+') : null;
    },
    [config, key]
  );

  return [setting, setValue];
}
