import { CopyType } from '../../common/copy-keys';

export type CopyState =
  | { kind: 'inactive' }
  | {
      kind: 'active';
      index: number;
      // We distinguish between touch and mouse because when interacting using
      // the mouse we want the popup to maintain a minimum height when
      // entering/leaving copy mode so that the cursor doesn't fall outside the
      // window.
      //
      // Although it's possible the user could combine using touch and mouse
      // interaction, for example, it's simpler to just assume one interaction
      // mode (and if we're wrong, they simply end up getting
      // a resized/unresized window).
      mode: 'touch' | 'mouse' | 'keyboard';
    }
  | {
      kind: 'finished';
      type: CopyType;
      index: number;
      mode: 'touch' | 'mouse' | 'keyboard';
    }
  | { kind: 'error'; index: number; mode: 'touch' | 'mouse' | 'keyboard' };

// Convenience method to extract the mode
export function getCopyMode(
  state: CopyState
): Extract<CopyState, { kind: 'active' }>['mode'] | 'n/a' {
  return state.kind !== 'inactive' ? state.mode : 'n/a';
}
