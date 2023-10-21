import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { I18nProvider, useLocale } from '../common/i18n';
import { ReferenceAbbreviation } from '../common/refs';
import { getReleaseStage } from '../utils/release-stage';

import { DbStatus } from './DbStatus';
import { KanjiReferenceSetting } from './KanjiReferenceSetting';
import { SectionHeading } from './SectionHeading';
import { useDb } from './use-db';
import { useConfigValue } from './use-config-value';

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

  const dictLang = useConfigValue(props.config, 'dictLang');
  const enabledReferences = useConfigValue(props.config, 'kanjiReferences');
  const showKanjiComponents = useConfigValue(
    props.config,
    'showKanjiComponents'
  );
  const onToggleReference = useCallback(
    (ref: ReferenceAbbreviation, value: boolean) => {
      props.config.updateKanjiReferences({ [ref]: value });
    },
    [props.config]
  );
  const onToggleKanjiComponents = useCallback(
    (value: boolean) => {
      props.config.showKanjiComponents = value;
    },
    [props.config]
  );

  return (
    <>
      <SectionHeading>{t('options_kanji_dictionary_heading')}</SectionHeading>
      <KanjiReferenceSetting
        dictLang={dictLang}
        enabledReferences={enabledReferences}
        showKanjiComponents={showKanjiComponents}
        onToggleReference={onToggleReference}
        onToggleKanjiComponents={onToggleKanjiComponents}
      />
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
