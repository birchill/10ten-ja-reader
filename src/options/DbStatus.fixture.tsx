import type { JpdictState } from '../background/jpdict';
import { DbStatus } from './DbStatus';

import './options.css';

const EMPTY_DB_STATE: JpdictState = {
  words: {
    state: 'empty',
    version: null,
  },
  kanji: {
    state: 'empty',
    version: null,
  },
  radicals: {
    state: 'empty',
    version: null,
  },
  names: {
    state: 'empty',
    version: null,
  },
  updateState: {
    type: 'idle',
    lastCheck: null,
  },
};

export default {
  offline: () => (
    <DbStatus
      dbState={{
        ...EMPTY_DB_STATE,
        updateError: { name: 'OfflineError', message: 'Offline' },
      }}
    />
  ),
  'quota exceeded': () => (
    <DbStatus
      dbState={{
        ...EMPTY_DB_STATE,
        updateError: { name: 'QuotaExceededError', message: 'Quota exceeded' },
      }}
    />
  ),
  initializing: () => (
    <DbStatus
      dbState={{
        ...EMPTY_DB_STATE,
        words: {
          state: 'init',
          version: null,
        },
      }}
    />
  ),
  empty: () => <DbStatus dbState={EMPTY_DB_STATE} />,
  unavailable: () => (
    <DbStatus
      dbState={{
        ...EMPTY_DB_STATE,
        words: {
          state: 'unavailable',
          version: null,
        },
      }}
    />
  ),
  'up to date': () => (
    <DbStatus
      dbState={{
        words: {
          state: 'ok',
          version: {
            major: 1,
            minor: 0,
            patch: 0,
            dateOfCreation: '2023-10-10',
            lang: 'en',
          },
        },
        kanji: {
          state: 'ok',
          version: {
            major: 1,
            minor: 0,
            patch: 0,
            dateOfCreation: '2023-10-10',
            lang: 'en',
          },
        },
        radicals: {
          state: 'ok',
          version: {
            major: 1,
            minor: 0,
            patch: 0,
            dateOfCreation: '2023-10-10',
            lang: 'en',
          },
        },
        names: {
          state: 'ok',
          version: {
            major: 1,
            minor: 0,
            patch: 0,
            dateOfCreation: '2023-10-10',
            lang: 'en',
          },
        },
        updateState: {
          type: 'idle',
          lastCheck: null,
        },
      }}
    />
  ),
};
