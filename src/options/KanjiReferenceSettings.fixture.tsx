import { useState } from 'preact/hooks';
import { useSelect } from 'react-cosmos/client';

import { DbLanguageId, dbLanguages } from '../common/db-languages';
import { ReferenceAbbreviation } from '../common/refs';
import { KanjiReferenceSettings } from './KanjiReferenceSettings';

import './options.css';

export default function () {
  const [dictLang] = useSelect<DbLanguageId>('dictLang', {
    // I suspect the React Cosmos typings here are incorrect with regard to
    // constness.
    options: dbLanguages as unknown as DbLanguageId[],
    defaultValue: 'en',
  });

  const [enabledReferences, setEnabledReferences] = useState<
    Array<ReferenceAbbreviation>
  >(['radical', 'nelson_r', 'kk', 'wk', 'py', 'unicode', 'halpern_njecd']);
  const toggleReference = (ref: ReferenceAbbreviation, value: boolean) => {
    const referenceSet = new Set(enabledReferences);
    if (value) {
      referenceSet.add(ref);
    } else {
      referenceSet.delete(ref);
    }
    setEnabledReferences([...referenceSet]);
  };

  const [showKanjiComponents, setShowKanjiComponents] = useState(true);

  return (
    <KanjiReferenceSettings
      dictLang={dictLang}
      enabledReferences={enabledReferences}
      showKanjiComponents={showKanjiComponents}
      onToggleReference={toggleReference}
      onToggleKanjiComponents={setShowKanjiComponents}
    />
  );
}
