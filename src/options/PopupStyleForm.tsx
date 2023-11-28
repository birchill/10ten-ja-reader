import {
  AccentDisplay,
  AutoExpandableEntry,
  FontSize,
  PartOfSpeechDisplay,
} from '../common/content-config-params';
import { useLocale } from '../common/i18n';
import { CheckboxRow } from './CheckboxRow';

type Props = {
  accentDisplay: AccentDisplay;
  autoExpand: Array<AutoExpandableEntry>;
  fontSize: FontSize;
  onChangeAccentDisplay: (value: AccentDisplay) => void;
  onChangeAutoExpand: (entry: AutoExpandableEntry, checked: boolean) => void;
  onChangeFontSize: (value: FontSize) => void;
  onChangePosDisplay: (value: PartOfSpeechDisplay) => void;
  onChangeShowDefinitions: (value: boolean) => void;
  onChangeShowPriority: (value: boolean) => void;
  onChangeShowRomaji: (value: boolean) => void;
  onChangeShowWaniKaniLevel: (value: boolean) => void;
  posDisplay: PartOfSpeechDisplay;
  showDefinitions: boolean;
  showPriority: boolean;
  showRomaji: boolean;
  showWaniKaniLevel: boolean;
};

export function PopupStyleForm(props: Props) {
  const { t } = useLocale();

  return (
    <>
      <div class="flex flex-col gap-3 pb-6">
        <CheckboxRow>
          <input
            id="showPriority"
            name="showPriority"
            type="checkbox"
            checked={props.showPriority}
            onChange={(e) =>
              props.onChangeShowPriority(e.currentTarget.checked)
            }
          />
          <label for="showPriority">{t('options_show_priority')}</label>
        </CheckboxRow>
        <CheckboxRow>
          <input
            id="showWaniKaniLevel"
            name="showWaniKaniLevel"
            type="checkbox"
            checked={props.showWaniKaniLevel}
            onChange={(e) =>
              props.onChangeShowWaniKaniLevel(e.currentTarget.checked)
            }
          />
          <label for="showWaniKaniLevel">
            {t('options_show_wanikani_levels')}
          </label>
        </CheckboxRow>
        <CheckboxRow>
          <input
            id="showRomaji"
            name="showRomaji"
            type="checkbox"
            checked={props.showRomaji}
            onChange={(e) => props.onChangeShowRomaji(e.currentTarget.checked)}
          />
          <label for="showRomaji">{t('options_show_romaji')}</label>
        </CheckboxRow>
        <CheckboxRow>
          <input
            id="showDefinitions"
            name="showDefinitions"
            type="checkbox"
            checked={props.showDefinitions}
            onChange={(e) =>
              props.onChangeShowDefinitions(e.currentTarget.checked)
            }
          />
          <label for="showDefinitions">{t('options_show_definitions')}</label>
        </CheckboxRow>
      </div>
      <div class="grid w-fit grid-cols-[repeat(2,auto)] items-baseline gap-4">
        <label for="accentDisplay">{t('options_accent_display_label')}</label>
        <select
          id="accentDisplay"
          name="accentDisplay"
          onChange={(evt) => {
            props.onChangeAccentDisplay(
              evt.currentTarget.value as AccentDisplay
            );
          }}
        >
          <option
            value="downstep"
            selected={props.accentDisplay === 'downstep'}
          >
            {t('options_accent_display_downstep')}
          </option>
          <option value="binary" selected={props.accentDisplay === 'binary'}>
            {t('options_accent_display_binary')}
          </option>
          <option
            value="binary-hi-contrast"
            selected={props.accentDisplay === 'binary-hi-contrast'}
          >
            {t('options_accent_display_binary_high_contrast')}
          </option>
          <option value="none" selected={props.accentDisplay === 'none'}>
            {t('options_accent_display_none')}
          </option>
        </select>
        <label for="posDisplay">{t('options_pos_display_label')}</label>
        <select
          id="posDisplay"
          name="posDisplay"
          onChange={(evt) => {
            props.onChangePosDisplay(
              evt.currentTarget.value as PartOfSpeechDisplay
            );
          }}
        >
          <option value="expl" selected={props.posDisplay === 'expl'}>
            {t('options_pos_display_expl')}
          </option>
          <option value="code" selected={props.posDisplay === 'code'}>
            {t('options_pos_display_code')}
          </option>
          <option value="none" selected={props.posDisplay === 'none'}>
            {t('options_pos_display_none')}
          </option>
        </select>
        <label for="fontSize">{t('options_font_size_label')}</label>
        <select
          id="fontSize"
          name="fontSize"
          onChange={(evt) => {
            props.onChangeFontSize(evt.currentTarget.value as FontSize);
          }}
        >
          <option value="normal" selected={props.fontSize === 'normal'}>
            {t('options_font_size_normal')}
          </option>
          <option value="large" selected={props.fontSize === 'large'}>
            {t('options_font_size_large')}
          </option>
          <option value="xl" selected={props.fontSize === 'xl'}>
            {t('options_font_size_xl')}
          </option>
        </select>
        <div>{t('options_expand_all_entries')}</div>
        <div class="flex gap-5 px-2 pt-1">
          <CheckboxRow>
            <input
              id="expandWords"
              name="expandWords"
              type="checkbox"
              checked={props.autoExpand.includes('words')}
              onChange={(e) =>
                props.onChangeAutoExpand('words', e.currentTarget.checked)
              }
            />
            <label for="expandWords">{t('options_expand_words_label')}</label>
          </CheckboxRow>
          <CheckboxRow>
            <input
              id="expandKanji"
              name="expandKanji"
              type="checkbox"
              checked={props.autoExpand.includes('kanji')}
              onChange={(e) =>
                props.onChangeAutoExpand('kanji', e.currentTarget.checked)
              }
            />
            <label for="expandKanji">{t('options_expand_kanji_label')}</label>
          </CheckboxRow>
        </div>
      </div>
    </>
  );
}
