import type { JpdictState } from '../background/jpdict';
import { DbStatus } from './DbStatus';

import './options.css';

const now = new Date();

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

const ONE_ZERO_ZERO_DB_STATE: JpdictState = {
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
    lastCheck: now,
  },
};

function CompareDbStatus(
  props: Omit<Parameters<typeof DbStatus>[0], 'oldStyles'>
) {
  return (
    <>
      <DbStatus {...props} />
      <DbStatus {...props} oldStyles />
    </>
  );
}

export default {
  offline: () => (
    <CompareDbStatus
      dbState={{
        ...EMPTY_DB_STATE,
        updateError: { name: 'OfflineError', message: 'Offline' },
      }}
    />
  ),
  'quota exceeded': () => (
    <CompareDbStatus
      dbState={{
        ...EMPTY_DB_STATE,
        updateError: { name: 'QuotaExceededError', message: 'Quota exceeded' },
      }}
    />
  ),
  initializing: () => (
    <CompareDbStatus
      dbState={{
        ...EMPTY_DB_STATE,
        words: {
          state: 'init',
          version: null,
        },
      }}
    />
  ),
  empty: () => <CompareDbStatus dbState={EMPTY_DB_STATE} />,
  unavailable: () => (
    <CompareDbStatus
      dbState={{
        ...EMPTY_DB_STATE,
        words: {
          state: 'unavailable',
          version: null,
        },
      }}
    />
  ),
  'up to date': () => <CompareDbStatus dbState={ONE_ZERO_ZERO_DB_STATE} />,
  checking: () => (
    <CompareDbStatus
      dbState={{
        ...ONE_ZERO_ZERO_DB_STATE,
        updateState: {
          type: 'checking',
          series: 'words',
          lastCheck: now,
        },
      }}
    />
  ),
  updating: () => (
    <CompareDbStatus
      dbState={{
        ...ONE_ZERO_ZERO_DB_STATE,
        updateState: {
          type: 'updating',
          series: 'words',
          fileProgress: 0.5,
          totalProgress: 0.8,
          version: {
            major: 1,
            minor: 0,
            patch: 1,
            dateOfCreation: '2023-10-11',
            lang: 'en',
          },
          lastCheck: now,
        },
      }}
    />
  ),
  'admin controls': () => (
    <CompareDbStatus dbState={ONE_ZERO_ZERO_DB_STATE} forceDevMode />
  ),
};
