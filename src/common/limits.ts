// Shared limits to keep content/background work bounded.

// Max length of text to lookup.
//
// This should be enough for most (but not all) entries for now.
//
// See https://github.com/birchill/10ten-ja-reader/issues/319#issuecomment-655545971
// for a snapshot of the entry lengths by frequency.
//
// Once we have switched all databases to IndexedDB, we should investigate the
// performance impact of increasing this further.
export const MAX_LOOKUP_LENGTH = 16;

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
