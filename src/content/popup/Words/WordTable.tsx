import { Fragment } from 'preact';
import { useRef } from 'preact/hooks';

import type { WordResult } from '../../../background/search-result';
import type {
  ContentConfigParams,
  FontSize,
} from '../../../common/content-config-params';
import { classes } from '../../../utils/classes';

import type { SelectionMeta } from '../../meta';
import type { NamePreview as QueryNamePreview } from '../../query';

import { MetadataContainer } from '../Metadata/MetadataContainer';
import type { CopyState } from '../copy-state';
import { usePopupOptions } from '../options-context';
import { getSelectedIndex } from '../selected-index';
import { containerHasSelectedText } from '../selection';
import type { StartCopyCallback } from '../show-popup';

import { NamePreview } from './NamePreview';
import type { WordEntryConfig } from './WordEntry';
import { WordEntry } from './WordEntry';

type WordTableConfig = WordEntryConfig &
  Pick<ContentConfigParams, 'preferredUnits' | 'fx'>;

export type WordTableProps = {
  entries: Array<WordResult>;
  matchLen: number;
  more: boolean;
  namePreview?: QueryNamePreview;
  title?: string;
  meta?: SelectionMeta;
  config: WordTableConfig;
  copyState: CopyState;
  onStartCopy?: StartCopyCallback;
};

export const WordTable = (props: WordTableProps) => {
  const { entries, more } = props;
  const { fontSize } = usePopupOptions();

  const wordTable = useRef<HTMLDivElement>(null);

  // Pre-filter metadata
  //
  // If we have word matches longer than shogi metadata we drop the shogi
  // metadata because the shogi shorthand in particular can turn up false
  // positives on words like ドクター and ドキュメンテーション.
  let meta = props.meta;
  if (meta?.type === 'shogi' && props.matchLen >= meta.matchLen) {
    meta = undefined;
  }

  const numNames = props.namePreview?.names.length ?? 0;
  const totalEntries = entries.length + numNames;
  const selectedIndex = getSelectedIndex(props.copyState, totalEntries);

  const lastPointerType = useRef('touch');
  let longestMatch = 0;

  const gapClassMap: Record<FontSize, string> = {
    normal: 'tp:gap-1',
    large: 'tp:gap-1.5',
    xl: 'tp:gap-2',
  };
  const gap = gapClassMap[fontSize || 'normal'];

  return (
    <div class={classes('tp:flex tp:flex-col tp:my-2', gap)} ref={wordTable}>
      {props.title && (
        <div
          class={classes(
            'tp:bg-(--title-bg) tp:text-(--title-fg) tp:text-2xs',
            'tp:-my-2 tp:mb-0.5 tp:py-2 tp:px-4 tp:snap-start tp:scroll-mt-2',
            'tp:truncate'
          )}
          lang="ja"
        >
          {props.title}
        </div>
      )}

      {meta && (
        <MetadataContainer
          isCombinedResult
          matchLen={props.matchLen}
          meta={meta}
          fxData={props.config.fx}
          preferredUnits={props.config.preferredUnits}
        />
      )}

      {props.namePreview && (
        <NamePreview
          namePreview={props.namePreview}
          selectedIndex={selectedIndex}
          copyState={props.copyState}
          onStartCopy={props.onStartCopy}
        />
      )}

      {entries.map((entry, index) => {
        // Work out where the fold is so we can make later entries appear in the
        // scrolled-out-of-view range.
        const matchLength = Math.max(
          ...entry.k
            .filter((k) => k.matchRange)
            .map((k) => k.matchRange![1] - k.matchRange![0]),
          ...entry.r
            .filter((r) => r.matchRange)
            .map((r) => r.matchRange![1] - r.matchRange![0]),
          0
        );
        let addFoldPoint = false;
        if (matchLength < longestMatch) {
          addFoldPoint = true;
          // Prevent adding any more fold points
          longestMatch = -Infinity;
        } else if (!longestMatch) {
          longestMatch = matchLength;
        }

        let selectState: 'unselected' | 'selected' | 'flash' = 'unselected';
        if (index === selectedIndex - numNames) {
          selectState =
            props.copyState.kind === 'active' ? 'selected' : 'flash';
        }

        return (
          <Fragment key={entry.id}>
            {addFoldPoint && <div class="fold-point tp:contents" />}

            <WordEntry
              entry={entry}
              config={props.config}
              selectState={selectState}
              onPointerUp={(evt) => {
                lastPointerType.current = evt.pointerType;
              }}
              onClick={(evt) => {
                if (
                  wordTable.current &&
                  containerHasSelectedText(wordTable.current)
                ) {
                  return;
                }

                // Don't trigger copy mode if we clicked a nested link
                if (evt.target instanceof HTMLAnchorElement) {
                  return;
                }

                const trigger =
                  lastPointerType.current === 'mouse' ? 'mouse' : 'touch';
                props.onStartCopy?.(index + numNames, trigger);
              }}
            />
          </Fragment>
        );
      })}

      {more && <div class="tp:px-4">…</div>}
    </div>
  );
};
