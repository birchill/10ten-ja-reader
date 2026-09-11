import type { TtsPlaybackHandle } from '../tts-playback-controller';

import { NameTable } from './Names/NameTable';

export default function NamesPlaybackFixture() {
  const controller: TtsPlaybackHandle = {
    state: { kind: 'idle' },
    subscribe: () => () => {},
    toggle: () => {},
  };

  return (
    <div class="entry-data">
      <NameTable
        entries={[
          {
            id: 1,
            k: ['佐藤'],
            r: ['さとう'],
            tr: [{ det: ['Sato'], type: ['surname'] }],
            matchLen: 2,
          },
        ]}
        matchLen={2}
        more={false}
        copyState={{ kind: 'inactive' }}
        fxData={undefined}
        preferredUnits="metric"
        ttsPlayback={controller}
      />
    </div>
  );
}
