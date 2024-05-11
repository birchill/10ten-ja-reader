import type { CopyState } from './copy-state';

export function getSelectedIndex(copyState: CopyState, numEntries: number) {
  return copyState.kind !== 'inactive' && numEntries
    ? copyState.index % numEntries
    : -1;
}
