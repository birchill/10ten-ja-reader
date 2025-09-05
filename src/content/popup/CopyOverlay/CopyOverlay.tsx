import type { MajorDataSeries } from '@birchill/jpdict-idb';
import { useMemo } from 'preact/hooks';

import type { CopyType } from '../../../common/copy-keys';
import { useLocale } from '../../../common/i18n';
import type { ReferenceAbbreviation } from '../../../common/refs';
import { classes } from '../../../utils/classes';

import { getTextToCopy } from '../../copy-text';
import { getCopyEntryFromResult } from '../../get-copy-entry';
import type { QueryResult } from '../../query';

import type { CopyState } from '../copy-state';

import { PreviewButton } from './PreviewButton';

type Props = {
  copyState: CopyState;
  includeAllSenses: boolean;
  includeLessCommonHeadwords: boolean;
  includePartOfSpeech: boolean;
  kanjiReferences: Array<ReferenceAbbreviation>;
  onCancelCopy?: () => void;
  onCopy?: (copyType: CopyType) => void;
  result?: QueryResult;
  series: MajorDataSeries;
  showKanjiComponents?: boolean;
};

export function CopyOverlay(props: Props) {
  const { copyState, result, series } = props;
  const { t, langTag } = useLocale();

  const entryToCopy = useMemo(
    () =>
      result
        ? getCopyEntryFromResult({
            result,
            series,
            index: copyState.kind !== 'inactive' ? copyState.index : 0,
          })
        : null,
    [result, series, copyState]
  );

  const wordToCopy = useMemo(
    () =>
      entryToCopy
        ? getTextToCopy({ entry: entryToCopy, copyType: 'word', getMessage: t })
        : null,
    [entryToCopy]
  );

  const heading = wordToCopy
    ? t('content_copy_overlay_copy_title_with_word', wordToCopy)
    : t('content_copy_overlay_copy_title');

  // Entry button
  const {
    includeAllSenses,
    includeLessCommonHeadwords,
    includePartOfSpeech,
    kanjiReferences,
    showKanjiComponents,
  } = props;
  const entryPreviewText = entryToCopy
    ? getTextToCopy({
        entry: entryToCopy,
        copyType: 'entry',
        getMessage: t,
        includeAllSenses,
        includeLessCommonHeadwords,
        includePartOfSpeech,
        kanjiReferences,
        showKanjiComponents,
      })
    : undefined;

  // Tab-separated button
  const tabSeparatedPreviewText = entryToCopy
    ? getTextToCopy({
        entry: entryToCopy,
        copyType: 'tab',
        getMessage: t,
        includeAllSenses,
        includeLessCommonHeadwords,
        includePartOfSpeech,
        kanjiReferences,
        showKanjiComponents,
      }).replace(/\t/g, ' → ')
    : undefined;

  return (
    <div
      class={classes(
        'tp:border-box tp:w-full tp:flex tp:flex-col',
        // It's important to align to the top so that if the popup is very long
        // we don't end up putting the copy buttons off screen somewhere.
        'tp:justify-start tp:items-center',
        'tp:py-7 tp:isolate tp:overflow-hidden',
        // We fade the background so we always want a dark foreground color
        // here, regardless of the theme.
        'tp:text-black',
        'tp:has-overlay:starting:bg-transparent',
        'tp:has-overlay:bg-[hsla(0,0%,97%,0.6)]',
        'tp:has-overlay:[transition:background-color_0.3s_ease-in-out]'
      )}
    >
      <div role="heading" class="tp:opacity-80" lang={langTag}>
        {heading}
      </div>
      <ul class="tp:my-4 tp:mx-2 tp:flex-col tp:max-w-[90%] tp:list-none tp:p-0 tp:flex tp:gap-4">
        <PreviewButton
          label={t('content_copy_overlay_entry_button')}
          lang={langTag}
          previewText={entryPreviewText}
          onClick={() => props.onCopy?.('entry')}
        />
        <PreviewButton
          label={t('content_copy_overlay_tab_separated_button')}
          lang={langTag}
          previewText={tabSeparatedPreviewText}
          onClick={() => props.onCopy?.('tab')}
        />
        {wordToCopy && (
          <PreviewButton
            label={wordToCopy}
            lang="ja"
            onClick={() => props.onCopy?.('word')}
          />
        )}
      </ul>
      <button
        class={classes(
          'tp:appearance-none',
          'tp:m-0 tp:py-4 tp:px-10 tp:border-none',
          'tp:flex tp:items-center tp:justify-center tp:gap-1.5',
          'tp:leading-[1.5]',
          'tp:bg-transparent tp:text-black/40 tp:text-base tp:cursor-pointer'
        )}
        lang={langTag}
        onClick={props.onCancelCopy}
      >
        <svg
          viewBox="0 0 24 24"
          class="tp:size-4.5 tp:opacity-60"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
        {t('content_copy_overlay_cancel_button')}
      </button>
    </div>
  );
}
