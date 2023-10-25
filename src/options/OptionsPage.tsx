import type { Config } from '../common/config';
import { I18nProvider, useLocale } from '../common/i18n';
import { getReleaseStage } from '../utils/release-stage';

import { DbStatus } from './DbStatus';
import { DictionaryLanguageSettings } from './DictionaryLanguageSettings';
import { KanjiReferenceSettings } from './KanjiReferenceSettings';
import { SectionHeading } from './SectionHeading';
import { useDb } from './use-db';

type Props = {
  config: Config;
};

export function OptionsPage(props: Props) {
  return (
    <I18nProvider>
      <OptionsPageInner {...props} />
    </I18nProvider>
  );
}

function OptionsPageInner(props: Props) {
  const { t } = useLocale();
  const { dbState, startDatabaseUpdate, cancelDatabaseUpdate, deleteDatabase } =
    useDb();
  const releaseStage = getReleaseStage();

  return (
    <>
      <SectionHeading>
        {t('options_dictionary_language_heading')}
      </SectionHeading>
      <DictionaryLanguageSettings config={props.config} />
      <SectionHeading>{t('options_kanji_dictionary_heading')}</SectionHeading>
      <KanjiReferenceSettings config={props.config} />
      <SectionHeading>{t('options_dictionary_data_heading')}</SectionHeading>
      <DbStatus
        dbState={dbState}
        devMode={releaseStage === 'development'}
        onCancelDbUpdate={cancelDatabaseUpdate}
        onDeleteDb={deleteDatabase}
        onUpdateDb={startDatabaseUpdate}
      />
    </>
  );
}
