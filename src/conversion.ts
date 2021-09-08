import { toNormalized, halfToFullWidthNum } from '@birchill/normal-jp';

export function normalizeInput(input: string): [string, number[]] {
  // Convert to full-width, normalize decomposed characters, expand combined
  // characters etc.
  const fullWidthInput = halfToFullWidthNum(input);
  let [normalized, inputLengths] = toNormalized(
    halfToFullWidthNum(fullWidthInput)
  );

  // Truncate if we find characters outside the expected range.
  for (let i = 0; i < fullWidthInput.length; ++i) {
    // If we find a character out of range, we need to trim both normalized
    // and inputLengths
    if (fullWidthInput.charCodeAt(i) <= 0x3002) {
      let outputIndex = 0;
      while (inputLengths[outputIndex] < i) {
        outputIndex++;
      }
      normalized = normalized.substr(0, outputIndex);
      inputLengths = inputLengths.slice(0, outputIndex + 1);
      break;
    }
  }

  return [normalized, inputLengths];
}
