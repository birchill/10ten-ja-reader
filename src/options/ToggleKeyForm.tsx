import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import { useLocale } from '../common/i18n';
import {
  Command,
  CommandError,
  type CommandParams,
  isValidKey,
} from './commands';
import { KeyBox, KeyCheckbox, KeyInput } from './KeyBox';
import { Linkify } from './Linkify';

type Props = {
  disabled?: 'chrome' | 'edge' | 'other';
  isMac: boolean;
  onChangeToggleKey: (key: Command) => void;
  toggleKey?: Command;
};

export function ToggleKeyForm(props: Props) {
  const { t } = useLocale();
  const [toggleKeyError, setToggleKeyError] = useState<string | undefined>(
    undefined
  );

  const altKeyRef = useRef<HTMLInputElement>(null);
  const macCtrlKeyRef = useRef<HTMLInputElement>(null);
  const ctrlKeyRef = useRef<HTMLInputElement>(null);
  const shiftKeyRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  // Track the form state separately to the input toggle key because we want to
  // allow the form state to be invalid (e.g. the user might clear one modifier
  // before setting another meaning that the state is temporarily invalid).
  const [formState, setFormState] = useState<CommandParams>({
    alt: !!props?.toggleKey?.alt,
    macCtrl: !!props?.toggleKey?.macCtrl,
    ctrl: !!props?.toggleKey?.ctrl,
    shift: !!props?.toggleKey?.shift,
    key: props.toggleKey?.key || '',
  });

  // Any time the input toggle key changes, however, we should reset the form
  // state to match and clear any error.
  useEffect(() => {
    setFormState({
      alt: !!props?.toggleKey?.alt,
      macCtrl: !!props?.toggleKey?.macCtrl,
      ctrl: !!props?.toggleKey?.ctrl,
      shift: !!props?.toggleKey?.shift,
      key: props.toggleKey?.key || '',
    });
    setToggleKeyError(undefined);
  }, [props.toggleKey]);

  const onToggleKeyChange = () => {
    const params: CommandParams = {
      alt: altKeyRef.current?.checked,
      ctrl: ctrlKeyRef.current?.checked,
      macCtrl: macCtrlKeyRef.current?.checked,
      shift: shiftKeyRef.current?.checked,
      key: keyRef.current?.value || '',
    };
    setFormState(params);

    try {
      const command = Command.fromParams(params);
      if (!command.isValid()) {
        setToggleKeyError(t('error_command_key_is_not_allowed', command.key));
        return;
      }

      props.onChangeToggleKey(command);
      setToggleKeyError(undefined);
    } catch (e) {
      setToggleKeyError(
        e instanceof CommandError
          ? t(e.code, e.substitutions)
          : e.message || String(e)
      );
    }
  };

  const onToggleKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    let key = e.key;

    // Translate single letter keys to uppercase.
    if (e.key.length === 1) {
      key = key.toUpperCase();
    }

    // For keys like , or . we want to use event.code instead.
    key = isValidKey(e.code) ? e.code : key;

    // For the arrow keys we need to translate ArrowLeft to Left etc.
    if (key.startsWith('Arrow')) {
      key = key.slice('Arrow'.length);
    }

    if (!isValidKey(key)) {
      // Most printable keys are one character in length so make sure we don't
      // allow the default action of adding them to the text input. For other
      // keys we don't handle though (e.g. Tab) we probably want to allow the
      // default action (except Backspace).
      if (e.key.length === 1 || e.key === 'Backspace') {
        e.preventDefault();
      }
      return;
    }

    e.currentTarget.value = key;
    e.preventDefault();

    onToggleKeyChange();
  };

  return (
    <>
      <div class="flex items-center gap-x-6 gap-y-1">
        <div class="flex flex-wrap gap-2">
          <KeyCheckbox
            checked={formState.alt}
            disabled={!!props.disabled}
            onClick={onToggleKeyChange}
            ref={altKeyRef}
          >
            <KeyBox label="Alt" isMac={props.isMac} />
            <span class="ml-2">+</span>
          </KeyCheckbox>
          {props.isMac && (
            <KeyCheckbox
              checked={formState.macCtrl}
              disabled={!!props.disabled}
              onClick={onToggleKeyChange}
              ref={macCtrlKeyRef}
            >
              <KeyBox label="Control" isMac={props.isMac} />
              <span class="ml-2">+</span>
            </KeyCheckbox>
          )}
          <KeyCheckbox
            checked={formState.ctrl}
            disabled={!!props.disabled}
            onClick={onToggleKeyChange}
            ref={ctrlKeyRef}
          >
            <KeyBox label="Ctrl" isMac={props.isMac} />
            <span class="ml-2">+</span>
          </KeyCheckbox>
          <KeyCheckbox
            checked={formState.shift}
            disabled={!!props.disabled}
            onClick={onToggleKeyChange}
            ref={shiftKeyRef}
          >
            <KeyBox label="Shift" isMac={props.isMac} />
            <span class="ml-2">+</span>
          </KeyCheckbox>
          <KeyInput
            disabled={!!props.disabled}
            onKeyDown={onToggleKeyDown}
            onCompositionStart={(
              event: JSX.TargetedEvent<HTMLInputElement>
            ) => {
              event.currentTarget.value = '';
            }}
            onCompositionEnd={(event: JSX.TargetedEvent<HTMLInputElement>) => {
              event.currentTarget.value =
                event.currentTarget.value.toUpperCase();
              onToggleKeyChange();
            }}
            ref={keyRef}
            size={1}
            type="text"
            value={formState.key || ''}
          />
        </div>
        <div class="grow">
          {t('command_toggle_description')}
          {!!toggleKeyError?.length && (
            <div
              class="bg-warning-red ml-2 inline-block h-6 w-6 bg-cover bg-no-repeat align-top"
              id="toggle-key-icon"
              title={toggleKeyError}
            />
          )}
        </div>
      </div>
      {!!props.disabled && (
        <div
          class="my-2 rounded-lg border border-solid border-zinc-500 px-4 py-2"
          onClick={handleChromeLinks}
        >
          <Linkify
            text={t(
              props.disabled === 'chrome'
                ? 'options_browser_commands_no_toggle_key_chrome'
                : props.disabled === 'edge'
                ? 'options_browser_commands_no_toggle_key_edge'
                : 'options_browser_commands_no_toggle_key'
            )}
            links={[
              {
                keyword: 'chrome://extensions/shortcuts',
                href: 'chrome://extensions/shortcuts',
              },
              {
                keyword: 'edge://extensions/shortcuts',
                href: 'edge://extensions/shortcuts',
              },
            ]}
          />
        </div>
      )}
    </>
  );
}

declare const chrome: any;

function handleChromeLinks(e: MouseEvent) {
  if (
    e.target instanceof HTMLAnchorElement &&
    (e.target.href.startsWith('chrome://') ||
      e.target.href.startsWith('edge://'))
  ) {
    chrome.tabs.create({ url: e.target.href });
    e.preventDefault();
  }
}
