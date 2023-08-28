import { halfToFullWidthNum, toNormalized } from '@birchill/normal-jp';

// This method returns an array of input lengths which use 16-bit character
// offsets as opposed to Unicode codepoints.
//
// That allows us to use .length, .substring etc. on the matched string.
// If we make this return the positions of Unicode codepoints we will need to
// update all users of this output to be non-BMP character aware.
export function normalizeInput(input: string): [string, number[]] {
  // Convert to full-width, normalize decomposed characters, expand combined
  // characters etc.
  const fullWidthInput = halfToFullWidthNum(input);
  let [normalized, inputLengths] = toNormalized(fullWidthInput);

  // Strip out any zero-width non-joiners (as Google Docs sometimes likes to
  // stick them between every single character).
  [normalized, inputLengths] = stripZwnj(normalized, inputLengths);

  // Truncate if we find characters outside the expected range.
  for (let i = 0; i < fullWidthInput.length; ++i) {
    const char = fullWidthInput.codePointAt(i)!;
    // If we find a character out of range, we need to trim both normalized
    // and inputLengths
    if (
      (char <= 0x2e80 && char != 0x200c) ||
      (char >= 0x3000 && char <= 0x3002)
    ) {
      let outputIndex = 0;
      while (inputLengths[outputIndex] < i) {
        outputIndex++;
      }
      normalized = normalized.substring(0, outputIndex);
      inputLengths = inputLengths.slice(0, outputIndex ? outputIndex + 1 : 0);
      break;
    }
  }

  return [normalized, inputLengths];
}

function stripZwnj(
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
