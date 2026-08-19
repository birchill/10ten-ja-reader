import type { WordResult } from '@birchill/jpdict-idb';
import { useMemo } from 'preact/hooks';
import { useFixtureSelect } from 'react-cosmos/client';

import type { AccentDisplay } from '../../../common/content-config-params';
import type { MoraTimingData } from '../../../common/tts/tts-request';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import { Reading } from './Reading';
import { TtsReadingOverlay } from './TtsReadingOverlay';

const MS_PER_SOUND = 220;

const SMALL_KANA = new Set('ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ');

const readings: Record<string, WordResult['r'][0]> = {
  'さくら (heiban)': { ent: 'さくら', a: 0, match: true },
  'あめ (atamadaka)': { ent: 'あめ', a: 1, match: true },
  'おとこ (nakadaka)': { ent: 'おとこ', a: 2, match: true },
  'はな (odaka)': { ent: 'はな', a: 2, match: true },
  'きゃく (combined mora)': { ent: 'きゃく', a: 1, match: true },
  'コーヒー (long vowels)': { ent: 'コーヒー', a: 3, match: true },
  'め (one mora)': { ent: 'め', a: 1, match: true },
};

const elapsedFractions: Record<string, number> = {
  'not started': 0,
  'a quarter in': 0.25,
  'half way': 0.5,
  'three quarters in': 0.75,
  finished: 1,
};

export default {
  default: () => {
    const [kind] = useFixtureSelect<'idle' | 'playing'>('playback', {
      options: ['playing', 'idle'],
    });
    const [readingName] = useFixtureSelect('reading', {
      options: Object.keys(readings),
    });
    const [accentDisplay] = useFixtureSelect<AccentDisplay>('accent display', {
      options: ['binary', 'binary-hi-contrast', 'downstep', 'none'],
    });
    const [elapsedName] = useFixtureSelect('elapsed', {
      options: Object.keys(elapsedFractions),
    });

    const kana = readings[readingName];
    const timing = syntheticTiming(kana.ent);

    // The overlay reads the clock once, when it mounts, so backdating the
    // start is how the fixture picks a point in the reading.
    const startedAt = useMemo(
      () =>
        performance.now() -
        elapsedFractions[elapsedName] * timing.totalDurationMs,
      [elapsedName, readingName, accentDisplay, kind]
    );

    const state: TtsPlaybackState =
      kind === 'idle'
        ? { kind: 'idle' }
        : {
            kind: 'playing',
            activeEntryIndex: 0,
            readingIndex: 0,
            moraTiming: timing,
            startedAt,
          };

    const controller = {
      subscribe: (listener: (next: TtsPlaybackState) => void) => {
        listener(state);
        return () => {};
      },
    };

    return (
      <div class="tp:p-4 tp:text-xl tp:text-(--reading-highlight)" lang="ja">
        <span class="tp:inline-grid tp:*:row-start-1 tp:*:col-start-1">
          <span>
            <Reading kana={kana} accentDisplay={accentDisplay} />
          </span>
          <TtsReadingOverlay
            controller={controller}
            entryIndex={0}
            readingIndex={0}
            kana={kana}
            accentDisplay={accentDisplay}
          />
        </span>
        <span class="tp:opacity-60">、そのあと</span>
      </div>
    );
  },
};

function syntheticTiming(reading: string): MoraTimingData {
  const charTimingsMs: Array<number> = [];
  let startMs = 0;

  for (const [index, char] of [...reading].entries()) {
    // The service repeats a mora's timestamp for every codepoint that shares
    // its sound, so a long vowel or a combined mora holds the previous value.
    const sharesPreviousSound =
      char === 'ー' || char === 'ｰ' || SMALL_KANA.has(char);
    if (index > 0 && !sharesPreviousSound) {
      startMs += MS_PER_SOUND;
    }
    charTimingsMs.push(startMs);
  }

  return { charTimingsMs, totalDurationMs: startMs + MS_PER_SOUND };
}
