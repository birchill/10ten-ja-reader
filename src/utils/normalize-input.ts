import { toNormalized, halfToFullWidthNum } from '@birchill/normal-jp';

export function normalizeInput(input: string): [string, number[]] {
  // Convert to full-width, normalize decomposed characters, expand combined
  // characters etc.
  const fullWidthInput = halfToFullWidthNum(input);
  let [normalized, inputLengths] = toNormalized(
    halfToFullWidthNum(fullWidthInput)
  );

  // Strip out any zero-width non-joiners (as Google Docs sometimes likes to
  // stick them between every single character).
  [normalized, inputLengths] = stripZwnj(normalized, inputLengths);

  // Truncate if we find characters outside the expected range.
  for (let i = 0; i < [...fullWidthInput].length; ++i) {
    const char = fullWidthInput.codePointAt(i)!;
    // If we find a character out of range, we need to trim both normalized
    // and inputLengths
    if (char <= 0x3002 && char != 0x200c) {
      let outputIndex = 0;
      while (inputLengths[outputIndex] < i) {
        outputIndex++;
      }
      normalized = normalized.substr(0, outputIndex);
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
  let normalized: string = '';
  let lengths: Array<number> = [];

  const chars = [...input];
  let last = 0;
  for (let i = 0; i < chars.length; ++i) {
    if (input.codePointAt(i) !== 0x200c) {
      normalized += chars[i];
      lengths.push(inputLengths[i]);
      last = inputLengths[i + 1];
    }
  }

  if (last) {
    lengths.push(last);
  }

  return [normalized, lengths];
}
