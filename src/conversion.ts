import { toNormalized, kanaToHiragana } from '@birchill/normal-jp';

export function normalizeInput(input: string): [string, number[]] {
  // Convert to full-width, normalize decomposed characters, expand combined
  // characters etc.
  let [normalized, inputLengths] = toNormalized(input);

  // Convert to hiragana
  //
  // TODO: Move this to where we search the flat file database
  normalized = kanaToHiragana(normalized);

  // Truncate if we find characters outside the expected range.
  for (let i = 0; i < input.length; ++i) {
    // If we find a character out of range, we need to trim both normalized
    // and inputLengths
    if (input.charCodeAt(i) <= 0x3002) {
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
