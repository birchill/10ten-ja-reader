import type { Config } from '../common/config';
import { I18nProvider } from '../common/i18n';
import { possiblyHasPhysicalKeyboard } from '../utils/device';

import { CopySettings } from './CopySettings';
import { CurrencySettings } from './CurrencySettings';
import { DictionaryDataSettings } from './DictionaryDataSettings';
import { DictionaryLanguageSettings } from './DictionaryLanguageSettings';
import { GeneralSettings } from './GeneralSettings';
import { KanjiReferenceSettings } from './KanjiReferenceSettings';
import { KeyboardSettings } from './KeyboardSettings';
import { PopupInteractivitySettings } from './PopupInteractivitySettings';
import { PopupStyleSettings } from './PopupStyleSettings';
import { PuckSettings } from './PuckSettings';
import { UnitSettings } from './UnitSettings';

type Props = { config: Config };

export function OptionsPage(props: Props) {
  const hasKeyboard = possiblyHasPhysicalKeyboard();

  return (
    <I18nProvider>
      <div class="mx-auto max-w-[780px] px-6 pt-6">
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
      </div>
    </I18nProvider>
  );
}
