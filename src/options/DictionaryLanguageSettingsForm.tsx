import Bugsnag from '@birchill/bugsnag-zero';
import type { JSX } from 'preact';
import { useCallback } from 'preact/hooks';

import {
  DbLanguageId,
  dbLanguageMeta,
  isDbLanguageId,
} from '../common/db-languages';
import { useLocale } from '../common/i18n';

type Props = {
  dictLang: DbLanguageId;
  onChangeDictLang: (lang: DbLanguageId) => void;
};

export function DictionaryLanguageSettingsForm(props: Props) {
  const { t } = useLocale();

  const onChange = useCallback(
    (event: JSX.TargetedEvent<HTMLSelectElement>) => {
      const value = event.currentTarget.value;
      if (!isDbLanguageId(value)) {
        const msg = `Got unexpected language code: ${value}`;
        void Bugsnag.notify(new Error(msg));
        console.error(msg);
        return;
      }

      props.onChangeDictLang(value);
    },
    [props.onChangeDictLang]
  );

  return (
    <div class="section-content dict-lang">
      <select id="lang" name="lang" onChange={onChange}>
        {dbLanguageMeta.map(([id, data]) => {
          let label = data.name;
          if (data.hasWords && !data.hasKanji) {
            label += t('options_lang_words_only');
          } else if (!data.hasWords && data.hasKanji) {
            label += t('options_lang_kanji_only');
          }
          return (
            <option value={id} selected={id === props.dictLang}>
              {label}
            </option>
          );
        })}
      </select>
      <div class="note">
        <p>{t('options_lang_warning_please_note')}</p>
        <ul>
          <li>{t('options_lang_warning_other_lang_when_available')}</li>
          <li>{t('options_lang_warning_always_en')}</li>
          <li>{t('options_lang_warning_names_en_only')}</li>
          <li>{t('options_lang_warning_change_lang_redownload')}</li>
          <li>{t('options_lang_warning_temporary_en_fallback')}</li>
        </ul>
      </div>
    </div>
  );
}
