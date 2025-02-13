import { useMemo } from 'preact/hooks';

import { DbLanguageId } from '../common/db-languages';
import { useLocale } from '../common/i18n';
import {
  type ReferenceAbbreviation,
  getReferenceLabelsForLang,
} from '../common/refs';

import { CheckboxRow } from './CheckboxRow';

type Props = {
  dictLang: DbLanguageId;
  enabledReferences: Array<ReferenceAbbreviation>;
  showKanjiComponents: boolean;
  onToggleReference: (ref: ReferenceAbbreviation, value: boolean) => void;
  onToggleKanjiComponents: (value: boolean) => void;
};

export function KanjiReferenceSettingsForm(props: Props) {
  const { t } = useLocale();
  const lang = t('lang_tag');

  const references = useMemo(() => {
    return [
      { ref: 'kanjiComponents', full: t('options_kanji_components') },
      ...getReferenceLabelsForLang(props.dictLang, t),
    ];
  }, [props.dictLang, lang]);

  const enabledReferences = useMemo(
    () => new Set(props.enabledReferences),
    [props.enabledReferences]
  );

  // We want to match the arrangement of references when they are displayed,
  // that is, in a vertically flowing grid. See comments where we generate the
  // popup styles for more explanation.
  const gridTemplateRows = `repeat(${Math.ceil(
    references.length / 2
  )}, minmax(min-content, max-content))`;

  return (
    <div
      class="grid w-[95%] grid-cols-[minmax(250px,1fr)] gap-x-4 gap-y-3 sm:grid-flow-col sm:grid-cols-[repeat(2,minmax(250px,1fr))]"
      style={{ gridTemplateRows }}
    >
      {references.map(({ ref, full }) => (
        <CheckboxRow key={ref}>
          <input
            type="checkbox"
            id={`ref-${ref}`}
            name={ref}
            checked={
              ref === 'kanjiComponents'
                ? props.showKanjiComponents
                : enabledReferences.has(ref as ReferenceAbbreviation)
            }
            onClick={(event) => {
              const value = event.currentTarget.checked;
              if (ref === 'kanjiComponents') {
                props.onToggleKanjiComponents(value);
              } else {
                props.onToggleReference(ref as ReferenceAbbreviation, value);
              }
            }}
          />
          <label class="cursor-pointer select-none" for={`ref-${ref}`}>
            {full}
          </label>
        </CheckboxRow>
      ))}
    </div>
  );
}
