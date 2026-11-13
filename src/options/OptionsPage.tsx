import type { Config } from '../common/config';
import { I18nProvider } from '../common/i18n';
import { possiblyHasPhysicalKeyboard } from '../utils/device';

import { CopySettings } from './CopySettings';
import { CurrencySettings } from './CurrencySettings';
import { DictionaryDataSettings } from './DictionaryDataSettings';
import { DictionaryLanguageSettings } from './DictionaryLanguageSettings';
import { ErrorReportingNotice } from './ErrorReportingNotice';
import { ErrorReportingSettingsForm } from './ErrorReportingSettingsForm';
import { GeneralSettings } from './GeneralSettings';
import { KanjiReferenceSettings } from './KanjiReferenceSettings';
import { KeyboardSettings } from './KeyboardSettings';
import { PopupInteractivitySettings } from './PopupInteractivitySettings';
import { PopupStyleSettings } from './PopupStyleSettings';
import { PuckSettings } from './PuckSettings';
import { UnitSettings } from './UnitSettings';
import { useReporting } from './use-reporting';

type Props = { config: Config };

export function OptionsPage(props: Props) {
  const hasKeyboard = possiblyHasPhysicalKeyboard();
  // Shared by the notice at the top and the settings at the bottom.
  const reporting = useReporting();

  return (
    <I18nProvider>
      <div class="mx-auto max-w-[780px] px-6 pt-6">
        <ErrorReportingNotice {...reporting} />
        <GeneralSettings config={props.config} />
        <PopupStyleSettings config={props.config} />
        <PopupInteractivitySettings config={props.config} />
        <CurrencySettings config={props.config} />
        <UnitSettings config={props.config} />
        {hasKeyboard && <KeyboardSettings config={props.config} />}
        <CopySettings config={props.config} />
        <PuckSettings config={props.config} />
        <DictionaryLanguageSettings config={props.config} />
        <KanjiReferenceSettings config={props.config} />
        <DictionaryDataSettings />
        <ErrorReportingSettingsForm {...reporting} />
      </div>
    </I18nProvider>
  );
}
