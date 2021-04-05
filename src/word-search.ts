import { PartOfSpeech } from '@birchill/hikibiki-data';

import {
  deinflect,
  deinflectL10NKeys,
  CandidateWord,
  WordType,
} from './deinflect';
import { toRomaji } from './romaji';
import {
  DictionaryWordResult,
  WordResult,
  WordSearchResult,
} from './search-result';
import { endsInYoon } from './yoon';

export type GetWordsFunction = (params: {
  input: string;
  maxResults: number;
}) => Promise<Array<DictionaryWordResult>>;

export async function wordSearch({
  getWords,
  input,
  inputLengths,
  maxResults,
  includeRomaji,
}: {
  getWords: GetWordsFunction;
  input: string;
  inputLengths: Array<number>;
  maxResults: number;
  includeRomaji: boolean;
}): Promise<WordSearchResult | null> {
  let longestMatch: number = 0;

  let have: Set<number> = new Set();

  let result: WordSearchResult = {
    type: 'words',
    data: [],
    more: false,
    matchLen: 0,
  };

  while (input.length) {
    // If we include a de-inflected substring we show it in the reasons string.
    const showInflections = !!result.data.length;
    const candidates: Array<CandidateWord> = deinflect(input);

    for (const [candidateIndex, candidate] of candidates.entries()) {
      let matches = await getWords({ input: candidate.word, maxResults });

      // Drop matches we already have in our result
      matches = matches.filter((match) => !have.has(match.id));

      // The first candidate is the full string, anything after that is a
      // possible deinflection.
      //
      // The deinflection code, however, doesn't know anything about the actual
      // words. It just produces possible deinflections along with a type that
      // says what kind of a word (e.g. godan verb, i-adjective etc.) it must be
      // in order for that deinflection to be valid.
      //
      // So, if we have a possible deinflection, we need to check that it
      // matches the kind of word we looked up.
      matches = matches.filter(
        (match) =>
          candidateIndex === 0 || entryMatchesType(match, candidate.type)
      );

      if (!matches.length) {
        continue;
      }

      // Now that we have filtered our set of matches to those we plan to keep
      // update our duplicates set.
      have = new Set([...have, ...matches.map((match) => match.id)]);

      // And now that we know we will add at least one entry for this candidate
      // we can update our longest match length.
      longestMatch = Math.max(longestMatch, inputLengths[input.length]);

      // Generate the reason string
      let reason: string | undefined;
      if (candidate.reasons.length) {
        reason =
          '< ' +
          candidate.reasons
            .map((reasonList) =>
              reasonList
                .map((reason) =>
                  browser.i18n.getMessage(deinflectL10NKeys[reason])
                )
                .join(' < ')
            )
            .join(browser.i18n.getMessage('deinflect_alternate'));
        if (showInflections) {
          reason += ` < ${input}`;
        }
      }

      // Process each match into a suitable result
      for (const match of matches) {
        const wordResult: WordResult = {
          ...match,
          reason,
        };

        if (includeRomaji) {
          wordResult.romaji = match.r.map((r) => toRomaji(r.ent));
        }

        result.data.push(wordResult);

        if (result.data.length >= maxResults) {
          result.more = true;
          break;
        }
      }
    }

    if (result.data.length >= maxResults) {
      break;
    }

    // Shorten input, but don't split a ようおん (e.g. きゃ).
    const lengthToShorten = endsInYoon(input) ? 2 : 1;
    input = input.substr(0, input.length - lengthToShorten);
  }

  if (!result.data.length) {
    return null;
  }

  result.matchLen = longestMatch;
  return result;
}

// Tests if a given entry matches the type of a generated deflection
function entryMatchesType(entry: DictionaryWordResult, type: number): boolean {
  const hasMatchingSense = (test: (pos: PartOfSpeech) => boolean) =>
    entry.s.some((sense) => sense.pos?.some(test));

  if (
    type & WordType.IchidanVerb &&
    hasMatchingSense((pos) => pos.startsWith('v1'))
  ) {
    return true;
  }

  if (
    type & WordType.GodanVerb &&
    hasMatchingSense((pos) => pos.startsWith('v5') || pos.startsWith('v4'))
  ) {
    return true;
  }

  if (
    type & WordType.IAdj &&
    hasMatchingSense((pos) => pos.startsWith('adj-i'))
  ) {
    return true;
  }

  if (type & WordType.KuruVerb && hasMatchingSense((pos) => pos === 'vk')) {
    return true;
  }

  if (
    type & WordType.SuruVerb &&
    hasMatchingSense((pos) => pos.startsWith('vs-'))
  ) {
    return true;
  }

  if (type & WordType.NounVS && hasMatchingSense((pos) => pos === 'vs')) {
    return true;
  }

  return false;
}
