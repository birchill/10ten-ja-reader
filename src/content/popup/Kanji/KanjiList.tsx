import type { KanjiResult } from '@birchill/jpdict-idb';
import { Fragment } from 'preact';

import type { ReferenceAbbreviation } from '../../../common/refs';
import { classes } from '../../../utils/classes';

import type { CopyState } from '../copy-state';
import { getSelectedIndex } from '../selected-index';
import type { StartCopyCallback } from '../show-popup';

import { KanjiEntry } from './KanjiEntry';

export type KanjiListProps = {
  copyState: CopyState;
  entries: ReadonlyArray<KanjiResult>;
  kanjiReferences: Array<ReferenceAbbreviation>;
  onStartCopy?: StartCopyCallback;
  showComponents?: boolean;
};

export function KanjiList(props: KanjiListProps) {
  const selectedIndex = getSelectedIndex(props.copyState, props.entries.length);

  return (
    <div
      class={classes(
        'entry-data',
        // Make each kanji item have the same height so that when we scroll the
        // next one into view it fits.
        //
        // (We spell out `1fr` here because Tailwind's `auto-rows-fr` is
        // `minmax(0, 1fr)` which would allow rows to be smaller than their
        // contents.)
        'tp:grid tp:[grid-auto-rows:1fr]',
        // If the list has been expanded, however, there is no need to space the
        // kanji items out evenly.
        'tp:expanded:[grid-auto-rows:auto]'
      )}
    >
      {props.entries.map((entry, i) => (
        <Fragment key={entry.c}>
          {i === 1 && <div class="fold-point tp:contents" />}
          {/* Make sure it's possible to scroll all the way to the bottom of
           * each kanji table. */}
          <div class="tp:snap-start tp:scroll-mb-(--expand-button-allowance)">
            <KanjiEntry
              entry={entry}
              index={i}
              kanjiReferences={props.kanjiReferences}
              onStartCopy={props.onStartCopy}
              selectState={
                selectedIndex === i
                  ? props.copyState.kind === 'active'
                    ? 'selected'
                    : 'flash'
                  : 'unselected'
              }
              showComponents={props.showComponents}
            />
          </div>
        </Fragment>
      ))}
    </div>
  );
}
