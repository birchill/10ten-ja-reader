import { useRef } from 'preact/hooks';

import { useLocale } from '../common/i18n';

import { KeyBox, KeyCheckbox } from './KeyBox';

export type HoldToShowSetting = { alt: boolean; ctrl: boolean };

type Props = {
  isMac: boolean;
  holdToShowKeys: HoldToShowSetting;
  holdToShowImageKeys: HoldToShowSetting;
  onChangeHoldToShowKeys: (value: HoldToShowSetting) => void;
  onChangeHoldToShowImageKeys: (value: HoldToShowSetting) => void;
};

export function ShowPopupKeysForm(props: Props) {
  const { t } = useLocale();

  return (
    <fieldset class="border border-solid border-zinc-300 px-6 py-3 dark:border-zinc-500">
      <p class="my-3 italic leading-6">{t('options_show_popup_explanation')}</p>
      <div class="grid auto-cols-max items-center gap-x-8">
        <div class="col-span-2">{t('options_show_popup_text_subheading')}</div>
        <KeyCheckboxes
          isMac={props.isMac}
          value={props.holdToShowKeys}
          onChange={props.onChangeHoldToShowKeys}
        />
        <div>
          <svg
            viewBox="0 0 120 90"
            class="w-24 text-zinc-400 dark:text-zinc-300"
          >
            <use href="#text-with-cursor" />
          </svg>
        </div>
        <div class="col-span-2">
          {t('options_show_popup_images_subheading')}
        </div>
        <KeyCheckboxes
          isMac={props.isMac}
          value={props.holdToShowImageKeys}
          onChange={props.onChangeHoldToShowImageKeys}
        />
        <div>
          <svg
            viewBox="0 0 120 90"
            class="w-24 text-zinc-400 dark:text-zinc-300"
          >
            <use href="#image-with-cursor" />
          </svg>
        </div>
      </div>
    </fieldset>
  );
}

type KeyCheckboxesProps = {
  isMac: boolean;
  value: HoldToShowSetting;
  onChange: (value: HoldToShowSetting) => void;
};

function KeyCheckboxes(props: KeyCheckboxesProps) {
  const altRef = useRef<HTMLInputElement>(null);
  const ctrlRef = useRef<HTMLInputElement>(null);
  const onChange = () => {
    props.onChange({
      alt: altRef.current?.checked ?? false,
      ctrl: ctrlRef.current?.checked ?? false,
    });
  };

  return (
    <div class="flex items-baseline gap-2">
      <KeyCheckbox checked={props.value.alt} onClick={onChange} ref={altRef}>
        <KeyBox label="Alt" isMac={props.isMac} />
      </KeyCheckbox>
      <span class={!props.value.alt || !props.value.ctrl ? 'opacity-50' : ''}>
        +
      </span>
      <KeyCheckbox checked={props.value.ctrl} onClick={onChange} ref={ctrlRef}>
        <KeyBox label="Ctrl" isMac={props.isMac} />
      </KeyCheckbox>
    </div>
  );
}
