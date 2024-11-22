import type { KanjiResult } from '@birchill/jpdict-idb';
import { useRef } from 'preact/hooks';

import type { ReferenceAbbreviation } from '../../../common/refs';
import { classes } from '../../../utils/classes';

import { usePopupOptions } from './../options-context';
import { containerHasSelectedText } from './../selection';
import type { StartCopyCallback } from './../show-popup';
import { KanjiInfo } from './KanjiInfo';
import { KanjiReferencesTable } from './KanjiReferencesTable';
import { KanjiStrokeAnimation } from './KanjiStrokeAnimation';

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

  return (
    <div
      class={classes(
        'tp-flex tp-flex-col tp-gap-3.5 tp-px-5 tp-py-3',
        // Set the -selected / -flash class since we use that we scroll into
        // view any selected item during / after copying.
        //
        // Once everything is converted to Preact we hopefully won't need this
        // anymore (since we'll do minimal DOM updates) but if we do, then we
        // should prefer using a data attribute to a CSS class.
        props.selectState === 'selected' && '-selected',
        props.selectState === 'flash' && '-flash'
      )}
      ref={kanjiTable}
    >
      <div class="tp-flex tp-items-start tp-gap-[20px]">
        <KanjiCharacter
          c={props.entry.c}
          onClick={(trigger) => {
            if (containerHasSelectedText(kanjiTable.current!)) {
              return;
            }

            props.onStartCopy?.(props.index, trigger);
          }}
          selectState={props.selectState}
          st={props.entry.st}
        />
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

type KanjiCharacterProps = {
  c: string;
  onClick?: (trigger: 'touch' | 'mouse') => void;
  selectState: 'unselected' | 'selected' | 'flash';
  st?: string;
};

function KanjiCharacter(props: KanjiCharacterProps) {
  const { interactive } = usePopupOptions();

  // There's no way to trigger the animation when we're not in "mouse
  // interactive" mode so just show the static character in that case.
  return props.st && interactive ? (
    <KanjiStrokeAnimation
      onClick={props.onClick}
      selectState={props.selectState}
      st={props.st}
    />
  ) : (
    <StaticKanjiCharacter
      c={props.c}
      onClick={props.onClick}
      selectState={props.selectState}
    />
  );
}

function StaticKanjiCharacter(props: KanjiCharacterProps) {
  const lastPointerType = useRef<string>('touch');
  const { interactive } = usePopupOptions();

  return (
    <div
      class={classes(
        'tp-text-[--primary-highlight] tp-text-big-kanji tp-text-center tp-pt-2 tp-rounded-md',
        '[text-shadow:var(--shadow-color)_1px_1px_4px]',
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
        const trigger = lastPointerType.current === 'mouse' ? 'mouse' : 'touch';
        props.onClick?.(trigger);
      }}
    >
      {props.c}
    </div>
  );
}
