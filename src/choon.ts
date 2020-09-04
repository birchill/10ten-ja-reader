export function replaceChoonpu(input: string): string {
  // We don't deal with おー meaning おお. Technically the pronunciation is
  // different. おお as in 大阪 is pronounced as two distinct お sounds,
  // unlike おう which is pronounced as 長音. Still some people do write
  // オーサカ but it's rare enough that we simply don't deal with it yet.
  return input
    .replace(
      /([おこごそぞとどのほぼぽもよょろをうくぐすずつづぬふぶぷむゆゅる])ー/g,
      '$1う'
    )
    .replace(/([あかがさざただなはばぱまやゃらわ])ー/g, '$1あ')
    .replace(/([いきぎしじちぢにひびぴみり])ー/g, '$1い')
    .replace(/([えけげせぜてでねへべぺめれ])ー/g, '$1え');
}
