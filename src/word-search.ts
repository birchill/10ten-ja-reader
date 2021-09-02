import { AbortError, PartOfSpeech } from '@birchill/hikibiki-data';
import { expandChoon, kyuujitaiToShinjitai } from '@birchill/normal-jp';
import { browser } from 'webextension-polyfill-ts';

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
  abortSignal,
  getWords,
  input,
  inputLengths,
  maxResults,
  includeRomaji,
}: {
  abortSignal?: AbortSignal;
  getWords: GetWordsFunction;
  input: string;
  inputLengths: Array<number>;
  maxResults: number;
  includeRomaji: boolean;
}): Promise<WordSearchResult | null> {
  let longestMatch = 0;
  let have: Set<number> = new Set();
  let result: WordSearchResult = {
    type: 'words',
    data: [],
    more: false,
    matchLen: 0,
  };
  let includeVariants = true;

  while (input.length) {
    // Check if we have been aborted
    if (abortSignal?.aborted) {
      throw new AbortError();
    }

    // If we include a de-inflected substring we show it in the reasons string.
    const showInflections = !!result.data.length;

    const variations = [input];

    // Generate variations on this substring
    if (includeVariants) {
      // Expand ー to its various possibilities
      variations.push(...expandChoon(input));

      // See if there are any 旧字体 we can convert to 新字体
      const toNew = kyuujitaiToShinjitai(input);
      if (toNew !== input) {
        variations.push(toNew);
      }
    }

    for (const variant of variations) {
      let wordResults = await lookupCandidates({
        abortSignal,
        existingEntries: have,
        getWords,
        input: variant,
        includeRomaji,
        maxResults,
        showInflections,
      });

      if (!wordResults.length) {
        continue;
      }

      // Now that we have filtered our set of matches to those we plan to keep
      // update our duplicates set.
      have = new Set([...have, ...wordResults.map((word) => word.id)]);

      // And now that we know we will add at least one entry for this candidate
      // we can update our longest match length.
      longestMatch = Math.max(longestMatch, inputLengths[input.length]);

      // Process each match into a suitable result
      for (const wordResult of wordResults) {
        result.data.push(wordResult);

        if (result.data.length >= maxResults) {
          result.more = true;
          break;
        }
      }

      // Continue refining this variant excluding all others
      input = variant;
      includeVariants = false;
      break;
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

async function lookupCandidates({
  abortSignal,
  existingEntries,
  getWords,
  includeRomaji,
  input,
  maxResults,
  showInflections,
}: {
  abortSignal?: AbortSignal;
  existingEntries: Set<number>;
  getWords: GetWordsFunction;
  includeRomaji: boolean;
  input: string;
  maxResults: number;
  showInflections: boolean;
}): Promise<Array<WordResult>> {
  const result: Array<WordResult> = [];

  const candidates: Array<CandidateWord> = deinflect(input);
  for (const [candidateIndex, candidate] of candidates.entries()) {
    if (abortSignal?.aborted) {
      throw new AbortError();
    }

    let wordResults = await lookupCandidate({
      candidate,
      getWords,
      includeRomaji,
      originalInput: input,
      isDeinflection: candidateIndex !== 0,
      maxResults,
      showInflections,
    });

    // Drop redundant results
    wordResults = wordResults.filter((word) => !existingEntries.has(word.id));

    result.push(...wordResults);
  }

  return result;
}

async function lookupCandidate({
  candidate,
  getWords,
  includeRomaji,
  originalInput: input,
  isDeinflection,
  maxResults,
  showInflections,
}: {
  candidate: CandidateWord;
  getWords: GetWordsFunction;
  includeRomaji: boolean;
  originalInput: string;
  isDeinflection: boolean;
  maxResults: number;
  showInflections: boolean;
}): Promise<Array<WordResult>> {
  let matches = await getWords({ input: candidate.word, maxResults });

  // The deinflection code doesn't know anything about the actual words. It just
  // produces possible deinflections along with a type that says what kind of a
  // word (e.g. godan verb, i-adjective etc.) it must be in order for that
  // deinflection to be valid.
  //
  // So, if we have a possible deinflection, we need to check that it matches
  // the kind of word we looked up.
  matches = matches.filter(
    (match) => !isDeinflection || entryMatchesType(match, candidate.type)
  );

  if (!matches.length) {
    return [];
  }

  // Generate the reason string
  let reason: string | undefined;
  if (candidate.reasons.length) {
    reason =
      '< ' +
      candidate.reasons
        .map((reasonList) =>
          reasonList
            .map((reason) => browser.i18n.getMessage(deinflectL10NKeys[reason]))
            .join(' < ')
        )
        .join(browser.i18n.getMessage('deinflect_alternate'));
    if (showInflections) {
      reason += ` < ${input}`;
    }
  }

  // Process each match into a suitable result
  const result: Array<WordResult> = [];

  for (const match of matches) {
    const wordResult: WordResult = {
      ...match,
      reason,
    };

    if (includeRomaji) {
      wordResult.romaji = match.r.map((r) => toRomaji(r.ent));
    }

    result.push(wordResult);
  }

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
