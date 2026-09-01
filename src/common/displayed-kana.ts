import type { WordResult } from '../background/search-result';

export function getDisplayedKana(entry: WordResult): WordResult['r'] {
  const matchedOnKana = entry.r.some((r) => r.matchRange);

  // Normally include only matching kana headwords. If every match is irregular
  // or search-only, also include regular headwords for reference (for example,
  // ふんいき alone, but both ふいんき and the more correct ふんいき).
  const matchedOnIrregularKana =
    matchedOnKana &&
    entry.r.every(
      (r) =>
        !r.match ||
        r.i?.includes('ik') ||
        r.i?.includes('ok') ||
        r.i?.includes('rk') ||
        r.i?.includes('sk')
    );

  return entry.r.filter(
    (r) =>
      !r.i?.includes('sk') &&
      (r.match ||
        (matchedOnIrregularKana &&
          !r.i?.includes('ik') &&
          !r.i?.includes('ok') &&
          !r.i?.includes('rk')))
  );
}
