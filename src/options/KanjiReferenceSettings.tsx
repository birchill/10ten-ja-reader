import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import type { ReferenceAbbreviation } from '../common/refs';

import { KanjiReferenceSettingsForm } from './KanjiReferenceSettingsForm';
import { useConfigValue } from './use-config-value';

type Props = {
  config: Config;
};

export function KanjiReferenceSettings(props: Props) {
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
    <KanjiReferenceSettingsForm
      dictLang={dictLang}
      enabledReferences={enabledReferences}
      showKanjiComponents={showKanjiComponents}
      onToggleReference={onToggleReference}
      onToggleKanjiComponents={onToggleKanjiComponents}
    />
  );
}
