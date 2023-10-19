import type { RenderableProps } from 'preact';
import { I18nProvider, useLocale } from '../common/i18n';
import { getReleaseStage } from '../utils/release-stage';
import { EmptyProps } from '../utils/type-helpers';

import { DbStatus } from './DbStatus';
import { useDb } from './use-db';

export function OptionsPage() {
  return (
    <I18nProvider>
      <OptionsPageInner />
    </I18nProvider>
  );
}

function OptionsPageInner() {
  const { t } = useLocale();
  const { dbState, startDatabaseUpdate, cancelDatabaseUpdate, deleteDatabase } =
    useDb();
  const releaseStage = getReleaseStage();

  return (
    <>
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

function SectionHeading(props: RenderableProps<EmptyProps>) {
  // TODO: Once we converted all headings to Tailwind, we need to apply the
  // special styling to the first heading in the section to remove its border
  // and padding, and reduce the margin.
  //
  // For reference, the styles we use(d) for this are:
  //
  //  .section-header {
  //    font-size: 1.46em;
  //    font-weight: 300;
  //    line-height: 1.3em;
  //    margin: 8px 0;
  //  }
  //
  //  .section-header:nth-of-type(n + 2) {
  //    margin-top: 16px;
  //    padding-top: 16px;
  //    border-top: 1px solid lightgrey;
  //  }
  //
  return (
    <h1 class="mt-4 border-0 border-t border-solid border-t-gray-300 pt-4 text-2xl font-light">
      {props.children}
    </h1>
  );
}
