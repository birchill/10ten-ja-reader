import { useRef } from 'preact/hooks';

import { CopyKeys, CopyNextKeyStrings } from '../common/copy-keys';
import { useLocale } from '../common/i18n';
import { PopupKeys, type StoredKeyboardKeys } from '../common/popup-keys';
import { classes } from '../utils/classes';

import { KeyBox, KeyCheckbox } from './KeyBox';
import { NewBadge } from './NewBadge';

const newKeys = ['expandPopup'];

type Props = {
  isMac: boolean;
  keys: StoredKeyboardKeys;
  onUpdateKey: (key: keyof StoredKeyboardKeys, value: Array<string>) => void;
};

export function PopupKeysForm(props: Props) {
  const hasClipboardApi =
    navigator.clipboard && typeof navigator.clipboard.writeText === 'function';

  return (
    <div class="grid-cols-keys grid items-baseline gap-x-8 gap-y-2">
      {PopupKeys.filter(
        (key) => key.name !== 'startCopy' || hasClipboardApi
      ).map((key) => (
        <PopupKey
          isMac={props.isMac}
          key={key.name}
          keys={key.keys}
          l10nKey={key.l10nKey}
          name={key.name}
          onUpdate={props.onUpdateKey}
          value={props.keys[key.name]}
        />
      ))}
    </div>
  );
}

function PopupKey(props: {
  isMac: boolean;
  keys: Array<string>;
  l10nKey: string;
  name: keyof StoredKeyboardKeys;
  onUpdate: (key: keyof StoredKeyboardKeys, value: Array<string>) => void;
  value: Array<string>;
}) {
  const { t } = useLocale();

  const keysRef = useRef<HTMLDivElement>(null);

  const onClick = () => {
    const checkboxes = [
      ...(keysRef.current?.querySelectorAll<HTMLInputElement>(
        'input[type=checkbox]'
      ) || []),
    ];
    const value = checkboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
    props.onUpdate(props.name, value);
  };

  return (
    <>
      <div class="flex flex-wrap items-baseline gap-x-2" ref={keysRef}>
        {props.keys.map((key, i) => {
          const checked = props.value.includes(key);
          const priorEnabled = props.keys
            .slice(0, i)
            .some((key) => props.value.includes(key));
          const orEnabled = checked && priorEnabled;

          return (
            <>
              {i > 0 && (
                <span class={classes('italic', !orEnabled && 'opacity-50')}>
                  {t('options_key_alternative')}
                </span>
              )}
              <KeyCheckbox checked={checked} onClick={onClick} value={key}>
                {props.name === 'movePopupDownOrUp' ? (
                  (() => {
                    const [down, up] = key.split(',', 2);
                    return (
                      <>
                        <KeyBox label={down} />
                        <span class="mx-2">/</span>
                        <KeyBox label={up} />
                      </>
                    );
                  })()
                ) : (
                  <KeyBox label={key} isMac={props.isMac} />
                )}
              </KeyCheckbox>
            </>
          );
        })}
      </div>
      <div>
        {t(props.l10nKey)}
        {newKeys.includes(props.name) && (
          <NewBadge expiry={new Date('2023-10-10')} />
        )}
        {/* For the copy key we show the other copy-related keys as a
            reference. */}
        {props.name === 'startCopy' && (
          <ul class="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {[
              ...CopyKeys,
              {
                key: props.keys[0],
                optionsString: CopyNextKeyStrings.optionsString,
              },
            ].map(({ key, optionsString }) => (
              <li key={key} class="flex list-none items-baseline gap-3">
                <KeyBox label={key} />
                {t(optionsString)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
