import { addNoSplitPoint } from '../common/no-split-mask';

// きしちにひみりぎじびぴ
const yoonStart = [
  0x304d, 0x3057, 0x3061, 0x306b, 0x3072, 0x307f, 0x308a, 0x304e, 0x3058,
  0x3073, 0x3074,
];
// ゃゅょ
const smallY = [0x3083, 0x3085, 0x3087];

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
