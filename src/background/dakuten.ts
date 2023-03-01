const dakutenToPlain: ReadonlyArray<[string, string]> = [
  ['が', 'か'],
  ['ぎ', 'き'],
  ['ぐ', 'く'],
  ['げ', 'け'],
  ['ご', 'こ'],
  ['ざ', 'さ'],
  ['じ', 'し'],
  ['ず', 'す'],
  ['ぜ', 'せ'],
  ['ぞ', 'そ'],
  ['だ', 'た'],
  ['ぢ', 'ち'],
  ['づ', 'つ'],
  ['で', 'て'],
  ['ど', 'と'],
  ['ば', 'は'],
  ['び', 'ひ'],
  ['ぶ', 'ふ'],
  ['べ', 'へ'],
  ['ぼ', 'ほ'],
  ['ぱ', 'は'],
  ['ぴ', 'ひ'],
  ['ぷ', 'ふ'],
  ['ぺ', 'へ'],
  ['ぽ', 'ほ'],
  ['ゔ', 'う'],
  ['ゞ', 'ゝ'],
];

let dakutenToPlainMap = new Map<string, string>();

export function stripFirstDakuten(input: string): string {
  if (input.length < 1) {
    return input;
  }

  if (!dakutenToPlainMap.size) {
    dakutenToPlainMap = new Map(dakutenToPlain);
  }

  const toPlain = dakutenToPlainMap.get(input[0]);
  if (!toPlain || toPlain === input[0]) {
    return input;
  }

  return toPlain + input.slice(1);
}
