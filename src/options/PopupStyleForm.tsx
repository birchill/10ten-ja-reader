import { AutoExpandableEntry } from '../common/content-config-params';
import { useLocale } from '../common/i18n';
import { CheckboxRow } from './CheckboxRow';

type Props = {
  autoExpand: Array<AutoExpandableEntry>;
  onChangeAutoExpand: (entry: AutoExpandableEntry, checked: boolean) => void;
};

export function PopupStyleForm(props: Props) {
  const { t } = useLocale();

  return (
    <div class="grid w-fit grid-cols-[repeat(2,auto)] items-baseline gap-x-2 gap-y-4">
      <div>{t('options_expand_all_entries')}</div>
      <div class="flex gap-5">
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
  );
}
