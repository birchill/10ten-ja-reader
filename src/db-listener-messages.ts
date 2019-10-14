import {
  DatabaseState,
  DatabaseVersion,
  UpdateState,
} from '@birchill/hikibiki-sync';

import { toCloneableUpdateState } from './cloneable-update-state';

export interface ResolvedDbVersions {
  kanjidb: DatabaseVersion | null;
  bushudb: DatabaseVersion | null;
}

export const notifyDbStateUpdated = ({
  databaseState,
  updateState,
  versions,
}: {
  databaseState: DatabaseState;
  updateState: UpdateState;
  versions: ResolvedDbVersions;
}) => ({
  type: 'dbstateupdated',
  databaseState,
  updateState: toCloneableUpdateState(updateState),
  versions,
});

export type DbStateUpdatedMessage = ReturnType<typeof notifyDbStateUpdated>;

export const updateDb = () => ({
  type: 'update',
});

export const cancelDbUpdate = () => ({
  type: 'cancelupdate',
});

export type DbListenerMessage =
  | ReturnType<typeof notifyDbStateUpdated>
  | ReturnType<typeof updateDb>
  | ReturnType<typeof cancelDbUpdate>;
