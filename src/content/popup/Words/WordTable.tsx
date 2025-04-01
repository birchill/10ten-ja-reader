import { Fragment } from 'preact';
import { useRef } from 'preact/hooks';

import type { WordResult } from '../../../background/search-result';

import { NamePreview } from '../../query';

import { MetadataContainer } from '../Metadata/MetadataContainer';
import { NameEntry } from '../Names/NameEntry';
import { CopyState } from '../copy-state';
import { getSelectedIndex } from '../selected-index';
import { containerHasSelectedText } from '../selection';
import { ShowPopupOptions, StartCopyCallback } from '../show-popup';

import { WordEntry } from './WordEntry';

export type WordTableProps = {
  entries: Array<WordResult>;
  matchLen: number;
  more: boolean;
  namePreview?: NamePreview;
  options: ShowPopupOptions;
  title?: string;
};

export const WordTable = (props: WordTableProps) => {
  const { entries, more } = props;

  const wordTable = useRef<HTMLDivElement>(null);

  // Pre-filter metadata
  //
  // If we have word matches longer than shogi metadata we drop the shogi
  // metadata because the shogi shorthand in particular can turn up false
  // positives on words like ドクター and ドキュメンテーション.
  if (
    props.options.meta?.type === 'shogi' &&
    props.matchLen >= props.options.meta.matchLen
  ) {
    delete props.options.meta;
  }

  const numNames = props.namePreview?.names.length ?? 0;
  const totalEntries = entries.length + numNames;
  const selectedIndex = getSelectedIndex(props.options.copyState, totalEntries);

  const lastPointerType = useRef('touch');
  let longestMatch = 0;

  return (
    <div class="wordlist" ref={wordTable}>
      {props.title && (
        <div class="title" lang="ja">
          {props.title}
        </div>
      )}

      {props.options.meta && (
        <MetadataContainer
          isCombinedResult
          matchLen={props.matchLen}
          meta={props.options.meta}
          fxData={props.options.fxData}
          preferredUnits={props.options.preferredUnits}
        />
      )}

      {props.namePreview && (
        <NamePreviewComponent
          namePreview={props.namePreview}
          copyKind={props.options.copyState.kind}
          onStartCopy={props.options.onStartCopy}
          selectedIndex={selectedIndex}
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
            props.options.copyState.kind === 'active' ? 'selected' : 'flash';
        }

        return (
          <Fragment key={entry.id}>
            {addFoldPoint && <div class="fold-point" />}

            <WordEntry
              entry={entry}
              options={props.options}
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
                props.options.onStartCopy?.(index + numNames, trigger);
              }}
            />
          </Fragment>
        );
      })}

      {more && <div class="more">…</div>}
    </div>
  );
};

function NamePreviewComponent({
  namePreview,
  copyKind,
  onStartCopy,
  selectedIndex,
}: {
  namePreview: NamePreview;
  copyKind: CopyState['kind'];
  onStartCopy?: StartCopyCallback;
  selectedIndex?: number;
}) {
  const namesPreview = useRef<HTMLDivElement>(null);
  const lastPointerType = useRef('touch');

  return (
    <div class="bonus-name" ref={namesPreview}>
      {namePreview.names.map((name, index) => {
        let selectState: 'unselected' | 'selected' | 'flash' = 'unselected';
        if (index === selectedIndex) {
          selectState = copyKind === 'active' ? 'selected' : 'flash';
        }

        return (
          <NameEntry
            key={name.id}
            entry={name}
            selectState={selectState}
            onPointerUp={(evt) => {
              lastPointerType.current = evt.pointerType;
            }}
            onClick={() => {
              if (
                namesPreview.current &&
                containerHasSelectedText(namesPreview.current)
              ) {
                return;
              }

              const trigger =
                lastPointerType.current === 'mouse' ? 'mouse' : 'touch';
              onStartCopy?.(index, trigger);
            }}
          />
        );
      })}

      {namePreview.more && <span class="more">…</span>}
    </div>
  );
}
