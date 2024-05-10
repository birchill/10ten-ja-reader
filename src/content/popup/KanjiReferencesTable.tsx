import { KanjiResult } from '@birchill/jpdict-idb';
import { useMemo } from 'preact/hooks';

import { useLocale } from '../../common/i18n';
import {
  getSelectedReferenceLabels,
  ReferenceAbbreviation,
} from '../../common/refs';
import { classes } from '../../utils/classes';

import { getReferenceValue } from '../reference-value';

type Props = {
  entry: KanjiResult;
  kanjiReferences: Array<ReferenceAbbreviation>;
};

export function KanjiReferencesTable({ entry, kanjiReferences }: Props) {
  const { t, langTag } = useLocale();

  const referenceTableInfo = useMemo(() => {
    const referenceNames = getSelectedReferenceLabels(kanjiReferences, t);
    const referenceTableInfo = [];
    for (const ref of referenceNames) {
      // Don't show the Nelson radical if it's the same as the regular radical
      // (in which case it will be empty) and we're showing the regular radical.
      if (
        ref.ref === 'nelson_r' &&
        !entry.rad.nelson &&
        kanjiReferences.includes('radical')
      ) {
        continue;
      }

      const value = getReferenceValue(entry, ref.ref, t) || '-';
      referenceTableInfo.push({
        name: {
          lang: ref.lang,
          value: ref.short || ref.full,
        },
        value: {
          lang:
            ref.ref === 'radical' || ref.ref === 'nelson_r' ? 'ja' : undefined,
          value,
        },
        highlight: false,
      });
    }

    // Now we go through and toggle the styles to get the desired alternating
    // effect.
    //
    // We can't easily use nth-child voodoo here because we need to
    // handle unbalanced columns etc. We also can't easily do this in the loop
    // where we generate the cells because we don't know how many references we
    // will generate at that point.
    for (const [index, cellInfo] of [...referenceTableInfo].entries()) {
      const row = index % Math.ceil(referenceTableInfo.length / 2);
      if (row % 2 === 0) {
        cellInfo.highlight = true;
      }
    }

    return referenceTableInfo;
  }, [t, kanjiReferences]);

  // The layout we want is something in-between what CSS grid and CSS multicol
  // can do. See:
  //
  //   https://twitter.com/brianskold/status/1186198347184398336
  //
  // In the stylesheet we make let the table flow horizontally, but then here
  // where we know the number of rows, we update it to produce the desired
  // vertical flow.
  let gridAutoFlow: string | undefined;
  let gridTemplateRows: string | undefined;
  if (referenceTableInfo.length > 1) {
    gridAutoFlow = 'column';
    gridTemplateRows = `repeat(${Math.ceil(
      referenceTableInfo.length / 2
    )}, minmax(min-content, max-content))`;
  }

  return (
    <div
      class="references"
      lang={langTag}
      style={{ gridAutoFlow, gridTemplateRows }}
    >
      {referenceTableInfo.map((cellInfo) => (
        <div class={classes('ref', cellInfo.highlight && '-highlight')}>
          <span class="name" lang={cellInfo.name.lang}>
            {cellInfo.name.value}
          </span>
          <span class="value" lang={cellInfo.value.lang}>
            {cellInfo.value.value}
          </span>
        </div>
      ))}
    </div>
  );
}
