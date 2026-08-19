import type { WordResult } from '../../background/search-result';
import { getDisplayedKana } from '../../common/displayed-kana';
import type { TtsClipRequest } from '../../common/tts/tts-request';

export function resolveTtsParams(entry: WordResult): Array<TtsClipRequest> {
  return getDisplayedKana(entry).map((kana) =>
    resolveReadingParams(kana, entry.k)
  );
}

function resolveReadingParams(
  kana: WordResult['r'][number],
  kanji: WordResult['k']
): TtsClipRequest {
  const request: TtsClipRequest = { reading: kana.ent };

  const pitchAccentPos = resolvePitchAccentPos(kana.a);
  if (pitchAccentPos !== undefined) {
    request.pitchAccentPos = pitchAccentPos;
  }

  const playableKanji = resolvePlayableKanji(kanji, kana.app);
  if (playableKanji !== undefined) {
    request.kanji = playableKanji;
  }

  return request;
}

function resolvePitchAccentPos(
  accent: WordResult['r'][number]['a']
): number | undefined {
  return Array.isArray(accent) ? accent[0]?.i : accent;
}

function resolvePlayableKanji(
  kanji: WordResult['k'],
  app: number | undefined
): string | undefined {
  if (app === undefined) {
    return kanji.find((k) => !k.i?.includes('sK'))?.ent;
  }

  const index = kanji.findIndex(
    (k, i) => app & (1 << i) && !k.i?.includes('sK')
  );
  return index >= 0 ? kanji[index]!.ent : undefined;
}
