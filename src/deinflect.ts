export const enum DeinflectReason {
  PolitePastNegative,
  PoliteNegative,
  PoliteVolitional,
  Chau,
  Sugiru,
  Nasai,
  PolitePast,
  Tara,
  Tari,
  Causative,
  PotentialOrPassive,
  Sou,
  Tai,
  Polite,
  Past,
  Negative,
  Passive,
  Ba,
  Volitional,
  Potential,
  CausativePassive,
  Te,
  Zu,
  Imperative,
  MasuStem,
  Adv,
  Noun,
  ImperativeNegative,
}

export const deinflectL10NKeys: { [key: number]: string } = {
  [DeinflectReason.PolitePastNegative]: 'deinflect_polite_past_negative',
  [DeinflectReason.PoliteNegative]: 'deinflect_polite_negative',
  [DeinflectReason.PoliteVolitional]: 'deinflect_polite_volitional',
  [DeinflectReason.Chau]: 'deinflect_chau',
  [DeinflectReason.Sugiru]: 'deinflect_sugiru',
  [DeinflectReason.Nasai]: 'deinflect_nasai',
  [DeinflectReason.PolitePast]: 'deinflect_polite_past',
  [DeinflectReason.Tara]: 'deinflect_tara',
  [DeinflectReason.Tari]: 'deinflect_tari',
  [DeinflectReason.Causative]: 'deinflect_causative',
  [DeinflectReason.PotentialOrPassive]: 'deinflect_potential_or_passive',
  [DeinflectReason.Sou]: 'deinflect_sou',
  [DeinflectReason.Tai]: 'deinflect_tai',
  [DeinflectReason.Polite]: 'deinflect_polite',
  [DeinflectReason.Past]: 'deinflect_past',
  [DeinflectReason.Negative]: 'deinflect_negative',
  [DeinflectReason.Passive]: 'deinflect_passive',
  [DeinflectReason.Ba]: 'deinflect_ba',
  [DeinflectReason.Volitional]: 'deinflect_volitional',
  [DeinflectReason.Potential]: 'deinflect_potential',
  [DeinflectReason.CausativePassive]: 'deinflect_causative_passive',
  [DeinflectReason.Te]: 'deinflect_te',
  [DeinflectReason.Zu]: 'deinflect_zu',
  [DeinflectReason.Imperative]: 'deinflect_imperative',
  [DeinflectReason.MasuStem]: 'deinflect_masu_stem',
  [DeinflectReason.Adv]: 'deinflect_adv',
  [DeinflectReason.Noun]: 'deinflect_noun',
  [DeinflectReason.ImperativeNegative]: 'deinflect_imperative_negative',
};

const deinflectRuleData: Array<[string, string, number, number]> = [
  ['くありませんでした', 'い', 1152, DeinflectReason.PolitePastNegative],
  ['いませんでした', 'う', 640, DeinflectReason.PolitePastNegative],
  ['きませんでした', 'く', 640, DeinflectReason.PolitePastNegative],
  ['きませんでした', 'くる', 2176, DeinflectReason.PolitePastNegative],
  ['ぎませんでした', 'ぐ', 640, DeinflectReason.PolitePastNegative],
  ['しませんでした', 'す', 640, DeinflectReason.PolitePastNegative],
  ['しませんでした', 'する', 4224, DeinflectReason.PolitePastNegative],
  ['ちませんでした', 'つ', 640, DeinflectReason.PolitePastNegative],
  ['にませんでした', 'ぬ', 640, DeinflectReason.PolitePastNegative],
  ['びませんでした', 'ぶ', 640, DeinflectReason.PolitePastNegative],
  ['みませんでした', 'む', 640, DeinflectReason.PolitePastNegative],
  ['りませんでした', 'る', 640, DeinflectReason.PolitePastNegative],
  ['くありません', 'い', 1152, DeinflectReason.PoliteNegative],
  ['ませんでした', 'る', 2432, DeinflectReason.PolitePastNegative],
  ['いましょう', 'う', 640, DeinflectReason.PoliteVolitional],
  ['きましょう', 'く', 640, DeinflectReason.PoliteVolitional],
  ['きましょう', 'くる', 2176, DeinflectReason.PoliteVolitional],
  ['ぎましょう', 'ぐ', 640, DeinflectReason.PoliteVolitional],
  ['しましょう', 'す', 640, DeinflectReason.PoliteVolitional],
  ['しましょう', 'する', 4224, DeinflectReason.PoliteVolitional],
  ['ちましょう', 'つ', 640, DeinflectReason.PoliteVolitional],
  ['にましょう', 'ぬ', 640, DeinflectReason.PoliteVolitional],
  ['びましょう', 'ぶ', 640, DeinflectReason.PoliteVolitional],
  ['みましょう', 'む', 640, DeinflectReason.PoliteVolitional],
  ['りましょう', 'る', 640, DeinflectReason.PoliteVolitional],
  ['いじゃう', 'ぐ', 514, DeinflectReason.Chau],
  ['いすぎる', 'う', 513, DeinflectReason.Sugiru],
  ['いちゃう', 'く', 514, DeinflectReason.Chau],
  ['いなさい', 'う', 640, DeinflectReason.Nasai],
  ['いました', 'う', 640, DeinflectReason.PolitePast],
  ['いません', 'う', 640, DeinflectReason.PoliteNegative],
  ['かされる', 'く', 513, DeinflectReason.CausativePassive],
  ['かったら', 'い', 1152, DeinflectReason.Tara],
  ['かったり', 'い', 1152, DeinflectReason.Tari],
  ['がされる', 'ぐ', 513, DeinflectReason.CausativePassive],
  ['きすぎる', 'く', 513, DeinflectReason.Sugiru],
  ['きすぎる', 'くる', 2049, DeinflectReason.Sugiru],
  ['ぎすぎる', 'ぐ', 513, DeinflectReason.Sugiru],
  ['きちゃう', 'くる', 2050, DeinflectReason.Chau],
  ['きなさい', 'く', 640, DeinflectReason.Nasai],
  ['きなさい', 'くる', 2176, DeinflectReason.Nasai],
  ['ぎなさい', 'ぐ', 640, DeinflectReason.Nasai],
  ['きました', 'く', 640, DeinflectReason.PolitePast],
  ['きました', 'くる', 2176, DeinflectReason.PolitePast],
  ['ぎました', 'ぐ', 640, DeinflectReason.PolitePast],
  ['きません', 'く', 640, DeinflectReason.PoliteNegative],
  ['きません', 'くる', 2176, DeinflectReason.PoliteNegative],
  ['ぎません', 'ぐ', 640, DeinflectReason.PoliteNegative],
  ['こさせる', 'くる', 2049, DeinflectReason.Causative],
  ['こられる', 'くる', 2049, DeinflectReason.PotentialOrPassive],
  ['しすぎる', 'す', 513, DeinflectReason.Sugiru],
  ['しすぎる', 'する', 4097, DeinflectReason.Sugiru],
  ['しちゃう', 'す', 514, DeinflectReason.Chau],
  ['しちゃう', 'する', 4098, DeinflectReason.Chau],
  ['しなさい', 'す', 640, DeinflectReason.Nasai],
  ['しなさい', 'する', 4224, DeinflectReason.Nasai],
  ['しました', 'す', 640, DeinflectReason.PolitePast],
  ['しました', 'する', 4224, DeinflectReason.PolitePast],
  ['しません', 'す', 640, DeinflectReason.PoliteNegative],
  ['しません', 'する', 4224, DeinflectReason.PoliteNegative],
  ['たされる', 'つ', 513, DeinflectReason.CausativePassive],
  ['ちすぎる', 'つ', 513, DeinflectReason.Sugiru],
  ['ちなさい', 'つ', 640, DeinflectReason.Nasai],
  ['ちました', 'つ', 640, DeinflectReason.PolitePast],
  ['ちません', 'つ', 640, DeinflectReason.PoliteNegative],
  ['っちゃう', 'う', 514, DeinflectReason.Chau],
  ['っちゃう', 'く', 514, DeinflectReason.Chau],
  ['っちゃう', 'つ', 514, DeinflectReason.Chau],
  ['っちゃう', 'る', 514, DeinflectReason.Chau],
  ['なされる', 'ぬ', 513, DeinflectReason.CausativePassive],
  ['にすぎる', 'ぬ', 513, DeinflectReason.Sugiru],
  ['になさい', 'ぬ', 640, DeinflectReason.Nasai],
  ['にました', 'ぬ', 640, DeinflectReason.PolitePast],
  ['にません', 'ぬ', 640, DeinflectReason.PoliteNegative],
  ['ばされる', 'ぶ', 513, DeinflectReason.CausativePassive],
  ['びすぎる', 'ぶ', 513, DeinflectReason.Sugiru],
  ['びなさい', 'ぶ', 640, DeinflectReason.Nasai],
  ['びました', 'ぶ', 640, DeinflectReason.PolitePast],
  ['びません', 'ぶ', 640, DeinflectReason.PoliteNegative],
  ['まされる', 'む', 513, DeinflectReason.CausativePassive],
  ['ましょう', 'る', 2432, DeinflectReason.PoliteVolitional],
  ['みすぎる', 'む', 513, DeinflectReason.Sugiru],
  ['みなさい', 'む', 640, DeinflectReason.Nasai],
  ['みました', 'む', 640, DeinflectReason.PolitePast],
  ['みません', 'む', 640, DeinflectReason.PoliteNegative],
  ['らされる', 'る', 513, DeinflectReason.CausativePassive],
  ['りすぎる', 'る', 513, DeinflectReason.Sugiru],
  ['りなさい', 'る', 640, DeinflectReason.Nasai],
  ['りました', 'る', 640, DeinflectReason.PolitePast],
  ['りません', 'る', 640, DeinflectReason.PoliteNegative],
  ['わされる', 'う', 513, DeinflectReason.CausativePassive],
  ['んじゃう', 'ぬ', 514, DeinflectReason.Chau],
  ['んじゃう', 'ぶ', 514, DeinflectReason.Chau],
  ['んじゃう', 'む', 514, DeinflectReason.Chau],
  ['いそう', 'う', 640, DeinflectReason.Sou],
  ['いたい', 'う', 516, DeinflectReason.Tai],
  ['いたら', 'く', 640, DeinflectReason.Tara],
  ['いだら', 'ぐ', 640, DeinflectReason.Tara],
  ['いたり', 'く', 640, DeinflectReason.Tari],
  ['いだり', 'ぐ', 640, DeinflectReason.Tari],
  ['います', 'う', 640, DeinflectReason.Polite],
  ['かせる', 'く', 513, DeinflectReason.Causative],
  ['がせる', 'ぐ', 513, DeinflectReason.Causative],
  ['かった', 'い', 1152, DeinflectReason.Past],
  ['かない', 'く', 516, DeinflectReason.Negative],
  ['がない', 'ぐ', 516, DeinflectReason.Negative],
  ['かれる', 'く', 513, DeinflectReason.Passive],
  ['がれる', 'ぐ', 513, DeinflectReason.Passive],
  ['きそう', 'く', 640, DeinflectReason.Sou],
  ['きそう', 'くる', 2176, DeinflectReason.Sou],
  ['ぎそう', 'ぐ', 640, DeinflectReason.Sou],
  ['きたい', 'く', 516, DeinflectReason.Tai],
  ['きたい', 'くる', 2052, DeinflectReason.Tai],
  ['ぎたい', 'ぐ', 516, DeinflectReason.Tai],
  ['きたら', 'くる', 2176, DeinflectReason.Tara],
  ['きたり', 'くる', 2176, DeinflectReason.Tari],
  ['きます', 'く', 640, DeinflectReason.Polite],
  ['きます', 'くる', 2176, DeinflectReason.Polite],
  ['ぎます', 'ぐ', 640, DeinflectReason.Polite],
  ['くない', 'い', 1028, DeinflectReason.Negative],
  ['ければ', 'い', 1152, DeinflectReason.Ba],
  ['こない', 'くる', 2052, DeinflectReason.Negative],
  ['こよう', 'くる', 2176, DeinflectReason.Volitional],
  ['これる', 'くる', 2049, DeinflectReason.Potential],
  ['させる', 'する', 4097, DeinflectReason.Causative],
  ['させる', 'る', 2305, DeinflectReason.Causative],
  ['させる', 'す', 513, DeinflectReason.Causative],
  ['さない', 'す', 516, DeinflectReason.Negative],
  ['される', 'す', 513, DeinflectReason.Passive],
  ['される', 'する', 4097, DeinflectReason.Passive],
  ['しそう', 'す', 640, DeinflectReason.Sou],
  ['しそう', 'する', 4224, DeinflectReason.Sou],
  ['したい', 'す', 516, DeinflectReason.Tai],
  ['したい', 'する', 4100, DeinflectReason.Tai],
  ['したら', 'す', 640, DeinflectReason.Tara],
  ['したら', 'する', 4224, DeinflectReason.Tara],
  ['したり', 'す', 640, DeinflectReason.Tari],
  ['したり', 'する', 4224, DeinflectReason.Tari],
  ['しない', 'する', 4100, DeinflectReason.Negative],
  ['します', 'す', 640, DeinflectReason.Polite],
  ['します', 'する', 4224, DeinflectReason.Polite],
  ['しよう', 'する', 4224, DeinflectReason.Volitional],
  ['すぎる', 'い', 1025, DeinflectReason.Sugiru],
  ['すぎる', 'る', 2305, DeinflectReason.Sugiru],
  ['たせる', 'つ', 513, DeinflectReason.Causative],
  ['たない', 'つ', 516, DeinflectReason.Negative],
  ['たれる', 'つ', 513, DeinflectReason.Passive],
  ['ちそう', 'つ', 640, DeinflectReason.Sou],
  ['ちたい', 'つ', 516, DeinflectReason.Tai],
  ['ちます', 'つ', 640, DeinflectReason.Polite],
  ['ちゃう', 'る', 2306, DeinflectReason.Chau],
  ['ったら', 'う', 640, DeinflectReason.Tara],
  ['ったら', 'つ', 640, DeinflectReason.Tara],
  ['ったら', 'る', 640, DeinflectReason.Tara],
  ['ったり', 'う', 640, DeinflectReason.Tari],
  ['ったり', 'つ', 640, DeinflectReason.Tari],
  ['ったり', 'る', 640, DeinflectReason.Tari],
  ['なさい', 'る', 2432, DeinflectReason.Nasai],
  ['なせる', 'ぬ', 513, DeinflectReason.Causative],
  ['なない', 'ぬ', 516, DeinflectReason.Negative],
  ['なれる', 'ぬ', 513, DeinflectReason.Passive],
  ['にそう', 'ぬ', 640, DeinflectReason.Sou],
  ['にたい', 'ぬ', 516, DeinflectReason.Tai],
  ['にます', 'ぬ', 640, DeinflectReason.Polite],
  ['ばせる', 'ぶ', 513, DeinflectReason.Causative],
  ['ばない', 'ぶ', 516, DeinflectReason.Negative],
  ['ばれる', 'ぶ', 513, DeinflectReason.Passive],
  ['びそう', 'ぶ', 640, DeinflectReason.Sou],
  ['びたい', 'ぶ', 516, DeinflectReason.Tai],
  ['びます', 'ぶ', 640, DeinflectReason.Polite],
  ['ました', 'る', 2432, DeinflectReason.PolitePast],
  ['ませる', 'む', 513, DeinflectReason.Causative],
  ['ません', 'る', 2432, DeinflectReason.PoliteNegative],
  ['まない', 'む', 516, DeinflectReason.Negative],
  ['まれる', 'む', 513, DeinflectReason.Passive],
  ['みそう', 'む', 640, DeinflectReason.Sou],
  ['みたい', 'む', 516, DeinflectReason.Tai],
  ['みます', 'む', 640, DeinflectReason.Polite],
  ['らせる', 'る', 513, DeinflectReason.Causative],
  ['らない', 'る', 516, DeinflectReason.Negative],
  ['られる', 'る', 2305, DeinflectReason.PotentialOrPassive],
  ['られる', 'る', 513, DeinflectReason.Passive],
  ['りそう', 'る', 640, DeinflectReason.Sou],
  ['りたい', 'る', 516, DeinflectReason.Tai],
  ['ります', 'る', 640, DeinflectReason.Polite],
  ['わせる', 'う', 513, DeinflectReason.Causative],
  ['わない', 'う', 516, DeinflectReason.Negative],
  ['われる', 'う', 513, DeinflectReason.Passive],
  ['んだら', 'ぬ', 640, DeinflectReason.Tara],
  ['んだら', 'ぶ', 640, DeinflectReason.Tara],
  ['んだら', 'む', 640, DeinflectReason.Tara],
  ['んだり', 'ぬ', 640, DeinflectReason.Tari],
  ['んだり', 'ぶ', 640, DeinflectReason.Tari],
  ['んだり', 'む', 640, DeinflectReason.Tari],
  ['いた', 'く', 640, DeinflectReason.Past],
  ['いだ', 'ぐ', 640, DeinflectReason.Past],
  ['いて', 'く', 640, DeinflectReason.Te],
  ['いで', 'ぐ', 640, DeinflectReason.Te],
  ['えば', 'う', 640, DeinflectReason.Ba],
  ['える', 'う', 513, DeinflectReason.Potential],
  ['おう', 'う', 640, DeinflectReason.Volitional],
  ['かず', 'く', 640, DeinflectReason.Zu],
  ['がず', 'ぐ', 640, DeinflectReason.Zu],
  ['きた', 'くる', 2176, DeinflectReason.Past],
  ['きて', 'くる', 2176, DeinflectReason.Te],
  ['くて', 'い', 1152, DeinflectReason.Te],
  ['けば', 'く', 640, DeinflectReason.Ba],
  ['げば', 'ぐ', 640, DeinflectReason.Ba],
  ['ける', 'く', 513, DeinflectReason.Potential],
  ['げる', 'ぐ', 513, DeinflectReason.Potential],
  ['こい', 'くる', 2176, DeinflectReason.Imperative],
  ['こう', 'く', 640, DeinflectReason.Volitional],
  ['ごう', 'ぐ', 640, DeinflectReason.Volitional],
  ['こず', 'くる', 2176, DeinflectReason.Zu],
  ['さず', 'す', 640, DeinflectReason.Zu],
  ['した', 'す', 640, DeinflectReason.Past],
  ['した', 'する', 4224, DeinflectReason.Past],
  ['して', 'す', 640, DeinflectReason.Te],
  ['して', 'する', 4224, DeinflectReason.Te],
  ['しろ', 'する', 4224, DeinflectReason.Imperative],
  ['せず', 'する', 4224, DeinflectReason.Zu],
  ['せば', 'す', 640, DeinflectReason.Ba],
  ['せよ', 'する', 4224, DeinflectReason.Imperative],
  ['せる', 'す', 513, DeinflectReason.Potential],
  ['そう', 'い', 1152, DeinflectReason.Sou],
  ['そう', 'す', 640, DeinflectReason.Volitional],
  ['そう', 'る', 2432, DeinflectReason.Sou],
  ['たい', 'る', 2308, DeinflectReason.Tai],
  ['たず', 'つ', 640, DeinflectReason.Zu],
  ['たら', 'る', 2432, DeinflectReason.Tara],
  ['たり', 'る', 2432, DeinflectReason.Tari],
  ['った', 'う', 640, DeinflectReason.Past],
  ['った', 'く', 640, DeinflectReason.Past],
  ['った', 'つ', 640, DeinflectReason.Past],
  ['った', 'る', 640, DeinflectReason.Past],
  ['って', 'う', 640, DeinflectReason.Te],
  ['って', 'く', 640, DeinflectReason.Te],
  ['って', 'つ', 640, DeinflectReason.Te],
  ['って', 'る', 640, DeinflectReason.Te],
  ['てば', 'つ', 640, DeinflectReason.Ba],
  ['てる', 'つ', 513, DeinflectReason.Potential],
  ['とう', 'つ', 640, DeinflectReason.Volitional],
  ['ない', 'る', 2308, DeinflectReason.Negative],
  ['なず', 'ぬ', 640, DeinflectReason.Zu],
  ['ねば', 'ぬ', 640, DeinflectReason.Ba],
  ['ねる', 'ぬ', 513, DeinflectReason.Potential],
  ['のう', 'ぬ', 640, DeinflectReason.Volitional],
  ['ばず', 'ぶ', 640, DeinflectReason.Zu],
  ['べば', 'ぶ', 640, DeinflectReason.Ba],
  ['べる', 'ぶ', 513, DeinflectReason.Potential],
  ['ぼう', 'ぶ', 640, DeinflectReason.Volitional],
  ['ます', 'る', 2432, DeinflectReason.Polite],
  ['まず', 'む', 640, DeinflectReason.Zu],
  ['めば', 'む', 640, DeinflectReason.Ba],
  ['める', 'む', 513, DeinflectReason.Potential],
  ['もう', 'む', 640, DeinflectReason.Volitional],
  ['よう', 'る', 2432, DeinflectReason.Volitional],
  ['らず', 'る', 640, DeinflectReason.Zu],
  ['れば', 'る', 7040, DeinflectReason.Ba],
  ['れる', 'る', 2817, DeinflectReason.Potential],
  ['ろう', 'る', 640, DeinflectReason.Volitional],
  ['わず', 'う', 640, DeinflectReason.Zu],
  ['んだ', 'ぬ', 640, DeinflectReason.Past],
  ['んだ', 'ぶ', 640, DeinflectReason.Past],
  ['んだ', 'む', 640, DeinflectReason.Past],
  ['んで', 'ぬ', 640, DeinflectReason.Te],
  ['んで', 'ぶ', 640, DeinflectReason.Te],
  ['んで', 'む', 640, DeinflectReason.Te],
  ['い', 'いる', 384, DeinflectReason.MasuStem],
  ['い', 'う', 640, DeinflectReason.MasuStem],
  ['い', 'る', 2176, DeinflectReason.Imperative],
  ['え', 'う', 640, DeinflectReason.Imperative],
  ['え', 'える', 384, DeinflectReason.MasuStem],
  ['き', 'きる', 384, DeinflectReason.MasuStem],
  ['き', 'く', 640, DeinflectReason.MasuStem],
  ['ぎ', 'ぎる', 384, DeinflectReason.MasuStem],
  ['ぎ', 'ぐ', 640, DeinflectReason.MasuStem],
  ['く', 'い', 1152, DeinflectReason.Adv],
  ['け', 'く', 640, DeinflectReason.Imperative],
  ['け', 'ける', 384, DeinflectReason.MasuStem],
  ['げ', 'ぐ', 640, DeinflectReason.Imperative],
  ['げ', 'げる', 384, DeinflectReason.MasuStem],
  ['さ', 'い', 1152, DeinflectReason.Noun],
  ['し', 'す', 640, DeinflectReason.MasuStem],
  ['じ', 'じる', 384, DeinflectReason.MasuStem],
  ['ず', 'る', 2432, DeinflectReason.Zu],
  ['せ', 'す', 640, DeinflectReason.Imperative],
  ['せ', 'せる', 384, DeinflectReason.MasuStem],
  ['ぜ', 'ぜる', 384, DeinflectReason.MasuStem],
  ['た', 'る', 2432, DeinflectReason.Past],
  ['ち', 'ちる', 384, DeinflectReason.MasuStem],
  ['ち', 'つ', 640, DeinflectReason.MasuStem],
  ['て', 'つ', 640, DeinflectReason.Imperative],
  ['て', 'てる', 384, DeinflectReason.MasuStem],
  ['て', 'る', 2432, DeinflectReason.Te],
  ['で', 'でる', 384, DeinflectReason.MasuStem],
  ['な', '', 7040, DeinflectReason.ImperativeNegative],
  ['に', 'にる', 384, DeinflectReason.MasuStem],
  ['に', 'ぬ', 640, DeinflectReason.MasuStem],
  ['ね', 'ぬ', 640, DeinflectReason.Imperative],
  ['ね', 'ねる', 384, DeinflectReason.MasuStem],
  ['ひ', 'ひる', 384, DeinflectReason.MasuStem],
  ['び', 'びる', 384, DeinflectReason.MasuStem],
  ['び', 'ぶ', 640, DeinflectReason.MasuStem],
  ['へ', 'へる', 384, DeinflectReason.MasuStem],
  ['べ', 'ぶ', 640, DeinflectReason.Imperative],
  ['べ', 'べる', 384, DeinflectReason.MasuStem],
  ['み', 'みる', 384, DeinflectReason.MasuStem],
  ['み', 'む', 640, DeinflectReason.MasuStem],
  ['め', 'む', 640, DeinflectReason.Imperative],
  ['め', 'める', 384, DeinflectReason.MasuStem],
  ['よ', 'る', 384, DeinflectReason.Imperative],
  ['り', 'りる', 384, DeinflectReason.MasuStem],
  ['り', 'る', 640, DeinflectReason.MasuStem],
  ['れ', 'る', 640, DeinflectReason.Imperative],
  ['れ', 'れる', 384, DeinflectReason.MasuStem],
  ['ろ', 'る', 384, DeinflectReason.Imperative],
];

interface DeinflectRule {
  from: string;
  to: string;
  // Unlike the type in the CandidateWord, this is a 16-bit integer where the
  // lower 8 bits represent the from type while the upper 8 bits represent the
  // to type(s).
  //
  // For example, 遊びすぎる would match the びすぎる→ぶ rule where the from
  // type is an ichidan/ru-verb while the to type is a godan/u-verb.
  //
  // The type for this rule is calculated as follows:
  //
  //   from-type = WordType.IchidanVerb = 1 << 0 = 00000001
  //   to-type   = WordType.GodanVerb   = 1 << 1 = 00000010
  //   type      = [to-type] [from-type]
  //             = 00000010 00000001
  //               \______/ \______/
  //                  to      from
  //             = 513
  //
  // When the from type accepts anything BUT one of the above word types (e.g.
  // a verb stem), the highest bit is set. For example, consider the
  // deinflection rule that allows 食べ (imperative) to be de-inflected to
  // 食べる: べ→べる.
  //
  // In this case, the to type is an ichidan/ru-verb, while the from type is
  // basically anything but NOT the result of any other deinflection (since they
  // never produce verb stems). For this case the highest bit of the from-type
  // is set so that it does NOT match any of the existing word types but it DOES
  // match when we compare with 0xff (the mask we use for the initial input).
  //
  // i.e. from-type = 10000000
  //      to-type   = WordType.IchidanVerb = 1
  //      type      = 00000001 10000000
  //                = 384
  //
  // Note that the to-type is a bitfield since multiple possible word types can
  // be produced.
  //
  // For example, for the rule ませんでした→る the deinflected word could be an
  // ichidan/ru-verb (e.g. 食べる) but it could also be the special verb 来る
  // (when it is written in hiragana a different rule will match). As a result,
  // the to-type needs to represent both of these possibilities.
  //
  // i.e. to-type   = WordType.IchidanVerb & WordType.KuruVerb
  //                = 00000001 & 00001000
  //                = 00001001
  //      from-type = Verb stem (i.e. anything but one of the WordTypes)
  //                = 10000000
  //      type      = 00001001 10000000
  //                = 2432
  //
  type: number;
  reason: DeinflectReason;
}

interface DeinflectRuleGroup {
  rules: Array<DeinflectRule>;
  fromLen: number;
}

const deinflectRuleGroups: Array<DeinflectRuleGroup> = [];

function getDeinflectRuleGroups() {
  if (!deinflectRuleGroups.length) {
    let prevLen: number = -1;
    let ruleGroup: DeinflectRuleGroup;

    for (const [from, to, type, reason] of deinflectRuleData) {
      const rule: DeinflectRule = { from, to, type, reason };

      if (prevLen !== rule.from.length) {
        prevLen = rule.from.length;
        ruleGroup = { rules: [], fromLen: prevLen };
        deinflectRuleGroups.push(ruleGroup);
      }
      ruleGroup!.rules.push(rule);
    }
  }

  return deinflectRuleGroups;
}

export interface CandidateWord {
  // The de-inflected candidate word
  word: string;
  // An optional sequence of reasons describing the how |word| was derived
  // from the original input string.
  //
  // Each array is a sequence of rules applied in turn.
  // There may be multiple arrays when multiple sequences of rules were applied
  // to produce word.
  reasons: Array<Array<DeinflectReason>>;
  // For a de-inflected word, this is a bitfield comprised of flags from the
  // WordType enum describing the possible types of word this could represent
  // (e.g. godan verb, i-adj). If a word looked up in the dictionary does not
  // match this type, it should be ignored since the deinflection is not valid
  // in that case.
  //
  // See the extended notes for DeinflectRule.rule.
  type: number;
}

// Returns an array of possible de-inflected versions of |word|.
export function deinflect(word: string): CandidateWord[] {
  const result: Array<CandidateWord> = [];
  const resultIndex: { [index: string]: number } = {};
  const ruleGroups = getDeinflectRuleGroups();

  const original: CandidateWord = {
    word,
    // Initially we don't know what type of word we have so we set the type
    // mask to match all rules.
    type: 0xff,
    reasons: [],
  };
  result.push(original);
  resultIndex[word] = 0;

  let i = 0;
  do {
    const word = result[i].word;
    const type = result[i].type;

    for (const ruleGroup of ruleGroups) {
      if (ruleGroup.fromLen <= word.length) {
        const ending = word.substr(-ruleGroup.fromLen);

        for (const rule of ruleGroup.rules) {
          if (type & rule.type && ending === rule.from) {
            const newWord =
              word.substr(0, word.length - rule.from.length) + rule.to;
            if (newWord.length <= 1) {
              continue;
            }

            // If we already have a candidate for this word with the same
            // to type(s), expand the possible reasons.
            //
            // If the to type(s) differ, then we'll add a separate candidate
            // and just hope that when we go to match against dictionary words
            // we'll filter out the mismatching one(s).
            if (resultIndex[newWord]) {
              const candidate = result[resultIndex[newWord]];
              if (candidate.type === rule.type >> 8) {
                candidate.reasons.unshift([rule.reason]);
                continue;
              }
            }
            resultIndex[newWord] = result.length;

            // Deep clone multidimensional array
            const reasons = [];
            for (const array of result[i].reasons) {
              reasons.push(Array.from(array));
            }
            if (reasons.length) {
              const firstReason = reasons[0];
              // This is a bit hacky but the alternative is to add the
              // full-form causative passive inflections to the deinflection
              // dictionary and then try to merge the results.
              if (
                rule.reason === DeinflectReason.Causative &&
                firstReason.length &&
                firstReason[0] === DeinflectReason.PotentialOrPassive
              ) {
                firstReason.splice(0, 1, DeinflectReason.CausativePassive);
              } else {
                firstReason.unshift(rule.reason);
              }
            } else {
              reasons.push([rule.reason]);
            }
            const candidate: CandidateWord = {
              reasons,
              type: rule.type >> 8,
              word: newWord,
            };

            result.push(candidate);
          }
        }
      }
    }
  } while (++i < result.length);

  return result;
}

export default deinflect;
