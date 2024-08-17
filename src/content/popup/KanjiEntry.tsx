import type { KanjiResult } from '@birchill/jpdict-idb';
import { useRef } from 'preact/hooks';

import type { ReferenceAbbreviation } from '../../common/refs';
import { classes } from '../../utils/classes';

import { KanjiInfo } from './KanjiInfo';
import { KanjiReferencesTable } from './KanjiReferencesTable';
import { usePopupOptions } from './options-context';
import { containerHasSelectedText } from './selection';
import type { StartCopyCallback } from './show-popup';

export type Props = {
  entry: KanjiResult;
  index: number;
  kanjiReferences: Array<ReferenceAbbreviation>;
  onStartCopy?: StartCopyCallback;
  selectState: 'unselected' | 'selected' | 'flash';
  showComponents?: boolean;
};

export function KanjiEntry(props: Props) {
  const kanjiTable = useRef<HTMLDivElement>(null);
  const lastPointerType = useRef<string>('touch');
  const { interactive } = usePopupOptions();

  return (
    <div
      class="tp-flex tp-flex-col tp-gap-3.5 tp-px-5 tp-py-3"
      ref={kanjiTable}
    >
      <div class="tp-flex tp-gap-[20px]">
        <div
          class={classes(
            'tp-text-[--primary-highlight] tp-text-big-kanji tp-text-center tp-pt-2 tp-rounded-md',
            // XXX Fix shadow for dark theme
            '[text-shadow:rgba(0,0,0,0.2)_1px_1px_4px]',
            ...(interactive
              ? [
                  'hh:hover:tp-text-[--selected-highlight]',
                  'hh:hover:tp-bg-[--hover-bg]',
                  'hh:hover:tp-cursor-pointer',
                  // Fade _out_ the color change
                  'hh:tp-transition-colors hh:interactive:tp-duration-100',
                  'hh:tp-ease-out',
                  'hh:hover:tp-transition-none',
                ]
              : []),
            // Ensure any selection colors are applied before fading in the
            // overlay
            props.selectState === 'selected' &&
              'no-overlay:tp-text-[--selected-highlight] no-overlay:tp-bg-[--selected-bg]',
            // Run the flash animation, but not until the overlay has
            // disappeared.
            props.selectState === 'flash' && 'no-overlay:tp-animate-flash'
          )}
          lang="ja"
          onPointerUp={(evt) => {
            lastPointerType.current = evt.pointerType;
          }}
          onClick={() => {
            if (containerHasSelectedText(kanjiTable.current!)) {
              return;
            }

            const trigger =
              lastPointerType.current === 'mouse' ? 'mouse' : 'touch';
            props.onStartCopy?.(props.index, trigger);
          }}
        >
          {props.entry.c}
        </div>
        <div class="tp-mt-1.5 tp-grow">
          <KanjiInfo {...props.entry} showComponents={props.showComponents} />
        </div>
      </div>
      {!!props.kanjiReferences.length && (
        <div>
          <KanjiReferencesTable
            entry={props.entry}
            kanjiReferences={props.kanjiReferences}
          />
        </div>
      )}
    </div>
  );
}
