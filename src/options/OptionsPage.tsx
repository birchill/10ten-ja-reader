import { I18nProvider } from '../common/i18n';
import { getReleaseStage } from '../utils/release-stage';

import { DbStatus } from './DbStatus';
import { useDb } from './use-db';

export function OptionsPage() {
  const { dbState, startDatabaseUpdate, cancelDatabaseUpdate, deleteDatabase } =
    useDb();
  const releaseStage = getReleaseStage();

  return (
    <I18nProvider>
      <DbStatus
        dbState={dbState}
        devMode={releaseStage === 'development'}
        onCancelDbUpdate={cancelDatabaseUpdate}
        onDeleteDb={deleteDatabase}
        onUpdateDb={startDatabaseUpdate}
      />
    </I18nProvider>
  );
}
