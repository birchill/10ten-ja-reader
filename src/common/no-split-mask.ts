// A 32-bit unsigned bitmask where each bit represents whether the text may not
// be split between the code unit at that offset and the next one.
//
// For example, for the string "ab", bit 0 represents whether the text may be
// split between "a" and "b". A set bit means "do not split here".
//
// This representation is only good for texts up to 32 code units long, since a
// length-N string requires N - 1 bits.
export type NoSplitMask = number;

const MAX_NO_SPLIT_MASK_BITS = 32;

export function assertNoSplitMaskLength(length: number) {
  console.assert(
    length <= MAX_NO_SPLIT_MASK_BITS,
    `NoSplitMask only supports up to ${MAX_NO_SPLIT_MASK_BITS} code units`
  );
}

export function addRangeToNoSplitMask(
  mask: NoSplitMask,
  start: number,
  end: number
): NoSplitMask {
  console.assert(start >= 0, 'NoSplitMask range start should be >= 0');
  console.assert(end > start, 'NoSplitMask range end should be > start');
  assertNoSplitMaskLength(end);

  for (let offset = start; offset < end - 1; ++offset) {
    mask |= 1 << offset;
  }
  return mask >>> 0;
}

export function addNoSplitPoint(
  mask: NoSplitMask,
  offset: number
): NoSplitMask {
  console.assert(offset >= 0, 'NoSplitMask offset should be >= 0');
  assertNoSplitMaskLength(offset + 2);
  return (mask | (1 << offset)) >>> 0;
}

export function isNoSplitPoint(
  mask: NoSplitMask | undefined,
  // Represents the offset to check if we can split _before_.
  //
  // i.e. this function returns true if we should not split _before_ this code
  // unit offset.
  offset: number
): boolean {
  if (!mask || offset <= 0) {
    return false;
  }

  assertNoSplitMaskLength(offset + 1);
  return (mask & (1 << (offset - 1))) !== 0;
}
