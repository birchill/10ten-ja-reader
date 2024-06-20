import { useState } from 'preact/hooks';

import { DbLanguageId } from '../common/db-languages';

import { DictionaryLanguageSettingsForm } from './DictionaryLanguageSettingsForm';
import './options.css';

export default {
  default: () => {
    const [dictLang, setDictLang] = useState<DbLanguageId>('en');

    return (
      <DictionaryLanguageSettingsForm
        dictLang={dictLang}
        onChangeDictLang={setDictLang}
      />
    );
  },
};
