import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { DbLanguageId } from '../common/db-languages';

import { DictionaryLanguageSettingsForm } from './DictionaryLanguageSettingsForm';
import { useConfigValue } from './use-config-value';

type Props = {
  config: Config;
};

export function DictionaryLanguageSettings(props: Props) {
  const dictLang = useConfigValue(props.config, 'dictLang');
  const onChangeDictLang = useCallback(
    (value: DbLanguageId) => {
      props.config.dictLang = value;
    },
    [props.config]
  );

  return (
    <DictionaryLanguageSettingsForm
      dictLang={dictLang}
      onChangeDictLang={onChangeDictLang}
    />
  );
}
