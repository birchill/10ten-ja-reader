import { Fragment } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import browser from 'webextension-polyfill';

import type { WordResult } from '../../../background/search-result';
import type {
  ContentConfigParams,
  FontSize,
} from '../../../common/content-config-params';
import { classes } from '../../../utils/classes';

import type { SelectionMeta } from '../../meta';
import type { NamePreview as QueryNamePreview } from '../../query';

import { MetadataContainer } from '../Metadata/MetadataContainer';
import { extractAnkiFields, mapAnkiFields } from '../anki-fields';
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
  // Anki integration
  ankiEnabled?: boolean;
  ankiDeck?: string;
  ankiNoteType?: string;
  ankiFieldMapping?: Record<string, string>;
  sentence?: string;
  url?: string;
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

  // ---------- Anki integration ----------

  // Map from entry id to noteId (null = not found, number = exists)
  const [ankiNoteIds, setAnkiNoteIds] = useState<Map<number, number | null>>(
    new Map()
  );

  // Whether AnkiConnect is reachable (null = still checking)
  const [ankiConnected, setAnkiConnected] = useState<boolean | null>(null);

  // Set of entry IDs currently being added to Anki
  const [ankiAddingIds, setAnkiAddingIds] = useState<Set<number>>(new Set());

  // Ref that mirrors ankiAddingIds so the sweep effect can read the latest
  // value without re-triggering when the user clicks "Add".
  const ankiAddingIdsRef = useRef(ankiAddingIds);
  ankiAddingIdsRef.current = ankiAddingIds;

  // Map from entry ID to error message (auto-cleared after a timeout)
  const [ankiErrors, setAnkiErrors] = useState<Map<number, string>>(new Map());

  const ankiEnabled = props.ankiEnabled ?? false;
  const ankiDeck = props.ankiDeck ?? '';
  const ankiNoteType = props.ankiNoteType ?? '';
  const ankiFieldMapping = props.ankiFieldMapping ?? {};

  // Check note existence for each entry when popup opens.
  // Also detects whether AnkiConnect is reachable.
  useEffect(() => {
    if (!ankiEnabled || !ankiDeck || !ankiNoteType) {
      setAnkiNoteIds(new Map());
      setAnkiConnected(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      let anySucceeded = false;
      let anyFailed = false;

      // Check all entries in parallel
      const checks = entries.map(async (entry) => {
        const matchingKanji = entry.k.find((k) => k.match);
        const firstKana = entry.r[0];
        const expression =
          matchingKanji?.ent ?? entry.k[0]?.ent ?? firstKana?.ent ?? '';
        const reading = (entry.r.find((r) => r.match) ?? firstKana)?.ent ?? '';

        try {
          const noteId = (await browser.runtime.sendMessage({
            type: 'ankiFindNote',
            deckName: ankiDeck,
            expression,
            reading,
          })) as number | null;
          anySucceeded = true;
          return { id: entry.id, noteId };
        } catch {
          anyFailed = true;
          return { id: entry.id, noteId: null };
        }
      });

      const results = await Promise.all(checks);
      if (cancelled) {
        return;
      }

      // Merge sweep results into existing state rather than replacing it.
      // This avoids overwriting noteIds that were set by a concurrent
      // onAnkiAdd call while the sweep was in flight.
      const addingIds = ankiAddingIdsRef.current;
      setAnkiNoteIds((prev) => {
        const merged = new Map(prev);
        for (const { id, noteId } of results) {
          // Never overwrite a real noteId (from a successful add) with null
          const existing = merged.get(id);
          if (typeof existing === 'number') {
            continue;
          }
          // Don't write null for entries currently being added
          if (noteId === null && addingIds.has(id)) {
            continue;
          }
          merged.set(id, noteId);
        }
        return merged;
      });

      // If all calls failed, Anki is unreachable.
      // If at least one succeeded, it's connected.
      if (anySucceeded) {
        setAnkiConnected(true);
      } else if (anyFailed) {
        setAnkiConnected(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ankiEnabled, ankiDeck, ankiNoteType, entries]);

  const onAnkiAdd = useCallback(
    async (entry: WordResult) => {
      if (!ankiDeck || !ankiNoteType) {
        return;
      }

      // Prevent double-clicks
      if (ankiAddingIds.has(entry.id)) {
        return;
      }

      setAnkiAddingIds((prev) => new Set(prev).add(entry.id));

      // Clear any previous error for this entry
      setAnkiErrors((prev) => {
        if (!prev.has(entry.id)) {
          return prev;
        }
        const next = new Map(prev);
        next.delete(entry.id);
        return next;
      });

      const tentenFields = extractAnkiFields(entry, {
        sentence: props.sentence,
        url: props.url,
      });
      const fields = mapAnkiFields(tentenFields, ankiFieldMapping);

      try {
        const noteId = (await browser.runtime.sendMessage({
          type: 'ankiAddNote',
          deckName: ankiDeck,
          modelName: ankiNoteType,
          fields,
        })) as number;

        // Update state: switch from + to dictionary icon
        setAnkiNoteIds((prev) => {
          const next = new Map(prev);
          next.set(entry.id, noteId);
          return next;
        });
      } catch (e) {
        console.error('[10ten-ja-reader] Failed to add Anki note:', e);

        const message =
          e instanceof Error ? e.message : 'Failed to add note to Anki';
        setAnkiErrors((prev) => {
          const next = new Map(prev);
          next.set(entry.id, message);
          return next;
        });

        // Auto-clear error after 4 seconds
        const entryId = entry.id;
        setTimeout(() => {
          setAnkiErrors((prev) => {
            if (!prev.has(entryId)) {
              return prev;
            }
            const next = new Map(prev);
            next.delete(entryId);
            return next;
          });
        }, 4000);
      } finally {
        setAnkiAddingIds((prev) => {
          const next = new Set(prev);
          next.delete(entry.id);
          return next;
        });
      }
    },
    [
      ankiDeck,
      ankiNoteType,
      ankiFieldMapping,
      ankiAddingIds,
      props.sentence,
      props.url,
    ]
  );

  const onAnkiOpen = useCallback(async (noteId: number, entryId: number) => {
    try {
      await browser.runtime.sendMessage({ type: 'ankiOpenNote', noteId });
    } catch (e) {
      console.error('[10ten-ja-reader] Failed to open Anki note:', e);

      const message =
        e instanceof Error ? e.message : 'Failed to open note in Anki';
      setAnkiErrors((prev) => {
        const next = new Map(prev);
        next.set(entryId, message);
        return next;
      });

      setTimeout(() => {
        setAnkiErrors((prev) => {
          if (!prev.has(entryId)) {
            return prev;
          }
          const next = new Map(prev);
          next.delete(entryId);
          return next;
        });
      }, 4000);
    }
  }, []);

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
              ankiNoteId={
                ankiEnabled && ankiDeck && ankiNoteType
                  ? (ankiNoteIds.get(entry.id) ?? null)
                  : undefined
              }
              ankiConnected={ankiConnected ?? undefined}
              ankiAdding={ankiAddingIds.has(entry.id)}
              ankiError={ankiErrors.get(entry.id)}
              onAnkiAdd={onAnkiAdd}
              onAnkiOpen={onAnkiOpen}
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
