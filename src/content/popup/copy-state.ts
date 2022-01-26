import { CopyType } from '../../common/copy-keys';

export type CopyState =
  | {
      kind: 'inactive';
    }
  | {
      kind: 'active';
      index: number;
      mode: 'overlay' | 'keyboard';
    }
  | {
      kind: 'finished';
      type: CopyType;
      index: number;
      mode: 'overlay' | 'keyboard';
    }
  | {
      kind: 'error';
      index: number;
      mode: 'overlay' | 'keyboard';
    };
