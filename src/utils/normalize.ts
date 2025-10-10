import { halfToFullWidthNum, toNormalized } from '@birchill/normal-jp';

// This method returns an array of input lengths which use 16-bit character
// offsets as opposed to Unicode codepoints.
//
// That allows us to use .length, .substring etc. on the matched string.
// If we make this return the positions of Unicode codepoints we will need to
// update all users of this output to be non-BMP character aware.
function normalize(
  input: string,
  {
    makeNumbersFullWidth = true,
    stripZwnj = true,
  }: { makeNumbersFullWidth?: boolean; stripZwnj?: boolean } = {}
): [string, Array<number>] {
  let normalized = input;

  // Convert to full-width, normalize decomposed characters, expand combined
  // characters etc.
  if (makeNumbersFullWidth) {
    normalized = halfToFullWidthNum(normalized);
  }

  let inputLengths: Array<number>;
  [normalized, inputLengths] = toNormalized(normalized);

  // Strip out any zero-width non-joiners (as Google Docs sometimes likes to
  // stick them between every single character).
  if (stripZwnj) {
    [normalized, inputLengths] = doStripZwnj(normalized, inputLengths);
  }

  return [normalized, inputLengths];
}

export function normalizeInput(input: string): [string, Array<number>] {
  return normalize(input);
}

export function normalizeContext(input: string): [string, Array<number>] {
  return normalize(input, { makeNumbersFullWidth: false });
}

function doStripZwnj(
  input: string,
  inputLengths: Array<number>
): [string, Array<number>] {
  let normalized = '';
  const lengths: Array<number> = [];

  let last = 0;
  for (let i = 0; i < input.length; ++i) {
    if (input.codePointAt(i) !== 0x200c) {
      normalized += input[i];
      lengths.push(inputLengths[i]);
      last = inputLengths[i + 1];
    }
  }

  if (last) {
    lengths.push(last);
  }

  return [normalized, lengths];
}
