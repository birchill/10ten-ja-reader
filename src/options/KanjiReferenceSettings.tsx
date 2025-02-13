import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';
import type { ReferenceAbbreviation } from '../common/refs';

import { KanjiReferenceSettingsForm } from './KanjiReferenceSettingsForm';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function KanjiReferenceSettings(props: Props) {
  const { t } = useLocale();
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
      <div class="py-4">
        <KanjiReferenceSettingsForm
          dictLang={dictLang}
          enabledReferences={enabledReferences}
          showKanjiComponents={showKanjiComponents}
          onToggleReference={onToggleReference}
          onToggleKanjiComponents={onToggleKanjiComponents}
        />
      </div>
    </>
  );
}
