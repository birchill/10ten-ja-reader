// This is duplicated from jpdict-idb's sorting of entries.
//
// We use it for sorting:
//
// 1) Between various deinflected results (e.g. so that 進む comes before 進ぶ
//    when looking up 進んでいます), and
//
// 2) In the case where we've fallen back to the flat file database.
//
import type { CandidateWordResult, WordResult } from './search-result';

// As with Array.prototype.sort, sorts `results` in-place, but returns the
// result to support chaining.
export function sortWordResults(
  results: Array<CandidateWordResult>
): Array<CandidateWordResult> {
  const sortMeta: Map<
    number,
    { reasons: number; priority: number; type: number }
  > = new Map();

  for (const result of results) {
    const reasons =
      result.reasonChains?.reduce<number>(
        (max, chain) => Math.max(max, chain.length),
        0
      ) || 0;

    // Determine the headword match type
    //
    // 1 = match on a kanji, or kana which is not just the reading for a kanji
    // 2 = match on a kana reading for a kanji
    const kanaReading = result.r.find((r) => !!r.matchRange);
    const rt = kanaReading ? getKanaHeadwordType(kanaReading, result) : 1;

    // Priority
    const priority = getPriority(result);

    sortMeta.set(result.id, { reasons, priority, type: rt });
  }

  results.sort((a, b) => {
    const metaA = sortMeta.get(a.id)!;
    const metaB = sortMeta.get(b.id)!;

    if (metaA.reasons !== metaB.reasons) {
      return metaA.reasons - metaB.reasons;
    }

    if (metaA.type !== metaB.type) {
      return metaA.type - metaB.type;
    }

    return metaB.priority - metaA.priority;
  });

  return results;
}

function getKanaHeadwordType(
  r: WordResult['r'][number],
  result: WordResult
): 1 | 2 {
  // We don't want to prioritize readings marked as `ok` etc. or else we'll end
  // up prioritizing words like `檜` and `羆` being prioritized when searching
  // for `ひ`.
  const isReadingObscure =
    r.i?.includes('ok') ||
    r.i?.includes('rk') ||
    r.i?.includes('sk') ||
    r.i?.includes('ik');

  if (isReadingObscure) {
    return 2;
  }

  // Kana headwords are type 1 (i.e. they are a primary headword, not just a
  // reading for a kanji headword) if:
  //
  // (a) the entry has no kanji headwords or all the kanji headwords are marked
  //     as `rK`, `sK`, or `iK`.
  if (
    !result.k.length ||
    result.k.every(
      (k) => k.i?.includes('rK') || k.i?.includes('sK') || k.i?.includes('iK')
    )
  ) {
    return 1;
  }

  // (b) most of the English senses for the entry have a `uk` (usually kana)
  //     `misc` field and the reading is not marked as `ok` (old kana usage).
  //
  // We wanted to make the condition here be just one sense being marked as `uk`
  // but then you get words like `梓` being prioritized when searching for `し`
  // because of one sense out of many being usually kana.
  //
  // Furthermore, we don't want to require _all_ senses to be marked as `uk` or
  // else that will mean that 成る fails to be prioritized when searching for
  // `なる` because one sense out of 11 is not marked as `uk`.
  if (mostMatchedEnSensesAreUk(result.s)) {
    return 1;
  }

  // (c) the headword is marked as `nokanji`
  return r.app === 0 ? 1 : 2;
}

function mostMatchedEnSensesAreUk(senses: WordResult['s']): boolean {
  const matchedEnSenses = senses.filter(
    (s) => s.match && (s.lang === undefined || s.lang === 'en')
  );
  if (matchedEnSenses.length === 0) {
    return false;
  }

  const ukEnSenseCount = matchedEnSenses.filter((s) =>
    s.misc?.includes('uk')
  ).length;
  return ukEnSenseCount >= matchedEnSenses.length / 2;
}

function getPriority(result: WordResult): number {
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
