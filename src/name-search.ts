import Bugsnag from '@bugsnag/browser';
import { NameResult, getNames } from '@birchill/hikibiki-data';

import { NameSearchResult } from './search-result';
import { endsInYoon } from './yoon';

export async function nameSearch({
  input,
  inputLengths,
  minInputLength,
  maxResults,
}: {
  input: string;
  inputLengths: Array<number>;
  minInputLength?: number;
  maxResults: number;
}): Promise<NameSearchResult | null> {
  let result: NameSearchResult = {
    type: 'names',
    data: [],
    more: false,
    matchLen: 0,
  };

  // Record the position of existing entries for grouping purposes
  let existingItems = new Map<string, number>();

  let currentString = input;
  let longestMatch = 0;

  while (currentString.length > 0) {
    const currentInputLength = inputLengths[currentString.length];
    if (minInputLength && minInputLength > currentInputLength) {
      break;
    }

    let names: Array<NameResult>;
    try {
      names = await getNames(currentString);
    } catch (e) {
      console.error(e);
      Bugsnag.notify(e || '(Error looking up names)');
      return null;
    }

    if (names.length) {
      longestMatch = Math.max(longestMatch, currentInputLength);
    }

    for (const name of names) {
      // We group together entries where the kana readings and translation
      // details are all equal.
      const nameContents =
        name.r.join('-') +
        '#' +
        name.tr
          .map(
            (tr) =>
              `${(tr.type || []).join(',')}-${tr.det.join(',')}${
                tr.cf ? '-' + tr.cf.join(',') : ''
              }`
          )
          .join(';');

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
        break;
      }
    }

    if (result.data.length >= maxResults) {
      break;
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

  result.matchLen = longestMatch;
  return result;
}
