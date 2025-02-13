import { KanjiResult } from '@birchill/jpdict-idb';
import type { RenderableProps } from 'preact';
import { useMemo } from 'preact/hooks';

import { useLocale } from '../../../common/i18n';
import {
  ReferenceAbbreviation,
  getSelectedReferenceLabels,
} from '../../../common/refs';
import { classes } from '../../../utils/classes';

import { getReferenceValue } from '../../reference-value';

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
        ref: ref.ref,
        name: { lang: ref.lang, value: ref.short || ref.full },
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
      class={classes(
        'tp-grid tp-grid-cols-[repeat(2,minmax(min-content,1fr))] tp-gap-x-2',
        'max-[450px]:tp-grid-cols-none',
        '[--bg-overhang:8px]',
        '-tp-mx-[--bg-overhang] tp-w-[calc(100%+2*var(--bg-overhang))]'
      )}
      lang={langTag}
      style={{ gridAutoFlow, gridTemplateRows }}
    >
      {referenceTableInfo.map((cellInfo) => (
        <ReferenceEntryWrapper
          c={entry.c}
          highlight={cellInfo.highlight}
          refCode={cellInfo.ref}
          key={cellInfo.name.value}
        >
          <span lang={cellInfo.name.lang}>{cellInfo.name.value}</span>
          <span class="tp-ml-2" lang={cellInfo.value.lang}>
            {cellInfo.value.value}
          </span>
        </ReferenceEntryWrapper>
      ))}
    </div>
  );
}

function ReferenceEntryWrapper(
  props: RenderableProps<{
    c: string;
    highlight: boolean;
    refCode: ReferenceAbbreviation;
  }>
) {
  const { t } = useLocale();

  const href =
    props.refCode === 'wk'
      ? `https://wanikani.com/kanji/${encodeURIComponent(props.c)}`
      : undefined;

  const containerStyles = classes(
    'tp-flex tp-justify-between',
    'tp-rounded-lg tp-px-[--bg-overhang] tp-py-0.5',
    'tp-text-sm tp-leading-normal',
    href &&
      'tp-cursor-pointer hover:tp-bg-[--cell-bg-hover] tp-underline-offset-2',
    href
      ? 'tp-text-[--cell-link-fg]'
      : props.highlight
        ? 'tp-text-[--cell-highlight-fg]'
        : '',
    props.highlight && 'tp-bg-[--cell-highlight-bg]'
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        class={containerStyles}
        title={t('content_wk_link_title', props.c)}
      >
        {props.children}
      </a>
    );
  } else {
    return <div class={containerStyles}>{props.children}</div>;
  }
}
