import {
  DatabaseState,
  DatabaseVersion,
  UpdateState,
  toCloneableUpdateState,
} from '@birchill/hikibiki-sync';

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
  type: 'updatedb',
});

export const cancelDbUpdate = () => ({
  type: 'cancelupdatedb',
});

export const deleteDb = () => ({
  type: 'deletedb',
});

export type DbListenerMessage =
  | ReturnType<typeof notifyDbStateUpdated>
  | ReturnType<typeof updateDb>
  | ReturnType<typeof cancelDbUpdate>
  | ReturnType<typeof deleteDb>;
