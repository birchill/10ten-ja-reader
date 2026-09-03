import { useFixtureSelect } from 'react-cosmos/client';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import { TtsPlayButton } from './TtsPlayButton';

type FixtureKind = 'idle' | 'loading' | 'playing' | 'error';

export default {
  default: () => {
    const [kind] = useFixtureSelect<FixtureKind>('state', {
      options: ['idle', 'loading', 'playing', 'error'],
    });

    const state = states[kind];
    const controller = {
      state,
      subscribe: (listener: (next: TtsPlaybackState) => void) => {
        listener(state);
        return () => {};
      },
      toggle: () => {},
    };

    return (
      <div class="tp:p-4 tp:hover:bg-(--hover-bg) tp:hover:[--tts-highlight:var(--selected-highlight)]">
        <div class="tp:space-x-4 tp:text-xl" lang="ja">
          <span class="tp:text-(--reading-highlight)">ひ</span>
          <TtsPlayButton controller={controller} entryIndex={0} />
        </div>
      </div>
    );
  },
};

const states: Record<FixtureKind, TtsPlaybackState> = {
  idle: { kind: 'idle' },
  loading: {
    kind: 'loading',
    activeEntryIndex: 0,
    readingIndex: 0,
    audioStarted: false,
  },
  playing: {
    kind: 'playing',
    activeEntryIndex: 0,
    readingIndex: 0,
    startedAt: 0,
  },
  error: { kind: 'error', activeEntryIndex: 0 },
};
