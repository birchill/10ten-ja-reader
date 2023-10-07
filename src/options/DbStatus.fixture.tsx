import { DbStatus } from './DbStatus';

import '../../css/options.css';

export default {
  offline: () => (
    <DbStatus
      dbState={{
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
        updateError: {
          name: 'OfflineError',
          message: 'Offline',
        },
      }}
    />
  ),
};
