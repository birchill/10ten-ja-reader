import type { JpdictState } from '../background/jpdict';
import { isError } from '../utils/is-error';
import { serializeError } from '../utils/serialize-error';

export const queryState = () => ({ type: 'querystate' as const });

export const updateDb = ({
  lang,
  force,
}: {
  lang: string;
  force: boolean;
}) => ({ type: 'update' as const, lang, force });

export const cancelUpdateDb = () => ({ type: 'cancelupdate' as const });

export const deleteDb = () => ({ type: 'delete' as const });

export const notifyDbStateUpdated = (state: JpdictState) => ({
  type: 'dbstateupdated' as const,
  state,
});

export const notifyDbUpdateComplete = (lastCheck: Date | null) => ({
  type: 'dbupdatecomplete' as const,
  lastCheck,
});

export const leaveBreadcrumb = ({ message }: { message: string }) => ({
  type: 'breadcrumb' as const,
  message,
});

export const notifyError = ({
  error,
  severity = 'error',
}: {
  error: unknown;
  severity?: 'error' | 'warning';
}) => ({
  type: 'error' as const,
  severity,
  ...serializeError(error),
  stack: isError(error) ? error.stack : undefined,
});

export type JpdictEvent =
  | ReturnType<typeof queryState>
  | ReturnType<typeof updateDb>
  | ReturnType<typeof cancelUpdateDb>
  | ReturnType<typeof deleteDb>
  | ReturnType<typeof notifyDbStateUpdated>
  | ReturnType<typeof notifyDbUpdateComplete>
  | ReturnType<typeof leaveBreadcrumb>
  | ReturnType<typeof notifyError>;
