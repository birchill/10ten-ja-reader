import type { Config } from '../common/config';
import { I18nProvider } from '../common/i18n';
import { possiblyHasPhysicalKeyboard } from '../utils/device';

import { CurrencySettings } from './CurrencySettings';
import { DictionaryDataSettings } from './DictionaryDataSettings';
import { DictionaryLanguageSettings } from './DictionaryLanguageSettings';
import { KanjiReferenceSettings } from './KanjiReferenceSettings';
import { KeyboardSettings } from './KeyboardSettings';
import { PopupInteractivitySettings } from './PopupInteractivitySettings';
import { PopupStyleSettings } from './PopupStyleSettings';
import { PuckSettings } from './PuckSettings';

type Props = {
  config: Config;
};

export function OptionsPage(props: Props) {
  const hasKeyboard = possiblyHasPhysicalKeyboard();

  return (
    <I18nProvider>
      <PopupStyleSettings config={props.config} />
      <PopupInteractivitySettings config={props.config} />
      <CurrencySettings config={props.config} />
      {hasKeyboard && <KeyboardSettings config={props.config} />}
      <PuckSettings config={props.config} />
      <DictionaryLanguageSettings config={props.config} />
      <KanjiReferenceSettings config={props.config} />
      <DictionaryDataSettings />
    </I18nProvider>
  );
}
