import Bugsnag from '@birchill/bugsnag-zero';
import { AbortError, NameResult, getNames } from '@birchill/jpdict-idb';
import { expandChoon, kyuujitaiToShinjitai } from '@birchill/normal-jp';

import { isOnlyDigits } from '../utils/char-range';

import { NameSearchResult } from './search-result';
import { endsInYoon } from './yoon';

export async function nameSearch({
  abortSignal,
  input,
  inputLengths,
  minInputLength,
  maxResults,
}: {
  abortSignal?: AbortSignal;
  input: string;
  inputLengths: Array<number>;
  minInputLength?: number;
  maxResults: number;
}): Promise<NameSearchResult | null> {
  const result: NameSearchResult = {
    type: 'names',
    data: [],
    more: false,
    matchLen: 0,
  };

  // Record the position of existing entries for grouping purposes
  const existingItems = new Map<string, number>();

  // Record which entries we have already seen so we don't try to merge the same
  // entries when matching on variants
  const have = new Set<number>();

  let currentString = input;

  while (currentString.length > 0) {
    // Check if we have been aborted
    if (abortSignal?.aborted) {
      throw new AbortError();
    }

    const currentInputLength = inputLengths[currentString.length];
    if (minInputLength && minInputLength > currentInputLength) {
      break;
    }

    // Don't lookup the input if we only have digits remaining.
    if (isOnlyDigits(input)) {
      break;
    }

    // Expand ー to its various possibilities
    const variations = [currentString, ...expandChoon(currentString)];

    // See if there are any 旧字体 we can convert to 新字体
    const toNew = kyuujitaiToShinjitai(currentString);
    if (toNew !== currentString) {
      variations.push(toNew);
    }

    for (const variant of variations) {
      let names: Array<NameResult>;
      try {
        names = await getNames(variant);
      } catch (e) {
        console.error('Error looking up names', e);
        void Bugsnag.notify(e || '(Error looking up names)');
        return null;
      }

      // Filter out entries we already have
      names = names.filter((name) => !have.has(name.id));
      if (!names.length) {
        continue;
      }

      result.matchLen = Math.max(result.matchLen, currentInputLength);

      for (const name of names) {
        have.add(name.id);

        // We group together entries where the kana readings and translation
        // details are all equal.
        const nameContents = getNameEntryHash(name);

        // Check for an existing entry to combine with
        const existingIndex = existingItems.get(nameContents);
        if (typeof existingIndex !== 'undefined') {
          const existingEntry = result.data[existingIndex];
          if (name.k) {
            if (!existingEntry.k) {
              existingEntry.k = [];
            }
            existingEntry.k.push(...name.k);
          }
        } else {
          result.data.push({ ...name, matchLen: currentInputLength });
          existingItems.set(nameContents, result.data.length - 1);
        }

        if (result.data.length >= maxResults) {
          return result;
        }
      }

      // Unlike word searching, we don't restrict subsequent searches to this
      // variant since if we get a search for オーサカ we want to return matches
      // for _both_ おうさか and おおさか and name entries.
    }

    // Shorten input, but don't split a ようおん (e.g. きゃ).
    const lengthToShorten = endsInYoon(currentString) ? 2 : 1;
    currentString = currentString.substr(
      0,
      currentString.length - lengthToShorten
    );
  }

  if (!result.data.length) {
    return null;
  }

  return result;
}

function getNameEntryHash(name: NameResult): string {
  return (
    name.r.join('-') +
    '#' +
    name.tr
      .map(
        (tr) =>
          `${(tr.type || []).join(',')}-${tr.det.join(',')}${
            tr.cf ? '-' + tr.cf.join(',') : ''
          }`
      )
      .join(';')
  );
}
