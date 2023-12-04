import { HighlightStyle } from '../common/content-config-params';
import { useLocale } from '../common/i18n';

import { CheckboxRow } from './CheckboxRow';
import { HighlightStyleRadio } from './HighlightStyleRadio';
import { ToolbarIconRadio } from './ToolbarIconRadio';

type Props = {
  contextMenuEnable: boolean;
  highlightStyle: HighlightStyle | 'none';
  onChangeContextMenuEnable: (value: boolean) => void;
  onChangeHighlightStyle: (value: HighlightStyle | 'none') => void;
  onChangeToolbarIcon: (value: 'default' | 'sky') => void;
  supportsCssHighlight: boolean;
  toolbarIcon: 'default' | 'sky';
};

export function GeneralSettingsForm(props: Props) {
  const { t } = useLocale();

  return (
    <div class="flex flex-col gap-3">
      <p class="m-0">{t('options_toolbar_icon_label')}</p>
      <ToolbarIconRadio
        value={props.toolbarIcon}
        onChange={props.onChangeToolbarIcon}
      />
      {props.supportsCssHighlight && (
        <>
          <p class="m-0">{t('options_highlight_style_label')}</p>
          <HighlightStyleRadio
            value={props.highlightStyle}
            onChange={props.onChangeHighlightStyle}
          />
        </>
      )}
      {/* Make sure there is a bit of a gap between the graphical radio
        buttons and the checkbox(es) */}
      <div />
      {!props.supportsCssHighlight && (
        <CheckboxRow>
          <input
            id="highlightText"
            name="highlightText"
            type="checkbox"
            checked={props.highlightStyle !== 'none'}
            onChange={(e) =>
              props.onChangeHighlightStyle(
                e.currentTarget.checked ? 'yellow' : 'none'
              )
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
