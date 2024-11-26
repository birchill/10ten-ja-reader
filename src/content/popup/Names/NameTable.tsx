import { useRef } from 'preact/hooks';

import type { NameResult } from '../../../background/search-result';
import { ContentConfigParams } from '../../../common/content-config-params';
import { classes } from '../../../utils/classes';

import { SelectionMeta } from '../../meta';

import { MetadataContainer } from '../Metadata/MetadataContainer';
import { CopyState } from '../copy-state';
import { getSelectedIndex } from '../selected-index';
import { containerHasSelectedText } from '../selection';
import type { StartCopyCallback } from '../show-popup';

import { NameEntry } from './NameEntry';

export type NameTableProps = {
  entries: Array<NameResult>;
  matchLen: number;
  more: boolean;
  fxData: ContentConfigParams['fx'];
  preferredUnits: 'metric' | 'imperial';
  meta?: SelectionMeta;
  copyState: CopyState;
  onStartCopy?: StartCopyCallback;
};

export const NameTable = (props: NameTableProps) => {
  const { entries, more } = props;

  const namesTable = useRef<HTMLDivElement>(null);

  const lastPointerType = useRef('touch');
  const selectedIndex = getSelectedIndex(props.copyState, entries.length);

  return (
    <div
      class={classes('tp-my-2', entries.length > 4 ? 'tp-columns-2' : '')}
      ref={namesTable}
    >
      <div style={{ 'column-span': 'all' }}>
        {props.meta && (
          <MetadataContainer
            fxData={props.fxData}
            preferredUnits={props.preferredUnits}
            isCombinedResult
            matchLen={props.matchLen}
            meta={props.meta}
          />
        )}
      </div>

      {entries.map((entry, index) => {
        let selectState: 'unselected' | 'selected' | 'flash' = 'unselected';
        if (index === selectedIndex) {
          selectState =
            props.copyState.kind === 'active' ? 'selected' : 'flash';
        }

        return (
          <NameEntry
            key={index}
            entry={entry}
            selectState={selectState}
            onPointerUp={(evt) => {
              lastPointerType.current = evt.pointerType;
            }}
            onClick={() => {
              if (
                namesTable.current &&
                containerHasSelectedText(namesTable.current)
              ) {
                return;
              }

              const trigger =
                lastPointerType.current === 'mouse' ? 'mouse' : 'touch';
              props.onStartCopy?.(index, trigger);
            }}
          />
        );
      })}
      {more && <span class="tp-px-4">…</span>}
    </div>
  );
};
