import { addNoSplitPoint } from '../common/no-split-mask';

// きしちにひみりぎじびぴ + katakana equivalents
const yoonStart = [
  0x304d, 0x3057, 0x3061, 0x306b, 0x3072, 0x307f, 0x308a, 0x304e, 0x3058,
  0x3073, 0x3074, 0x30ad, 0x30b7, 0x30c1, 0x30cb, 0x30d2, 0x30df, 0x30ea,
  0x30ae, 0x30b8, 0x30d3, 0x30d4,
];
// ゃゅょ + katakana equivalents
const smallY = [0x3083, 0x3085, 0x3087, 0x30e3, 0x30e5, 0x30e7];

export function addYoonToNoSplitMask({
  input,
  noSplitMask = 0,
}: {
  input: string;
  noSplitMask?: number;
}): number {
  for (let offset = 0; offset < input.length - 1; ++offset) {
    if (isYoon(input, offset)) {
      noSplitMask = addNoSplitPoint(noSplitMask, offset);
      offset += 1;
    }
  }
  return noSplitMask;
}

function isYoon(input: string, offset: number): boolean {
  const length = input.length;
  return (
    offset >= 0 &&
    offset + 1 < length &&
    yoonStart.includes(input.charCodeAt(offset)) &&
    smallY.includes(input.charCodeAt(offset + 1))
  );
}
