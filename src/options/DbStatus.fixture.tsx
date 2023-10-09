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
};
