import { useRef } from 'preact/hooks';

import { NamePreview as QueryNamePreview } from '../../query';

import { NameEntry } from '../Names/NameEntry';
import { CopyState } from '../copy-state';
import { containerHasSelectedText } from '../selection';
import { StartCopyCallback } from '../show-popup';

export function NamePreview({
  namePreview,
  selectedIndex,
  copyState,
  onStartCopy,
}: {
  namePreview: QueryNamePreview;
  selectedIndex?: number;
  copyState: CopyState;
  onStartCopy?: StartCopyCallback;
}) {
  const namesPreview = useRef<HTMLDivElement>(null);
  const lastPointerType = useRef('touch');

  return (
    <div
      class="tp:mt-2 tp:mb-1 tp:bg-(--meta-bg) tp:snap-start tp:scroll-mt-5"
      ref={namesPreview}
    >
      {namePreview.names.map((name, index) => {
        let selectState: 'unselected' | 'selected' | 'flash' = 'unselected';
        if (index === selectedIndex) {
          selectState = copyState.kind === 'active' ? 'selected' : 'flash';
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

      {namePreview.more && <span class="tp:px-4">…</span>}
    </div>
  );
}
