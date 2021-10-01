// きしちにひみりぎじびぴ
const yoonStart = [
  0x304d, 0x3057, 0x3061, 0x306b, 0x3072, 0x307f, 0x308a, 0x304e, 0x3058,
  0x3073, 0x3074,
];
// ゃゅょ
const smallY = [0x3083, 0x3085, 0x3087];

export function endsInYoon(input: string): boolean {
  const length = [...input].length;
  return (
    length > 1 &&
    smallY.includes(input.codePointAt(length - 1)!) &&
    yoonStart.includes(input.codePointAt(length - 2)!)
  );
}
