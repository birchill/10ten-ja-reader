// Shared limits to keep content/background work bounded.

// Max length of text to lookup.
//
// This is long enough for all but ~0.04% of the headwords in the words and
// names databases.
//
// Raising it costs us on every hover, since we look up every substring of the
// input, and the returns drop away quickly: 24 would leave only ~0.008%
// unreachable but takes around 1.5x as long per lookup as 16, against around
// 1.3x for 20.
//
// See https://github.com/birchill/10ten-ja-reader/issues/319 for the analysis.
//
// If we extend this beyond 32, we will need to update the no-split mask type
// to use a bigint instead and deal with the resulting
// serialization issues: custom JSON stringify/parse support and a workaround
// for extension messaging limitations such as converting it to a Uint8Array.
export const MAX_LOOKUP_LENGTH = 20;

// Max number of ー expansions to generate when looking up a substring.
//
// expandChoon returns every combination of お-row long vowel expansion so it
// produces 2^n results for n お-row long vowels. Since we look up every
// substring of the input, an unbounded expansion of a long katakana run costs
// us seconds.
//
// No headword in the words or names databases has more than three お-row long
// vowels (and none longer than 16 code units has more than two), so 2^4 is
// more than enough to expand anything we could actually match.
export const MAX_CHOON_VARIANTS = 16;

// Max number of non-Japanese chars before we give up on translating alt/title
// text.
export const MAX_NON_JP_PREFIX_LENGTH = 500;

// Max number of chars to include after the first Japanese char in alt/title
// (i.e. the longest string we'll try to translate).
export const MAX_ALT_TITLE_JP_CONTEXT_LENGTH = 500;

// Max translate input length (background side).
//
// This is a defense in depth cap in case the content process doesn't
// sufficiently trim the input.
export const MAX_TRANSLATE_INPUT_LENGTH =
  MAX_NON_JP_PREFIX_LENGTH + MAX_ALT_TITLE_JP_CONTEXT_LENGTH;
