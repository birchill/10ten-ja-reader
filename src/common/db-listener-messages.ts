import { JpdictState } from '../background/jpdict';

export const notifyDbStateUpdated = (state: JpdictState) => ({
  type: 'dbstateupdated' as const,
  state,
});

export type DbStateUpdatedMessage = ReturnType<typeof notifyDbStateUpdated>;

export const updateDb = () => ({ type: 'updatedb' as const });

export const cancelDbUpdate = () => ({ type: 'cancelupdatedb' as const });

export const deleteDb = () => ({ type: 'deletedb' as const });

export type DbListenerMessage =
  | ReturnType<typeof notifyDbStateUpdated>
  | ReturnType<typeof updateDb>
  | ReturnType<typeof cancelDbUpdate>
  | ReturnType<typeof deleteDb>;
