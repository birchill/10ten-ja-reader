// This is duplicated from hikibiki-data's sorting of entries.
//
// We only use it for sorting in the case where we've fallen back to the
// flat file database so it doesn't need to be perfect or even keep in sync
// with changes to hikibiki-data. It's really just a stop-gap measure.

import { WordResult } from './search-result';

// As with Array.prototype.sort, sorts `results` in-place, but returns the
// result to support chaining.
export function sortMatchesByPriority(
  results: Array<WordResult>
): Array<WordResult> {
  results.sort((a, b) => getPriority(b) - getPriority(a));
  return results;
}

export function getPriority(result: WordResult): number {
  const scores: Array<number> = [0];

  // Scores from kanji readings
  for (const k of result.k || []) {
    if (!k.matchRange || !k.p) {
      continue;
    }

    scores.push(getPrioritySum(k.p));
  }

  // Scores from kana readings
  for (const r of result.r) {
    if (!r.matchRange || !r.p) {
      continue;
    }

    scores.push(getPrioritySum(r.p));
  }

  // Return top score
  return Math.max(...scores);
}

// Produce an overall priority from a series of priority strings.
//
// This should produce a value somewhere in the range 0~67.
//
// In general we report the highest priority, but if we have several priority
// scores we add a decreasing fraction (10%) of the lesser scores as an
// indication that several sources have attested to the priority.
//
// That should typically produce a maximum attainable score of 66.8.
// Having a bounded range like this makes it easier to combine this value with
// other metrics when sorting.
function getPrioritySum(priorities: Array<string>): number {
  const scores = priorities.map(getPriorityScore).sort().reverse();
  return scores.length
    ? scores[0] +
        scores
          .slice(1)
          .reduce(
            (total, score, index) => total + score / Math.pow(10, index + 1),
            0
          )
    : 0;
}

// This assignment is pretty arbitrary however it's mostly used for sorting
// entries where all we need to do is distinguish between the really common ones
// and the obscure academic ones.
//
// Entries with (P) are those ones that are marked with (P) in Edict.
const PRIORITY_ASSIGNMENTS: Map<string, number> = new Map([
  ['i1', 50], // Top 10,000 words minus i2 (from 1998) (P)
  ['i2', 20],
  ['n1', 40], // Top 12,000 words in newspapers (from 2003?) (P)
  ['n2', 20], // Next 12,000
  ['s1', 32], // "Speculative" annotations? Seem pretty common to me. (P)
  ['s2', 20], // (P)
  ['g1', 30], // (P)
  ['g2', 15],
]);

function getPriorityScore(p: string): number {
  if (PRIORITY_ASSIGNMENTS.has(p)) {
    return PRIORITY_ASSIGNMENTS.get(p)!;
  }

  if (p.startsWith('nf')) {
    // The wordfreq scores are groups of 500 words.
    // e.g. nf01 is the top 500 words, and nf48 is the 23,501 ~ 24,000
    // most popular words.
    const wordfreq = parseInt(p.substring(2), 10);
    if (wordfreq > 0 && wordfreq < 48) {
      return 48 - wordfreq / 2;
    }
  }

  return 0;
}
