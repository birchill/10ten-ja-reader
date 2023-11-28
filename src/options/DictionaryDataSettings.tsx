import { useLocale } from '../common/i18n';
import { getReleaseStage } from '../utils/release-stage';

import { DbStatus } from './DbStatus';
import { SectionHeading } from './SectionHeading';
import { useDb } from './use-db';

export function DictionaryDataSettings() {
  const { t } = useLocale();
  const { dbState, startDatabaseUpdate, cancelDatabaseUpdate, deleteDatabase } =
    useDb();
  const releaseStage = getReleaseStage();

  return (
    <>
      <SectionHeading>{t('options_dictionary_data_heading')}</SectionHeading>
      <div class="py-4">
        <DbStatus
          dbState={dbState}
          devMode={releaseStage === 'development'}
          onCancelDbUpdate={cancelDatabaseUpdate}
          onDeleteDb={deleteDatabase}
          onUpdateDb={startDatabaseUpdate}
        />
      </div>
    </>
  );
}
