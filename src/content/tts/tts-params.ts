import type { MajorDataSeries } from '@birchill/jpdict-idb';

import type { NameResult, WordResult } from '../../background/search-result';
import { getDisplayedKana } from '../../common/displayed-kana';
import type { TtsClipRequest } from '../../common/tts/tts-request';

import type { TtsEntry } from '../tts-playback-controller';

import { getAccentPos } from './reading-tokens';

// The parts of a `QueryResult` that carry readings we can play.
export type TtsEntrySource = {
  words?: { data: Array<WordResult> } | null;
  names?: { data: Array<NameResult> } | null;
  namePreview?: { names: Array<NameResult> };
};

export function buildTtsEntries(
  dict: MajorDataSeries,
  result: TtsEntrySource | undefined
): Array<TtsEntry> {
  if (dict === 'words') {
    return [
      // The name preview renders above the words, and `getCopyEntry` numbers
      // them the same way. Swap these two and the play key and the copy key
      // pick different rows.
      ...(result?.namePreview?.names ?? []).map((name) => ({
        id: name.id,
        requests: resolveNameTtsParams(name),
      })),
      ...(result?.words?.data ?? []).map((word) => ({
        id: word.id,
        requests: resolveTtsParams(word),
      })),
    ];
  }

  if (dict === 'names') {
    return (result?.names?.data ?? []).map((name) => ({
      id: name.id,
      requests: resolveNameTtsParams(name),
    }));
  }

  return [];
}

export function resolveTtsParams(entry: WordResult): Array<TtsClipRequest> {
  return getDisplayedKana(entry).map((kana) =>
    resolveReadingParams(kana, entry.k)
  );
}

export function resolveNameTtsParams(
  entry: Pick<NameResult, 'k' | 'r'>
): Array<TtsClipRequest> {
  const kanji = entry.k?.[0];
  return entry.r.map((reading) => ({ reading, ...(kanji ? { kanji } : {}) }));
}

function resolveReadingParams(
  kana: WordResult['r'][number],
  kanji: WordResult['k']
): TtsClipRequest {
  const request: TtsClipRequest = { reading: kana.ent };

  const pitchAccentPos = getAccentPos(kana.a);
  if (pitchAccentPos !== undefined) {
    request.pitchAccentPos = pitchAccentPos;
  }

  const playableKanji = resolvePlayableKanji(kanji, kana.app);
  if (playableKanji !== undefined) {
    request.kanji = playableKanji;
  }

  return request;
}

function resolvePlayableKanji(
  kanji: WordResult['k'],
  app: number | undefined
): string | undefined {
  return kanji.find(
    (k, i) =>
      (app === undefined || (app & (1 << i)) !== 0) && !k.i?.includes('sK')
  )?.ent;
}
