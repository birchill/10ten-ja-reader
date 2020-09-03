import { JpdictState } from './jpdict';

export const queryState = () => ({
  type: 'querystate',
});

export const updateDb = ({
  lang,
  force,
}: {
  lang: string;
  force: boolean;
}) => ({
  type: 'update',
  lang,
  force,
});

export const cancelDbUpdate = () => ({
  type: 'cancelupdate',
});

export const deleteDb = () => ({
  type: 'delete',
});

export const notifyDbStateUpdated = (state: JpdictState) => ({
  type: 'dbstateupdated',
  state,
});

export const notifyError = ({
  error,
  severity = 'error',
}: {
  error: string | Error;
  severity?: 'error' | 'warning' | 'breadcrumb';
}) => ({
  type: 'error',
  error,
  severity,
});

export type JpdictWorkerMessage =
  | ReturnType<typeof queryState>
  | ReturnType<typeof updateDb>
  | ReturnType<typeof cancelDbUpdate>
  | ReturnType<typeof deleteDb>
  | ReturnType<typeof notifyDbStateUpdated>
  | ReturnType<typeof notifyError>;
