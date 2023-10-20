import type { RenderableProps } from 'preact';
import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { I18nProvider, useLocale } from '../common/i18n';
import { ReferenceAbbreviation } from '../common/refs';
import { getReleaseStage } from '../utils/release-stage';
import type { EmptyProps } from '../utils/type-helpers';

import { DbStatus } from './DbStatus';
import { KanjiReferenceSetting } from './KanjiReferenceSetting';
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
