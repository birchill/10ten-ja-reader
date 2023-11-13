import { kanaToHiragana } from '@birchill/normal-jp';

export const enum Reason {
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
  Toku,
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
  Continuous,
  Ki,
  SuruNoun,
  ZaruWoEnai,
  NegativeTe,
}

export const deinflectL10NKeys: { [key: number]: string } = {
  [Reason.PolitePastNegative]: 'deinflect_polite_past_negative',
  [Reason.PoliteNegative]: 'deinflect_polite_negative',
  [Reason.PoliteVolitional]: 'deinflect_polite_volitional',
  [Reason.Chau]: 'deinflect_chau',
  [Reason.Sugiru]: 'deinflect_sugiru',
  [Reason.Nasai]: 'deinflect_nasai',
  [Reason.PolitePast]: 'deinflect_polite_past',
  [Reason.Tara]: 'deinflect_tara',
  [Reason.Tari]: 'deinflect_tari',
  [Reason.Causative]: 'deinflect_causative',
  [Reason.PotentialOrPassive]: 'deinflect_potential_or_passive',
  [Reason.Sou]: 'deinflect_sou',
  [Reason.Toku]: 'deinflect_toku',
  [Reason.Tai]: 'deinflect_tai',
  [Reason.Polite]: 'deinflect_polite',
  [Reason.Past]: 'deinflect_past',
  [Reason.Negative]: 'deinflect_negative',
  [Reason.Passive]: 'deinflect_passive',
  [Reason.Ba]: 'deinflect_ba',
  [Reason.Volitional]: 'deinflect_volitional',
  [Reason.Potential]: 'deinflect_potential',
  [Reason.CausativePassive]: 'deinflect_causative_passive',
  [Reason.Te]: 'deinflect_te',
  [Reason.Zu]: 'deinflect_zu',
  [Reason.Imperative]: 'deinflect_imperative',
  [Reason.MasuStem]: 'deinflect_masu_stem',
  [Reason.Adv]: 'deinflect_adv',
  [Reason.Noun]: 'deinflect_noun',
  [Reason.ImperativeNegative]: 'deinflect_imperative_negative',
  [Reason.Continuous]: 'deinflect_continuous',
  [Reason.Ki]: 'deinflect_ki',
  [Reason.SuruNoun]: 'deinflect_suru_noun',
  [Reason.ZaruWoEnai]: 'deinflect_zaru_wo_enai',
  [Reason.NegativeTe]: 'deinflect_negative_te',
};

const deinflectRuleData: Array<[string, string, number, number, Reason]> = [
  // -------------- 12 --------------
  [
    'いらっしゃいませんでした',
    'いらっしゃる',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  // -------------- 11 --------------
  [
    'おっしゃいませんでした',
    'おっしゃる',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  // -------------- 10 --------------
  [
    'くださいませんでした',
    'くださる',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  // -------------- 9 --------------
  [
    'いらっしゃいました',
    'いらっしゃる',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePast,
  ],
  [
    'くありませんでした',
    'い',
    Type.Initial,
    Type.IAdj,
    Reason.PolitePastNegative,
  ],
  [
    '下さいませんでした',
    '下さる',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    'ございませんでした',
    'ござる',
    Type.Initial,
    // Actually Yondan verb but we allow Yondan verbs to match Godan verbs when
    // we evaluate candidates.
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    'ご座いませんでした',
    'ご座る',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    '御座いませんでした',
    '御座る',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  // -------------- 8 --------------
  [
    'いらっしゃいます',
    'いらっしゃる',
    Type.Initial,
    Type.GodanVerb,
    Reason.Polite,
  ],
  [
    'おっしゃいました',
    'おっしゃる',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePast,
  ],
  [
    '仰いませんでした',
    '仰る',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  // -------------- 7 --------------
  [
    'いませんでした',
    'う',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  ['おっしゃいます', 'おっしゃる', Type.Initial, Type.GodanVerb, Reason.Polite],
  [
    'きませんでした',
    'く',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    'きませんでした',
    'くる',
    Type.Initial,
    Type.KuruVerb,
    Reason.PolitePastNegative,
  ],
  [
    'ぎませんでした',
    'ぐ',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    'くださいません',
    'くださる',
    Type.Initial,
    Type.GodanVerb,
    Reason.PoliteNegative,
  ],
  [
    'しませんでした',
    'す',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    'しませんでした',
    'する',
    Type.Initial,
    Type.SuruVerb,
    Reason.PolitePastNegative,
  ],
  [
    'しませんでした',
    'す',
    Type.Initial,
    Type.SuruVerb,
    Reason.PolitePastNegative,
  ],
  [
    'ちませんでした',
    'つ',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    'にませんでした',
    'ぬ',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    'びませんでした',
    'ぶ',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    'みませんでした',
    'む',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  [
    'りませんでした',
    'る',
    Type.Initial,
    Type.GodanVerb,
    Reason.PolitePastNegative,
  ],
  // -------------- 6 --------------
  [
    'いらっしゃい',
    'いらっしゃる',
    Type.Initial,
    Type.GodanVerb,
    Reason.MasuStem,
  ],
  [
    'いらっしゃい',
    'いらっしゃる',
    Type.Initial,
    Type.GodanVerb,
    Reason.Imperative,
  ],
  ['くありません', 'い', Type.Initial, Type.IAdj, Reason.PoliteNegative],
  ['くださいます', 'くださる', Type.Initial, Type.GodanVerb, Reason.Polite],
  [
    '下さいません',
    '下さる',
    Type.Initial,
    Type.GodanVerb,
    Reason.PoliteNegative,
  ],
  [
    'ございません',
    'ござる',
    Type.Initial,
    Type.GodanVerb,
    Reason.PoliteNegative,
  ],
  [
    'ご座いません',
    'ご座る',
    Type.Initial,
    Type.GodanVerb,
    Reason.PoliteNegative,
  ],
  [
    '御座いません',
    '御座る',
    Type.Initial,
    Type.GodanVerb,
    Reason.PoliteNegative,
  ],
  ['ざるをえない', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざるを得ない', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  [
    'ませんでした',
    'る',
    Type.Initial,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.PolitePastNegative,
  ],
  ['のたもうたら', 'のたまう', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['のたもうたり', 'のたまう', Type.Initial, Type.GodanVerb, Reason.Tari],
  // -------------- 5 --------------
  ['いましょう', 'う', Type.Initial, Type.GodanVerb, Reason.PoliteVolitional],
  ['仰いました', '仰る', Type.Initial, Type.GodanVerb, Reason.PolitePast],
  ['おっしゃい', 'おっしゃる', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['おっしゃい', 'おっしゃる', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['きましょう', 'く', Type.Initial, Type.GodanVerb, Reason.PoliteVolitional],
  ['きましょう', 'くる', Type.Initial, Type.KuruVerb, Reason.PoliteVolitional],
  ['ぎましょう', 'ぐ', Type.Initial, Type.GodanVerb, Reason.PoliteVolitional],
  ['下さいます', '下さる', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['ございます', 'ござる', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['ご座います', 'ご座る', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['御座います', '御座る', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['ざるえない', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざる得ない', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざるをえぬ', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざるを得ぬ', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['しましょう', 'す', Type.Initial, Type.GodanVerb, Reason.PoliteVolitional],
  ['しましょう', 'する', Type.Initial, Type.SuruVerb, Reason.PoliteVolitional],
  ['しましょう', 'す', Type.Initial, Type.SuruVerb, Reason.PoliteVolitional],
  ['ちましょう', 'つ', Type.Initial, Type.GodanVerb, Reason.PoliteVolitional],
  ['にましょう', 'ぬ', Type.Initial, Type.GodanVerb, Reason.PoliteVolitional],
  ['のたもうた', 'のたまう', Type.Initial, Type.GodanVerb, Reason.Past],
  ['のたもうて', 'のたまう', Type.Initial, Type.GodanVerb, Reason.Te],
  ['びましょう', 'ぶ', Type.Initial, Type.GodanVerb, Reason.PoliteVolitional],
  ['みましょう', 'む', Type.Initial, Type.GodanVerb, Reason.PoliteVolitional],
  ['りましょう', 'る', Type.Initial, Type.GodanVerb, Reason.PoliteVolitional],
  // -------------- 4 --------------
  ['いじゃう', 'ぐ', Type.GodanVerb, Type.GodanVerb, Reason.Chau],
  ['いすぎる', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.Sugiru],
  ['いちゃう', 'く', Type.GodanVerb, Type.GodanVerb, Reason.Chau],
  ['いったら', 'いく', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['いったり', 'いく', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['いている', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['いでいる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['いなさい', 'う', Type.Initial, Type.GodanVerb, Reason.Nasai],
  ['いました', 'う', Type.Initial, Type.GodanVerb, Reason.PolitePast],
  ['いません', 'う', Type.Initial, Type.GodanVerb, Reason.PoliteNegative],
  ['おうたら', 'おう', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['おうたり', 'おう', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['仰います', '仰る', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['かされる', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['かったら', 'い', Type.Initial, Type.IAdj, Reason.Tara],
  ['かったり', 'い', Type.Initial, Type.IAdj, Reason.Tari],
  ['がされる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['きすぎる', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.Sugiru],
  ['きすぎる', 'くる', Type.IchidanVerb, Type.KuruVerb, Reason.Sugiru],
  ['ぎすぎる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.Sugiru],
  ['きちゃう', 'くる', Type.GodanVerb, Type.KuruVerb, Reason.Chau],
  ['きている', 'くる', Type.IchidanVerb, Type.KuruVerb, Reason.Continuous],
  ['きなさい', 'く', Type.Initial, Type.GodanVerb, Reason.Nasai],
  ['きなさい', 'くる', Type.Initial, Type.KuruVerb, Reason.Nasai],
  ['ぎなさい', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Nasai],
  ['きました', 'く', Type.Initial, Type.GodanVerb, Reason.PolitePast],
  ['きました', 'くる', Type.Initial, Type.KuruVerb, Reason.PolitePast],
  ['ぎました', 'ぐ', Type.Initial, Type.GodanVerb, Reason.PolitePast],
  ['きません', 'く', Type.Initial, Type.GodanVerb, Reason.PoliteNegative],
  ['きません', 'くる', Type.Initial, Type.KuruVerb, Reason.PoliteNegative],
  ['ぎません', 'ぐ', Type.Initial, Type.GodanVerb, Reason.PoliteNegative],
  ['こうたら', 'こう', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['こうたり', 'こう', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['こさせる', 'くる', Type.IchidanVerb, Type.KuruVerb, Reason.Causative],
  [
    'こられる',
    'くる',
    Type.IchidanVerb,
    Type.KuruVerb,
    Reason.PotentialOrPassive,
  ],
  ['ざるえぬ', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざる得ぬ', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  [
    'しすぎる',
    'す',
    Type.IchidanVerb,
    Type.GodanVerb | Type.SuruVerb,
    Reason.Sugiru,
  ],
  ['しすぎる', 'する', Type.IchidanVerb, Type.SuruVerb, Reason.Sugiru],
  [
    'しちゃう',
    'す',
    Type.GodanVerb,
    Type.GodanVerb | Type.SuruVerb,
    Reason.Chau,
  ],
  ['しちゃう', 'する', Type.GodanVerb, Type.SuruVerb, Reason.Chau],
  [
    'している',
    'す',
    Type.IchidanVerb,
    Type.GodanVerb | Type.SuruVerb,
    Reason.Continuous,
  ],
  ['している', 'する', Type.IchidanVerb, Type.SuruVerb, Reason.Continuous],
  [
    'しなさい',
    'す',
    Type.Initial,
    Type.GodanVerb | Type.SuruVerb,
    Reason.Nasai,
  ],
  ['しなさい', 'する', Type.Initial, Type.SuruVerb, Reason.Nasai],
  [
    'しました',
    'す',
    Type.Initial,
    Type.GodanVerb | Type.SuruVerb,
    Reason.PolitePast,
  ],
  ['しました', 'する', Type.Initial, Type.SuruVerb, Reason.PolitePast],
  [
    'しません',
    'す',
    Type.Initial,
    Type.GodanVerb | Type.SuruVerb,
    Reason.PoliteNegative,
  ],
  ['しません', 'する', Type.Initial, Type.SuruVerb, Reason.PoliteNegative],
  ['そうたら', 'そう', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['そうたり', 'そう', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['たされる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['ちすぎる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.Sugiru],
  ['ちなさい', 'つ', Type.Initial, Type.GodanVerb, Reason.Nasai],
  ['ちました', 'つ', Type.Initial, Type.GodanVerb, Reason.PolitePast],
  ['ちません', 'つ', Type.Initial, Type.GodanVerb, Reason.PoliteNegative],
  ['っちゃう', 'う', Type.GodanVerb, Type.GodanVerb, Reason.Chau],
  ['っちゃう', 'く', Type.GodanVerb, Type.GodanVerb, Reason.Chau],
  ['っちゃう', 'つ', Type.GodanVerb, Type.GodanVerb, Reason.Chau],
  ['っちゃう', 'る', Type.GodanVerb, Type.GodanVerb, Reason.Chau],
  ['っている', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['っている', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['っている', 'る', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['とうたら', 'とう', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['とうたり', 'とう', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['なされる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['にすぎる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.Sugiru],
  ['になさい', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Nasai],
  ['にました', 'ぬ', Type.Initial, Type.GodanVerb, Reason.PolitePast],
  ['にません', 'ぬ', Type.Initial, Type.GodanVerb, Reason.PoliteNegative],
  ['ばされる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['びすぎる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.Sugiru],
  ['びなさい', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Nasai],
  ['びました', 'ぶ', Type.Initial, Type.GodanVerb, Reason.PolitePast],
  ['びません', 'ぶ', Type.Initial, Type.GodanVerb, Reason.PoliteNegative],
  ['まされる', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  [
    'ましょう',
    'る',
    Type.Initial,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.PoliteVolitional,
  ],
  ['みすぎる', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.Sugiru],
  ['みなさい', 'む', Type.Initial, Type.GodanVerb, Reason.Nasai],
  ['みました', 'む', Type.Initial, Type.GodanVerb, Reason.PolitePast],
  ['みません', 'む', Type.Initial, Type.GodanVerb, Reason.PoliteNegative],
  ['らされる', 'る', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['りすぎる', 'る', Type.IchidanVerb, Type.GodanVerb, Reason.Sugiru],
  ['りなさい', 'る', Type.Initial, Type.GodanVerb, Reason.Nasai],
  ['りました', 'る', Type.Initial, Type.GodanVerb, Reason.PolitePast],
  ['りません', 'る', Type.Initial, Type.GodanVerb, Reason.PoliteNegative],
  ['わされる', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['んじゃう', 'ぬ', Type.GodanVerb, Type.GodanVerb, Reason.Chau],
  ['んじゃう', 'ぶ', Type.GodanVerb, Type.GodanVerb, Reason.Chau],
  ['んじゃう', 'む', Type.GodanVerb, Type.GodanVerb, Reason.Chau],
  ['んでいる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['んでいる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['んでいる', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['行ったら', '行く', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['行ったり', '行く', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['逝ったら', '逝く', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['逝ったり', '逝く', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['往ったら', '往く', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['往ったり', '往く', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['逝ったら', '逝く', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['逝ったり', '逝く', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['往ったら', '往く', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['往ったり', '往く', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['請うたら', '請う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['請うたり', '請う', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['乞うたら', '乞う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['乞うたり', '乞う', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['恋うたら', '恋う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['恋うたり', '恋う', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['来させる', '来る', Type.IchidanVerb, Type.KuruVerb, Reason.Causative],
  ['來させる', '來る', Type.IchidanVerb, Type.KuruVerb, Reason.Causative],
  ['来ました', '来る', Type.Initial, Type.KuruVerb, Reason.PolitePast],
  ['来ません', '来る', Type.Initial, Type.KuruVerb, Reason.PoliteNegative],
  ['來ました', '來る', Type.Initial, Type.KuruVerb, Reason.PolitePast],
  ['來ません', '來る', Type.Initial, Type.KuruVerb, Reason.PoliteNegative],
  [
    '来られる',
    '来る',
    Type.IchidanVerb,
    Type.KuruVerb,
    Reason.PotentialOrPassive,
  ],
  [
    '來られる',
    '來る',
    Type.IchidanVerb,
    Type.KuruVerb,
    Reason.PotentialOrPassive,
  ],
  ['問うたら', '問う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['問うたり', '問う', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['負うたら', '負う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['負うたり', '負う', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['沿うたら', '沿う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['沿うたり', '沿う', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['添うたら', '添う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['添うたり', '添う', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['副うたら', '副う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['副うたり', '副う', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['厭うたら', '厭う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['厭うたり', '厭う', Type.Initial, Type.GodanVerb, Reason.Tari],
  // -------------- 3 --------------
  ['いそう', 'う', Type.Initial, Type.GodanVerb, Reason.Sou],
  ['いたい', 'う', Type.IAdj, Type.GodanVerb, Reason.Tai],
  ['いたら', 'く', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['いだら', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['いたり', 'く', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['いだり', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['いった', 'いく', Type.Initial, Type.GodanVerb, Reason.Past],
  ['いって', 'いく', Type.Initial, Type.GodanVerb, Reason.Te],
  ['いてる', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['いでる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['いとく', 'く', Type.GodanVerb, Type.GodanVerb, Reason.Toku],
  ['いどく', 'ぐ', Type.GodanVerb, Type.GodanVerb, Reason.Toku],
  ['います', 'う', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['おうた', 'おう', Type.Initial, Type.GodanVerb, Reason.Past],
  ['おうて', 'おう', Type.Initial, Type.GodanVerb, Reason.Te],
  ['かせる', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['がせる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['かった', 'い', Type.Initial, Type.IAdj, Reason.Past],
  ['かない', 'く', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['がない', 'ぐ', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['かれる', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['がれる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['きそう', 'く', Type.Initial, Type.GodanVerb, Reason.Sou],
  ['きそう', 'くる', Type.Initial, Type.KuruVerb, Reason.Sou],
  ['ぎそう', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Sou],
  ['きたい', 'く', Type.IAdj, Type.GodanVerb, Reason.Tai],
  ['きたい', 'くる', Type.IAdj, Type.KuruVerb, Reason.Tai],
  ['ぎたい', 'ぐ', Type.IAdj, Type.GodanVerb, Reason.Tai],
  ['きたら', 'くる', Type.Initial, Type.KuruVerb, Reason.Tara],
  ['きたり', 'くる', Type.Initial, Type.KuruVerb, Reason.Tari],
  ['きてる', 'くる', Type.IchidanVerb, Type.KuruVerb, Reason.Continuous],
  ['きとく', 'くる', Type.GodanVerb, Type.KuruVerb, Reason.Toku],
  ['きます', 'く', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['きます', 'くる', Type.Initial, Type.KuruVerb, Reason.Polite],
  ['ぎます', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['くない', 'い', Type.IAdj | Type.VNai, Type.IAdj, Reason.Negative],
  ['ければ', 'い', Type.Initial, Type.IAdj, Reason.Ba],
  ['こうた', 'こう', Type.Initial, Type.GodanVerb, Reason.Past],
  ['こうて', 'こう', Type.Initial, Type.GodanVerb, Reason.Te],
  ['こない', 'くる', Type.IAdj | Type.VNai, Type.KuruVerb, Reason.Negative],
  ['こよう', 'くる', Type.Initial, Type.KuruVerb, Reason.Volitional],
  ['これる', 'くる', Type.IchidanVerb, Type.KuruVerb, Reason.Potential],
  ['来れる', '来る', Type.IchidanVerb, Type.KuruVerb, Reason.Potential],
  ['來れる', '來る', Type.IchidanVerb, Type.KuruVerb, Reason.Potential],
  ['させる', 'する', Type.IchidanVerb, Type.SuruVerb, Reason.Causative],
  ['させる', 'る', Type.IchidanVerb, Type.IchidanVerb, Reason.Causative],
  [
    'させる',
    'す',
    Type.IchidanVerb,
    Type.GodanVerb | Type.SuruVerb,
    Reason.Causative,
  ],
  ['さない', 'す', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  [
    'される',
    'す',
    Type.IchidanVerb,
    Type.GodanVerb | Type.SuruVerb,
    Reason.Passive,
  ],
  ['される', 'する', Type.IchidanVerb, Type.SuruVerb, Reason.Passive],
  ['しそう', 'す', Type.Initial, Type.GodanVerb | Type.SuruVerb, Reason.Sou],
  ['しそう', 'する', Type.Initial, Type.SuruVerb, Reason.Sou],
  ['したい', 'す', Type.IAdj, Type.GodanVerb | Type.SuruVerb, Reason.Tai],
  ['したい', 'する', Type.IAdj, Type.SuruVerb, Reason.Tai],
  ['したら', 'す', Type.Initial, Type.GodanVerb | Type.SuruVerb, Reason.Tara],
  ['したら', 'する', Type.Initial, Type.SuruVerb, Reason.Tara],
  ['したり', 'す', Type.Initial, Type.GodanVerb | Type.SuruVerb, Reason.Tari],
  ['したり', 'する', Type.Initial, Type.SuruVerb, Reason.Tari],
  [
    'してる',
    'す',
    Type.IchidanVerb,
    Type.GodanVerb | Type.SuruVerb,
    Reason.Continuous,
  ],
  ['してる', 'する', Type.IchidanVerb, Type.SuruVerb, Reason.Continuous],
  ['しとく', 'す', Type.GodanVerb, Type.GodanVerb | Type.SuruVerb, Reason.Toku],
  ['しとく', 'する', Type.GodanVerb, Type.SuruVerb, Reason.Toku],
  ['しない', 'する', Type.IAdj | Type.VNai, Type.SuruVerb, Reason.Negative],
  ['します', 'す', Type.Initial, Type.GodanVerb | Type.SuruVerb, Reason.Polite],
  ['します', 'する', Type.Initial, Type.SuruVerb, Reason.Polite],
  ['しよう', 'する', Type.Initial, Type.SuruVerb, Reason.Volitional],
  ['すぎる', 'い', Type.IchidanVerb, Type.IAdj, Reason.Sugiru],
  [
    'すぎる',
    'る',
    Type.IchidanVerb,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.Sugiru,
  ],
  ['そうた', 'そう', Type.Initial, Type.GodanVerb, Reason.Past],
  ['そうて', 'そう', Type.Initial, Type.GodanVerb, Reason.Te],
  ['たせる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['たない', 'つ', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['たれる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['ちそう', 'つ', Type.Initial, Type.GodanVerb, Reason.Sou],
  ['ちたい', 'つ', Type.IAdj, Type.GodanVerb, Reason.Tai],
  ['ちます', 'つ', Type.Initial, Type.GodanVerb, Reason.Polite],
  [
    'ちゃう',
    'る',
    Type.GodanVerb,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.Chau,
  ],
  ['ったら', 'う', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['ったら', 'つ', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['ったら', 'る', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['ったり', 'う', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['ったり', 'つ', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['ったり', 'る', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['ってる', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['ってる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['ってる', 'る', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['っとく', 'う', Type.GodanVerb, Type.GodanVerb, Reason.Toku],
  ['っとく', 'つ', Type.GodanVerb, Type.GodanVerb, Reason.Toku],
  ['っとく', 'る', Type.GodanVerb, Type.GodanVerb, Reason.Toku],
  [
    'ている',
    'る',
    Type.IchidanVerb,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.Continuous,
  ],
  ['できる', 'する', Type.IchidanVerb, Type.SuruVerb, Reason.Potential],
  ['とうた', 'とう', Type.Initial, Type.GodanVerb, Reason.Past],
  ['とうて', 'とう', Type.Initial, Type.GodanVerb, Reason.Te],
  ['ないで', 'ない', Type.Initial, Type.VNai, Reason.NegativeTe],
  [
    'なさい',
    'る',
    Type.Initial,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.Nasai,
  ],
  ['なせる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['なない', 'ぬ', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['なれる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['にそう', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Sou],
  ['にたい', 'ぬ', Type.IAdj, Type.GodanVerb, Reason.Tai],
  ['にます', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['ばせる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['ばない', 'ぶ', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['ばれる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['びそう', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Sou],
  ['びたい', 'ぶ', Type.IAdj, Type.GodanVerb, Reason.Tai],
  ['びます', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['ました', 'る', Type.Initial, Type.IchidanVerb, Reason.PolitePast],
  ['ませる', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['ません', 'る', Type.Initial, Type.IchidanVerb, Reason.PoliteNegative],
  ['まない', 'む', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['まれる', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['みそう', 'む', Type.Initial, Type.GodanVerb, Reason.Sou],
  ['みたい', 'む', Type.IAdj, Type.GodanVerb, Reason.Tai],
  ['みます', 'む', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['らせる', 'る', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['らない', 'る', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  [
    'られる',
    'る',
    Type.IchidanVerb,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.PotentialOrPassive,
  ],
  ['られる', 'る', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['りそう', 'る', Type.Initial, Type.GodanVerb, Reason.Sou],
  ['りたい', 'る', Type.IAdj, Type.GodanVerb, Reason.Tai],
  ['ります', 'る', Type.Initial, Type.GodanVerb, Reason.Polite],
  ['わせる', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['わない', 'う', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['われる', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['んだら', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['んだら', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['んだら', 'む', Type.Initial, Type.GodanVerb, Reason.Tara],
  ['んだり', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['んだり', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['んだり', 'む', Type.Initial, Type.GodanVerb, Reason.Tari],
  ['んでる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['んでる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['んでる', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.Continuous],
  ['んどく', 'ぬ', Type.GodanVerb, Type.GodanVerb, Reason.Toku],
  ['んどく', 'ぶ', Type.GodanVerb, Type.GodanVerb, Reason.Toku],
  ['んどく', 'む', Type.GodanVerb, Type.GodanVerb, Reason.Toku],
  ['行った', '行く', Type.Initial, Type.GodanVerb, Reason.Past],
  ['行って', '行く', Type.Initial, Type.GodanVerb, Reason.Te],
  ['逝った', '逝く', Type.Initial, Type.GodanVerb, Reason.Past],
  ['逝って', '逝く', Type.Initial, Type.GodanVerb, Reason.Te],
  ['往った', '往く', Type.Initial, Type.GodanVerb, Reason.Past],
  ['往って', '往く', Type.Initial, Type.GodanVerb, Reason.Te],
  ['請うた', '請う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['請うて', '請う', Type.Initial, Type.GodanVerb, Reason.Te],
  ['乞うた', '乞う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['乞うて', '乞う', Type.Initial, Type.GodanVerb, Reason.Te],
  ['恋うた', '恋う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['恋うて', '恋う', Type.Initial, Type.GodanVerb, Reason.Te],
  ['問うた', '問う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['問うて', '問う', Type.Initial, Type.GodanVerb, Reason.Te],
  ['負うた', '負う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['負うて', '負う', Type.Initial, Type.GodanVerb, Reason.Te],
  ['沿うた', '沿う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['沿うて', '沿う', Type.Initial, Type.GodanVerb, Reason.Te],
  ['添うた', '添う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['添うて', '添う', Type.Initial, Type.GodanVerb, Reason.Te],
  ['副うた', '副う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['副うて', '副う', Type.Initial, Type.GodanVerb, Reason.Te],
  ['厭うた', '厭う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['厭うて', '厭う', Type.Initial, Type.GodanVerb, Reason.Te],
  // -------------- 2 --------------
  ['いた', 'く', Type.Initial, Type.GodanVerb, Reason.Past],
  ['いだ', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Past],
  ['いて', 'く', Type.Initial, Type.GodanVerb, Reason.Te],
  ['いで', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Te],
  ['えば', 'う', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['える', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['おう', 'う', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['仰い', '仰る', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['仰い', '仰る', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['かず', 'く', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['がず', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['かぬ', 'く', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['かん', 'く', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['がぬ', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['がん', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['きた', 'くる', Type.Initial, Type.KuruVerb, Reason.Past],
  ['きて', 'くる', Type.Initial, Type.KuruVerb, Reason.Te],
  ['くて', 'い', Type.Initial, Type.IAdj, Reason.Te],
  ['けば', 'く', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['げば', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['ける', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['げる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['こい', 'くる', Type.Initial, Type.KuruVerb, Reason.Imperative],
  ['こう', 'く', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['ごう', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['こず', 'くる', Type.Initial, Type.KuruVerb, Reason.Zu],
  ['こぬ', 'くる', Type.Initial, Type.KuruVerb, Reason.Negative],
  ['こん', 'くる', Type.Initial, Type.KuruVerb, Reason.Negative],
  ['さず', 'す', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['さぬ', 'す', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['さん', 'す', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['した', 'す', Type.Initial, Type.GodanVerb | Type.SuruVerb, Reason.Past],
  ['した', 'する', Type.Initial, Type.SuruVerb, Reason.Past],
  ['して', 'す', Type.Initial, Type.GodanVerb | Type.SuruVerb, Reason.Te],
  ['して', 'する', Type.Initial, Type.SuruVerb, Reason.Te],
  ['しろ', 'す', Type.Initial, Type.SuruVerb, Reason.Imperative],
  ['しろ', 'する', Type.Initial, Type.SuruVerb, Reason.Imperative],
  ['する', '', Type.SuruVerb, Type.NounVS, Reason.SuruNoun],
  ['せず', 'する', Type.Initial, Type.SuruVerb, Reason.Zu],
  ['せぬ', 'する', Type.Initial, Type.SuruVerb, Reason.Negative],
  ['せん', 'する', Type.Initial, Type.SuruVerb, Reason.Negative],
  ['せず', 'す', Type.Initial, Type.SuruVerb, Reason.Zu],
  ['せぬ', 'す', Type.Initial, Type.SuruVerb, Reason.Negative],
  ['せん', 'す', Type.Initial, Type.SuruVerb, Reason.Negative],
  ['せば', 'す', Type.Initial, Type.GodanVerb | Type.SuruVerb, Reason.Ba],
  ['せよ', 'する', Type.Initial, Type.SuruVerb, Reason.Imperative],
  ['せよ', 'す', Type.Initial, Type.SuruVerb, Reason.Imperative],
  ['せる', 'す', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['そう', 'い', Type.Initial, Type.IAdj, Reason.Sou],
  ['そう', 'す', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['そう', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Sou],
  ['たい', 'る', Type.IAdj, Type.IchidanVerb | Type.KuruVerb, Reason.Tai],
  ['たず', 'つ', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['たぬ', 'つ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['たん', 'つ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['たら', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Tara],
  ['たり', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Tari],
  ['った', 'う', Type.Initial, Type.GodanVerb, Reason.Past],
  ['った', 'つ', Type.Initial, Type.GodanVerb, Reason.Past],
  ['った', 'る', Type.Initial, Type.GodanVerb, Reason.Past],
  ['って', 'う', Type.Initial, Type.GodanVerb, Reason.Te],
  ['って', 'つ', Type.Initial, Type.GodanVerb, Reason.Te],
  ['って', 'る', Type.Initial, Type.GodanVerb, Reason.Te],
  ['てば', 'つ', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['てる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  [
    'てる',
    'る',
    Type.IchidanVerb,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.Continuous,
  ],
  ['とう', 'つ', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['とく', 'る', Type.GodanVerb, Type.IchidanVerb | Type.KuruVerb, Reason.Toku],
  [
    'ない',
    'る',
    Type.IAdj | Type.VNai,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.Negative,
  ],
  ['なず', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['なぬ', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['なん', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['ねば', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['ねる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['のう', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['ばず', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['ばぬ', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['ばん', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['べば', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['べる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['ぼう', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['ます', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Polite],
  ['まず', 'む', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['まぬ', 'む', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['まん', 'む', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['めば', 'む', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['める', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['もう', 'む', Type.Initial, Type.GodanVerb, Reason.Volitional],
  [
    'よう',
    'る',
    Type.Initial,
    Type.IchidanVerb | Type.KuruVerb,
    Reason.Volitional,
  ],
  ['らず', 'る', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['らぬ', 'る', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['らん', 'る', Type.Initial, Type.GodanVerb, Reason.Negative],
  [
    'れば',
    'る',
    Type.Initial,
    Type.IchidanVerb | Type.GodanVerb | Type.KuruVerb | Type.SuruVerb,
    Reason.Ba,
  ],
  [
    'れる',
    'る',
    Type.IchidanVerb,
    Type.IchidanVerb | Type.GodanVerb,
    Reason.Potential,
  ],
  ['ろう', 'る', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['わず', 'う', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['わぬ', 'う', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['わん', 'う', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['んだ', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Past],
  ['んだ', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Past],
  ['んだ', 'む', Type.Initial, Type.GodanVerb, Reason.Past],
  ['んで', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Te],
  ['んで', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Te],
  ['んで', 'む', Type.Initial, Type.GodanVerb, Reason.Te],
  // -------------- 1 --------------
  ['い', 'いる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['い', 'う', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['い', 'る', Type.Initial, Type.KuruVerb, Reason.Imperative],
  ['え', 'う', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['え', 'える', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['き', 'きる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['き', 'く', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['き', 'くる', Type.Initial, Type.KuruVerb, Reason.MasuStem],
  ['ぎ', 'ぎる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ぎ', 'ぐ', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['き', 'い', Type.Initial, Type.IAdj, Reason.Ki],
  ['く', 'い', Type.Initial, Type.IAdj, Reason.Adv],
  ['け', 'く', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['け', 'ける', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['げ', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['げ', 'げる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['さ', 'い', Type.Initial, Type.IAdj, Reason.Noun],
  ['し', 'す', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['じ', 'じる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ず', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Zu],
  ['せ', 'す', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['せ', 'せる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ぜ', 'ぜる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['た', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Past],
  ['ち', 'ちる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ち', 'つ', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['て', 'つ', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['て', 'てる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['て', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Te],
  ['で', 'でる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  [
    'な',
    '',
    Type.Initial,
    Type.IchidanVerb | Type.GodanVerb | Type.KuruVerb | Type.SuruVerb,
    Reason.ImperativeNegative,
  ],
  ['に', 'にる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['に', 'ぬ', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['ぬ', 'る', Type.Initial, Type.IchidanVerb, Reason.Negative],
  ['ん', 'る', Type.Initial, Type.IchidanVerb, Reason.Negative],
  ['ね', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['ね', 'ねる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ひ', 'ひる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['び', 'びる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['び', 'ぶ', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['へ', 'へる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['べ', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['べ', 'べる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['み', 'みる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['み', 'む', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['め', 'む', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['め', 'める', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['よ', 'る', Type.Initial, Type.IchidanVerb, Reason.Imperative],
  ['り', 'りる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['り', 'る', Type.Initial, Type.GodanVerb, Reason.MasuStem],
  ['れ', 'る', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['れ', 'れる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ろ', 'る', Type.Initial, Type.IchidanVerb, Reason.Imperative],
];

const enum Type {
  // Final word type
  IchidanVerb = 1 << 0, // i.e. ru-verbs
  GodanVerb = 1 << 1, // i.e. u-verbs
  IAdj = 1 << 2,
  KuruVerb = 1 << 3,
  SuruVerb = 1 << 4,
  NounVS = 1 << 5,
  All = IchidanVerb | GodanVerb | IAdj | KuruVerb | SuruVerb | NounVS,
  // Intermediate types
  Initial = 1 << 6, // original word before any deinflection (from-type only)
  VNai = 1 << 7,
}

export { Type as WordType };

interface DeinflectRule {
  from: string;
  to: string;
  // A bit mask representing the type of words to which this rule can be
  // applied.
  //
  // For example, 遊びすぎる would match the びすぎる→ぶ rule where the from
  // type is an ichidan/ru-verb while the to type is a godan/u-verb.
  //
  // The fromType may also have the special value Initial which means it accepts
  // anything BUT one of the other word types.
  //
  // For example, consider the deinflection rule that allows 食べ (imperative)
  // to be de-inflected to 食べる: べ→べる. In this case, the to-type is an
  // ichidan/ru-verb, while the from type is basically anything but NOT the
  // result of any other deinflection (since they never produce verb stems).
  // For this case we set the from-type to Initial so that it does NOT match
  // any of the existing word types but it DOES match when we compare with 0xff
  // (the type we use for the initial input).
  //
  // These fields are bit masks since there can be multiple types
  // accepted. For example, for the rule ませんでした→る the deinflected word
  // could be an ichidan/ru-verb (e.g. 食べる) but it could also be the special
  // verb 来る (when it is written in hiragana a different rule will match). As
  // a result, the to-type needs to represent both of these possibilities.
  fromType: number;
  toType: number;
  reason: Reason;
}

interface DeinflectRuleGroup {
  rules: Array<DeinflectRule>;
  fromLen: number;
}

const deinflectRuleGroups: Array<DeinflectRuleGroup> = [];

function getDeinflectRuleGroups() {
  if (!deinflectRuleGroups.length) {
    let prevLen = -1;
    let ruleGroup: DeinflectRuleGroup;

    for (const [from, to, fromType, toType, reason] of deinflectRuleData) {
      const rule: DeinflectRule = { from, to, fromType, toType, reason };

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
  reasons: Array<Array<Reason>>;
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
  let result: Array<CandidateWord> = [];
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
    const thisCandidate = result[i];

    // Don't deinflect masu-stem results any further since they should already
    // be the plain form.
    //
    // Without this we would take something like 食べて, try deinflecting it as
    // a masu stem into 食べてる and then try de-inflecting it as a continuous
    // form. However, we should just stop immediately after de-inflecting to
    // the plain form.
    if (
      thisCandidate.reasons.length === 1 &&
      thisCandidate.reasons[0].length === 1 &&
      thisCandidate.reasons[0][0] === Reason.MasuStem
    ) {
      continue;
    }

    const word = thisCandidate.word;
    const type = thisCandidate.type;

    for (const ruleGroup of ruleGroups) {
      if (ruleGroup.fromLen > word.length) {
        continue;
      }

      const ending = word.slice(-ruleGroup.fromLen);
      const hiraganaEnding = kanaToHiragana(ending);

      for (const rule of ruleGroup.rules) {
        if (!(type & rule.fromType)) {
          continue;
        }

        if (ending !== rule.from && hiraganaEnding !== rule.from) {
          continue;
        }

        const newWord =
          word.substring(0, word.length - rule.from.length) + rule.to;
        if (newWord.length <= 1) {
          continue;
        }

        // If we already have a candidate for this word with the same
        // 'to' type(s), expand the possible reasons.
        //
        // If the 'to' type(s) differ, then we'll add a separate candidate
        // and just hope that when we go to match against dictionary words
        // we'll filter out the mismatching one(s).
        if (resultIndex[newWord]) {
          const candidate = result[resultIndex[newWord]];
          if (candidate.type === rule.toType) {
            // Start a new reason chain
            candidate.reasons.unshift([rule.reason]);
            continue;
          }
        }
        resultIndex[newWord] = result.length;

        //
        // Start a new candidate
        //

        // Deep clone multidimensional array
        const reasons = [];
        for (const array of thisCandidate.reasons) {
          reasons.push([...array]);
        }

        // Add our new reason in
        //
        // If we already have reason chains, prepend to the first chain
        if (reasons.length) {
          const firstReasonChain = reasons[0];

          // Rather having causative + passive, combine the two rules into
          // "causative passive":
          if (
            rule.reason === Reason.Causative &&
            firstReasonChain.length &&
            firstReasonChain[0] === Reason.PotentialOrPassive
          ) {
            firstReasonChain.splice(0, 1, Reason.CausativePassive);
          } else if (
            // If we're inflecting a Vない type word back to V, then we don't want
            // to add the "negative" reason since it's already expected to be in
            // negative form.
            thisCandidate.type === Type.VNai &&
            rule.reason === Reason.Negative
          ) {
            // Do nothing
          } else {
            firstReasonChain.unshift(rule.reason);
          }
        } else {
          // Add new reason to the start of the chain
          reasons.push([rule.reason]);
        }

        const candidate: CandidateWord = {
          reasons,
          type: rule.toType,
          word: newWord,
        };

        result.push(candidate);
      }
    }
  } while (++i < result.length);

  // Post-process to filter out any lingering intermediate forms
  result = result.filter((r) => r.type & Type.All);

  return result;
}
