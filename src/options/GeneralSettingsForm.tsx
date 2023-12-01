import { useState } from 'preact/hooks';

import { useLocale } from '../common/i18n';

import { CheckboxRow } from './CheckboxRow';

type Props = {
  contextMenuEnable: boolean;
  highlightText: boolean;
  onChangeContextMenuEnable: (value: boolean) => void;
  onChangeHighlightText: (value: boolean) => void;
};

export function GeneralSettingsForm(props: Props) {
  const { t } = useLocale();
  const [supportsCssHighlight] = useState(
    CSS.supports('selector(::highlight(yer))')
  );

  return (
    <div class="flex flex-col gap-3">
      {!supportsCssHighlight && (
        <CheckboxRow>
          <input
            id="highlightText"
            name="highlightText"
            type="checkbox"
            checked={props.highlightText}
            onChange={(e) =>
              props.onChangeHighlightText(e.currentTarget.checked)
            }
          />
          <label for="highlightText">
            {t('options_highlight_matched_text')}
          </label>
        </CheckboxRow>
      )}
      <CheckboxRow>
        <input
          id="contextMenuEnable"
          name="contextMenuEnable"
          type="checkbox"
          checked={props.contextMenuEnable}
          onChange={(e) =>
            props.onChangeContextMenuEnable(e.currentTarget.checked)
          }
        />
        <label for="contextMenuEnable">
          {t('options_show_context_menu_item')}
        </label>
      </CheckboxRow>
    </div>
  );
}
