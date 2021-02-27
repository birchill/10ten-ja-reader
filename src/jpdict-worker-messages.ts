import { JpdictState } from './jpdict';

import { serializeError } from './serialize-error';

export const queryState = () => ({ type: <const>'querystate' });

export const updateDb = ({
  lang,
  force,
}: {
  lang: string;
  force: boolean;
}) => ({
  type: <const>'update',
  lang,
  force,
});

export const cancelDbUpdate = () => ({ type: <const>'cancelupdate' });

export const deleteDb = () => ({ type: <const>'delete' });

export const notifyDbStateUpdated = (state: JpdictState) => ({
  type: <const>'dbstateupdated',
  state,
});

export const notifyDbUpdateComplete = (lastCheck: Date | null) => ({
  type: <const>'dbupdatecomplete',
  lastCheck,
});

export const leaveBreadcrumb = ({ message }: { message: string }) => ({
  type: <const>'breadcrumb',
  message,
});

export const notifyError = ({
  error,
  severity = <const>'error',
}: {
  error: Error;
  severity?: 'error' | 'warning';
}) => ({
  type: <const>'error',
  severity,
  ...serializeError(error),
});

export type JpdictWorkerMessage =
  | ReturnType<typeof queryState>
  | ReturnType<typeof updateDb>
  | ReturnType<typeof cancelDbUpdate>
  | ReturnType<typeof deleteDb>
  | ReturnType<typeof notifyDbStateUpdated>
  | ReturnType<typeof notifyDbUpdateComplete>
  | ReturnType<typeof leaveBreadcrumb>
  | ReturnType<typeof notifyError>;
