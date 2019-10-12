import {
  CheckingUpdateState,
  DownloadError,
  DownloadingUpdateState,
  IdleUpdateState,
  OfflineUpdateState,
  UpdatingDbUpdateState,
  UpdateState,
} from '@birchill/hikibiki-sync';

// Error objects can't be cloned so we provide a variation that is suitable for
// postMessaging.

export type CloneableErrorUpdateState = {
  state: 'error';
  dbName: 'kanjidb' | 'bushudb';
  error: {
    name: string;
    message: string;
    code?: number;
  };
  lastCheck: Date | null;
  nextRetry?: Date;
  retryIntervalMs?: number;
};

export type CloneableUpdateState =
  | CheckingUpdateState
  | DownloadingUpdateState
  | IdleUpdateState
  | OfflineUpdateState
  | UpdatingDbUpdateState
  | CloneableErrorUpdateState;

// Turn the object into something we can postMessage
export const toCloneableUpdateState = (
  state: UpdateState
): CloneableUpdateState => {
  if (state.state === 'error') {
    return {
      ...state,
      error: {
        name: state.error.name,
        message: state.error.message,
        code:
          state.error instanceof DownloadError ? state.error.code : undefined,
      },
    };
  }

  return state;
};
