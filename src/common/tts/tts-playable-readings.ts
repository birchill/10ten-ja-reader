import { kanaToHiragana, toNormalized } from '@birchill/normal-jp';

import type { TtsClipRequest } from './tts-request';

type IndexedReading = { index: number; accent: number | undefined };
type NonEmptyArray<T> = [T, ...Array<T>];

/**
 * The indices of `readings` that "play all" should voice, in ascending order.
 *
 * Readings that sound alike — katakana/hiragana variants of the same kana, or
 * spellings differing only by a nakaguro — are voiced once. Pitch accent is
 * part of how a reading sounds: sound-alike readings with different accent
 * positions are each voiced, while a reading with no accent data defers to a
 * sound-alike reading that has one.
 */
export function getPlayableReadingIndices(
  readings: ReadonlyArray<TtsClipRequest>
): Array<number> {
  const groups = new Map<string, NonEmptyArray<IndexedReading>>();
  for (const [index, { reading, pitchAccentPos }] of readings.entries()) {
    const kana = phoneticKana(reading);
    const group = groups.get(kana);
    if (group) {
      group.push({ index, accent: pitchAccentPos });
    } else {
      groups.set(kana, [{ index, accent: pitchAccentPos }]);
    }
  }

  // A group that starts later can contain smaller indices than an earlier
  // group's second accent, so flattening in group order alone isn't ascending.
  return [...groups.values()].flatMap(voicedIndices).sort((a, b) => a - b);
}

function phoneticKana(reading: string): string {
  // The nakaguro (・) is a purely orthographic separator with no phonetic
  // value; it's the only such separator that occurs in the reading data.
  return kanaToHiragana(toNormalized(reading)[0]).replaceAll('・', '');
}

function voicedIndices(group: NonEmptyArray<IndexedReading>): Array<number> {
  const firstIndexPerAccent = new Map<number, number>();
  for (const { index, accent } of group) {
    if (accent !== undefined && !firstIndexPerAccent.has(accent)) {
      firstIndexPerAccent.set(accent, index);
    }
  }
  return firstIndexPerAccent.size > 0
    ? [...firstIndexPerAccent.values()]
    : [group[0].index];
}
