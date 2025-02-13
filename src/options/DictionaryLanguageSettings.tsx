import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { DbLanguageId } from '../common/db-languages';
import { useLocale } from '../common/i18n';

import { DictionaryLanguageSettingsForm } from './DictionaryLanguageSettingsForm';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function DictionaryLanguageSettings(props: Props) {
  const { t } = useLocale();
  const dictLang = useConfigValue(props.config, 'dictLang');
  const onChangeDictLang = useCallback(
    (value: DbLanguageId) => {
      props.config.dictLang = value;
    },
    [props.config]
  );

  return (
    <>
      <SectionHeading>
        {t('options_dictionary_language_heading')}
      </SectionHeading>
      <div class="py-4">
        <DictionaryLanguageSettingsForm
          dictLang={dictLang}
          onChangeDictLang={onChangeDictLang}
        />
      </div>
    </>
  );
}
