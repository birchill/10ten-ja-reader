import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import { useLocale } from '../common/i18n';

import { KeyBox, KeyCheckbox, KeyInput } from './KeyBox';
import { Linkify } from './Linkify';
import {
  Command,
  CommandError,
  type CommandParams,
  isValidKey,
} from './commands';

export const ResetShortcut = Symbol('reset');

type Props = {
  disabled?: 'chrome' | 'edge' | 'other';
  isMac: boolean;
  onChangeToggleKey: (key: Command | typeof ResetShortcut | undefined) => void;
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
  const isEmpty =
    !formState.alt &&
    !formState.macCtrl &&
    !formState.ctrl &&
    !formState.shift &&
    !formState.key.length;

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
      <div class="flex flex-row-reverse flex-wrap items-center justify-end gap-x-6 gap-y-2">
        <div class="flex grow flex-wrap gap-x-6">
          <div class="w-min grow">
            {t('command_toggle_description')}
            {!!toggleKeyError?.length && (
              <div
                class="bg-warning-red ml-2 inline-block size-6 bg-cover bg-no-repeat align-top"
                id="toggle-key-icon"
                title={toggleKeyError}
              />
            )}
          </div>
          {!props.disabled && (
            <div>
              <button
                class="cursor-pointer appearance-none rounded-md border-none bg-transparent p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                disabled={!!props.disabled}
                title={
                  isEmpty
                    ? t('options_restore_toggle_shortcut')
                    : t('options_disable_toggle_shortcut')
                }
                type="button"
                onClick={() => {
                  props.onChangeToggleKey(isEmpty ? ResetShortcut : undefined);
                  setToggleKeyError(undefined);
                }}
              >
                {isEmpty ? (
                  <svg class="block size-5 fill-current" viewBox="0 0 16 16">
                    <path d="M8.54,2.11l.66-.65A.78.78,0,0,0,9.2.38a.76.76,0,0,0-1.08,0L6.19,2.31A.81.81,0,0,0,6,2.55a.8.8,0,0,0-.06.3A.72.72,0,0,0,6,3.14a.74.74,0,0,0,.17.25L8.12,5.32a.73.73,0,0,0,.54.22.76.76,0,0,0,.54-.22.78.78,0,0,0,0-1.08l-.58-.58A4.38,4.38,0,1,1,3.68,8.82a.76.76,0,0,0-1.5.28,5.92,5.92,0,1,0,6.36-7Z" />
                    <circle cx={2.673} cy={6.71} r={0.965} />
                  </svg>
                ) : (
                  <svg class="block size-5" viewBox="0 0 24 24">
                    <path
                      d="M6 18L18 6M6 6l12 12"
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
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
              <KeyBox label="Ctrl" isMac={props.isMac} />
              <span class="ml-2">+</span>
            </KeyCheckbox>
          )}
          <KeyCheckbox
            checked={formState.ctrl}
            disabled={!!props.disabled}
            onClick={onToggleKeyChange}
            ref={ctrlKeyRef}
          >
            <KeyBox
              // A few notes about modifier keys on Mac
              //
              // In DOM, `ctrlKey` corresponds to "Control" on Mac (and "Ctrl"
              // on PC).
              // `metaKey` represents the "Command" (⌘) key.
              // Ref: https://w3c.github.io/uievents/#dom-keyboardevent-ctrlkey
              //
              // In Web extension command shortcuts, "Ctrl" is mapped to
              // "Command".
              // `macCtrl` is used for "Control".
              // Ref: https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/commands#key_combinations
              //
              // This deviation probably makes sense in the context of
              // specifying a cross-platform keyboard shortcut because if your
              // shortcut is Ctrl+R on Windows it would most naturally be ⌘+R
              // on Mac.
              //
              // Now, for the shortcut keys _we_ handle (i.e. the popup shortcut
              // keys) we use DOM conventions. That is, we pass "Ctrl" to the
              // content script and have it check if `ctrlKey` is true.
              //
              // As a result, when we describe these keys to the user, they
              // should show "Control", and that's what KeyBox does when it sees
              // a label of "Ctrl".
              //
              // However, for the special case of the toggle key, the "Ctrl" we
              // get from the manifest/browser etc. should be shown as "Command".
              label={props.isMac ? 'Command' : 'Ctrl'}
              isMac={props.isMac}
            />
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
