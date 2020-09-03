import { JpdictState } from './jpdict';

export const notifyDbStateUpdated = (state: JpdictState) => ({
  type: <const>'dbstateupdated',
  state,
});

export type DbStateUpdatedMessage = ReturnType<typeof notifyDbStateUpdated>;

export const updateDb = () => ({
  type: <const>'updatedb',
});

export const cancelDbUpdate = () => ({
  type: <const>'cancelupdatedb',
});

export const deleteDb = () => ({
  type: <const>'deletedb',
});

export const reportError = (message: string) => ({
  type: <const>'reporterror',
  message,
});

export type DbListenerMessage =
  | ReturnType<typeof notifyDbStateUpdated>
  | ReturnType<typeof updateDb>
  | ReturnType<typeof cancelDbUpdate>
  | ReturnType<typeof deleteDb>
  | ReturnType<typeof reportError>;
