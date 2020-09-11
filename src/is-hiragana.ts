export function isHiragana(text: string): boolean {
  return [...text]
    .map((c) => c.codePointAt(0)!)
    .every((c) => (c >= 0x3040 && c <= 0x309f) || c === 0x1b001);
}
