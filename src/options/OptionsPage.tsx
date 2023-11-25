import type { Config } from '../common/config';
import { I18nProvider, useLocale } from '../common/i18n';
import { possiblyHasPhysicalKeyboard } from '../utils/device';
import { getReleaseStage } from '../utils/release-stage';

import { CurrencySettings } from './CurrencySettings';
import { DbStatus } from './DbStatus';
import { DictionaryLanguageSettings } from './DictionaryLanguageSettings';
import { KanjiReferenceSettings } from './KanjiReferenceSettings';
import { KeyboardSettings } from './KeyboardSettings';
import { PopupInteractivitySettings } from './PopupInteractivitySettings';
import { PuckSettings } from './PuckSettings';
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
  const hasKeyboard = possiblyHasPhysicalKeyboard();

  return (
    <>
      <SectionHeading>
        {t('options_popup_interactivity_heading')}
      </SectionHeading>
      <div class="py-4">
        <PopupInteractivitySettings config={props.config} />
      </div>
      {/* For the currency settings, the CurrencySettings component renders the
          section heading since we want to hide it when no currencies are
          available. */}
      <CurrencySettings config={props.config} />
      {hasKeyboard && (
        <>
          <SectionHeading>{t('options_keyboard_heading')}</SectionHeading>
          <KeyboardSettings config={props.config} />
        </>
      )}
      <SectionHeading>{t('options_lookup_puck_heading')}</SectionHeading>
      <PuckSettings config={props.config} />
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
