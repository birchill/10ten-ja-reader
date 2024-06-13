import { kanaToHiragana } from '@birchill/normal-jp';

export const enum Reason {
  None,
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
  TaTeStem = 1 << 8,
  DaDeStem = 1 << 9,
  MasuStem = 1 << 10,
}

export { Type as WordType };

type DeinflectRule = {
  from: string;
  to: string;
  // A bit mask representing the type of words to which this rule can be
  // applied.
  //
  // For example, 遊びすぎる would match the "すぎる"→"" rule where the from-type
  // is an ichidan/ru-verb while the to-type is the intermediate type masu-stem.
  // The remaining 遊び would then match the "び"→"ぶ" rule where the from-type
  // is the intermediate type masu-stem while the to-type is a godan/u-verb.
  //
  // Intermediate types ensure that some rules are only applied in specific
  // conditions.
  //
  // For example, consider the deinflection rule "ます"→"". Without the to-type
  // masu-stem everything following--not just the correct masu stem--would
  // match it. "食べろます" would be parsed as "< imperative < polite", which
  // is obviously not correct.
  //
  // Similarly, the type Intial ensures that a rule is only applied when it
  // is at the very end of an inflecting word, as every to-type is different
  // from it.
  //
  // These fields are bit masks since there can be multiple types
  // accepted. For example, for the rule ませんでした→る the deinflected word
  // could be an ichidan/ru-verb (e.g. 食べる) but it could also be the special
  // verb 来る (when it is written in hiragana a different rule will match). As
  // a result, the to-type needs to represent both of these possibilities.
  fromType: number;
  toType: number;
  reason: Reason;
};

// prettier-ignore
const deinflectRuleData: Array<
  [from: string, to: string, fromType: number, toType: number, reason: Reason]
> = [
  // -------------- 6 --------------
  ['いらっしゃい', 'いらっしゃる', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['いらっしゃい', 'いらっしゃる', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['くありません', 'い', Type.Initial, Type.IAdj, Reason.PoliteNegative],
  ['ざるをえない', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざるを得ない', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ませんでした', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.PolitePastNegative],
  ['ませんでした', '', Type.Initial, Type.MasuStem, Reason.PolitePastNegative],
  // -------------- 5 --------------
  ['おっしゃい', 'おっしゃる', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['おっしゃい', 'おっしゃる', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['ざるえない', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざる得ない', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざるをえぬ', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざるを得ぬ', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  // -------------- 4 --------------
  ['かされる', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['かったら', 'い', Type.Initial, Type.IAdj, Reason.Tara],
  ['かったり', 'い', Type.Initial, Type.IAdj, Reason.Tari],
  ['がされる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['ください', 'くださる', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['こさせる', 'くる', Type.IchidanVerb, Type.KuruVerb, Reason.Causative],
  ['こられる', 'くる', Type.IchidanVerb, Type.KuruVerb, Reason.PotentialOrPassive],
  ['ざるえぬ', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['ざる得ぬ', 'ない', Type.IAdj, Type.VNai, Reason.ZaruWoEnai],
  ['たされる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['なされる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['のたもう', 'のたまう', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['ばされる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['まされる', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['ましょう', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.PoliteVolitional],
  ['ましょう', '', Type.Initial, Type.MasuStem, Reason.PoliteVolitional],
  ['らされる', 'る', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['わされる', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.CausativePassive],
  ['来させる', '来る', Type.IchidanVerb, Type.KuruVerb, Reason.Causative],
  ['來させる', '來る', Type.IchidanVerb, Type.KuruVerb, Reason.Causative],
  ['来られる', '来る', Type.IchidanVerb, Type.KuruVerb, Reason.PotentialOrPassive],
  ['來られる', '來る', Type.IchidanVerb, Type.KuruVerb, Reason.PotentialOrPassive],
  // -------------- 3 --------------
  ['かせる', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['がせる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['かった', 'い', Type.Initial, Type.IAdj, Reason.Past],
  ['かない', 'く', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['がない', 'ぐ', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['かれる', 'く', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['がれる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['下さい', '下さる', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['くない', 'い', Type.IAdj | Type.VNai, Type.IAdj, Reason.Negative],
  ['ければ', 'い', Type.Initial, Type.IAdj, Reason.Ba],
  ['こない', 'くる', Type.IAdj | Type.VNai, Type.KuruVerb, Reason.Negative],
  ['こよう', 'くる', Type.Initial, Type.KuruVerb, Reason.Volitional],
  ['これる', 'くる', Type.IchidanVerb, Type.KuruVerb, Reason.Potential],
  ['来れる', '来る', Type.IchidanVerb, Type.KuruVerb, Reason.Potential],
  ['來れる', '來る', Type.IchidanVerb, Type.KuruVerb, Reason.Potential],
  ['ござい', 'ござる', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['ご座い', 'ご座る', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['御座い', '御座る', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['させる', 'する', Type.IchidanVerb, Type.SuruVerb, Reason.Causative],
  ['させる', 'る', Type.IchidanVerb, Type.IchidanVerb, Reason.Causative],
  ['させる', 'す', Type.IchidanVerb, Type.GodanVerb | Type.SuruVerb, Reason.Causative],
  ['さない', 'す', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['される', 'す', Type.IchidanVerb, Type.GodanVerb | Type.SuruVerb, Reason.Passive],
  ['される', 'する', Type.IchidanVerb, Type.SuruVerb, Reason.Passive],
  ['しない', 'する', Type.IAdj | Type.VNai, Type.SuruVerb, Reason.Negative],
  ['しよう', 'する', Type.Initial, Type.SuruVerb, Reason.Volitional],
  ['じゃう', '', Type.GodanVerb, Type.DaDeStem, Reason.Chau],
  ['すぎる', 'い', Type.IchidanVerb, Type.IAdj, Reason.Sugiru],
  ['すぎる', 'る', Type.IchidanVerb, Type.IchidanVerb | Type.KuruVerb, Reason.Sugiru],
  ['すぎる', '', Type.IchidanVerb, Type.MasuStem, Reason.Sugiru],
  ['たせる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['たない', 'つ', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['たまう', 'たまう', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['たもう', 'たもう', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['たれる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['ちゃう', 'る', Type.GodanVerb, Type.IchidanVerb | Type.KuruVerb, Reason.Chau],
  ['ちゃう', '', Type.GodanVerb, Type.TaTeStem, Reason.Chau],
  ['ている', 'る', Type.IchidanVerb, Type.IchidanVerb | Type.KuruVerb, Reason.Continuous],
  ['ている', '', Type.IchidanVerb, Type.TaTeStem, Reason.Continuous],
  ['でいる', '', Type.IchidanVerb, Type.DaDeStem, Reason.Continuous],
  ['できる', 'する', Type.IchidanVerb, Type.SuruVerb, Reason.Potential],
  ['ないで', 'ない', Type.Initial, Type.VNai, Reason.NegativeTe],
  ['なさい', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Nasai],
  ['なさい', '', Type.Initial, Type.MasuStem, Reason.Nasai],
  ['なせる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['なない', 'ぬ', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['なれる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['ばせる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['ばない', 'ぶ', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['ばれる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['ました', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.PolitePast],
  ['ました', '', Type.Initial, Type.MasuStem, Reason.PolitePast],
  ['ませる', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['ません', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.PoliteNegative],
  ['ません', '', Type.Initial, Type.MasuStem, Reason.PoliteNegative],
  ['まない', 'む', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['まれる', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['らせる', 'る', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['らない', 'る', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['られる', 'る', Type.IchidanVerb, Type.IchidanVerb | Type.KuruVerb, Reason.PotentialOrPassive],
  ['られる', 'る', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  ['わせる', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.Causative],
  ['わない', 'う', Type.IAdj | Type.VNai, Type.GodanVerb, Reason.Negative],
  ['われる', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.Passive],
  // -------------- 2 --------------
  ['えば', 'う', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['える', 'う', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['おう', 'う', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['仰い', '仰る', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['仰い', '仰る', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['かず', 'く', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['がず', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['かぬ', 'く', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['かん', 'く', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['がぬ', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['がん', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Negative],
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
  ['そう', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Sou],
  ['そう', '', Type.Initial, Type.MasuStem, Reason.Sou],
  ['そう', 'い', Type.Initial, Type.IAdj, Reason.Sou],
  ['そう', 'す', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['たい', 'る', Type.IAdj, Type.IchidanVerb | Type.KuruVerb, Reason.Tai],
  ['たい', '', Type.IAdj, Type.MasuStem, Reason.Tai],
  ['たず', 'つ', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['たぬ', 'つ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['たん', 'つ', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['たら', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Tara],
  ['たら', '', Type.Initial, Type.TaTeStem, Reason.Tara],
  ['だら', '', Type.Initial, Type.DaDeStem, Reason.Tara],
  ['たり', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Tari],
  ['たり', '', Type.Initial, Type.TaTeStem, Reason.Tari],
  ['だり', '', Type.Initial, Type.DaDeStem, Reason.Tari],
  ['てば', 'つ', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['てる', 'つ', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['てる', 'る', Type.IchidanVerb, Type.IchidanVerb | Type.KuruVerb, Reason.Continuous],
  ['てる', '', Type.IchidanVerb, Type.TaTeStem, Reason.Continuous],
  ['でる', '', Type.IchidanVerb, Type.DaDeStem, Reason.Continuous],
  ['とう', 'つ', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['とく', 'る', Type.GodanVerb, Type.IchidanVerb | Type.KuruVerb, Reason.Toku],
  ['とく', '', Type.GodanVerb, Type.TaTeStem, Reason.Toku],
  ['どく', '', Type.GodanVerb, Type.DaDeStem, Reason.Toku],
  ['ない', 'る', Type.IAdj | Type.VNai, Type.IchidanVerb | Type.KuruVerb, Reason.Negative],
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
  ['ます', '', Type.Initial, Type.MasuStem, Reason.Polite],
  ['まず', 'む', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['まぬ', 'む', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['まん', 'む', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['めば', 'む', Type.Initial, Type.GodanVerb, Reason.Ba],
  ['める', 'む', Type.IchidanVerb, Type.GodanVerb, Reason.Potential],
  ['もう', 'む', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['よう', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Volitional],
  ['らず', 'る', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['らぬ', 'る', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['らん', 'る', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['れば', 'る', Type.Initial, Type.IchidanVerb | Type.GodanVerb | Type.KuruVerb | Type.SuruVerb, Reason.Ba],
  ['れる', 'る', Type.IchidanVerb, Type.IchidanVerb | Type.GodanVerb, Reason.Potential],
  ['ろう', 'る', Type.Initial, Type.GodanVerb, Reason.Volitional],
  ['わず', 'う', Type.Initial, Type.GodanVerb, Reason.Zu],
  ['わぬ', 'う', Type.Initial, Type.GodanVerb, Reason.Negative],
  ['わん', 'う', Type.Initial, Type.GodanVerb, Reason.Negative],
  // Irregular て-form stems
  ['いっ', 'いく', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['おう', 'おう', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['こう', 'こう', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['そう', 'そう', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['とう', 'とう', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['行っ', '行く', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['逝っ', '逝く', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['往っ', '往く', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['請う', '請う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['乞う', '乞う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['恋う', '恋う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['問う', '問う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['負う', '負う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['沿う', '沿う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['添う', '添う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['副う', '副う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['厭う', '厭う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['給う', '給う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['賜う', '賜う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  // -------------- 1 --------------
  ['い', 'いる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['い', 'う', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['い', 'く', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['い', 'ぐ', Type.DaDeStem, Type.GodanVerb, Reason.None],
  ['い', 'る', Type.Initial, Type.KuruVerb, Reason.Imperative],
  ['え', 'う', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['え', 'える', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['き', 'い', Type.Initial, Type.IAdj, Reason.Ki],
  ['き', 'きる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['き', 'く', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['き', 'くる', Type.TaTeStem, Type.KuruVerb, Reason.None],
  ['き', 'くる', Type.MasuStem, Type.KuruVerb, Reason.MasuStem],
  ['ぎ', 'ぎる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ぎ', 'ぐ', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['く', 'い', Type.Initial, Type.IAdj, Reason.Adv],
  ['け', 'く', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['け', 'ける', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['げ', 'ぐ', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['げ', 'げる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['さ', 'い', Type.Initial, Type.IAdj, Reason.Noun],
  ['し', 'す', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['し', 'する', Type.MasuStem, Type.SuruVerb, Reason.MasuStem],
  ['し', 'す', Type.TaTeStem, Type.GodanVerb | Type.SuruVerb, Reason.None],
  ['し', 'する', Type.TaTeStem, Type.SuruVerb, Reason.None],
  ['じ', 'じる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ず', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Zu],
  ['せ', 'す', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['せ', 'せる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ぜ', 'ぜる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['た', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Past],
  ['た', '', Type.Initial, Type.TaTeStem, Reason.Past],
  ['だ', '', Type.Initial, Type.DaDeStem, Reason.Past],
  ['ち', 'ちる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ち', 'つ', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['っ', 'う', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['っ', 'つ', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['っ', 'る', Type.TaTeStem, Type.GodanVerb, Reason.None],
  ['て', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, Reason.Te],
  ['て', '', Type.Initial, Type.TaTeStem, Reason.Te],
  ['て', 'つ', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['て', 'てる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['で', '', Type.Initial, Type.DaDeStem, Reason.Te],
  ['で', 'でる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['な', '', Type.Initial, Type.IchidanVerb | Type.GodanVerb | Type.KuruVerb | Type.SuruVerb, Reason.ImperativeNegative],
  ['に', 'にる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['に', 'ぬ', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['ぬ', 'る', Type.Initial, Type.IchidanVerb, Reason.Negative],
  ['ん', 'る', Type.Initial, Type.IchidanVerb, Reason.Negative],
  ['ね', 'ぬ', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['ね', 'ねる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ひ', 'ひる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['び', 'びる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['び', 'ぶ', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['へ', 'へる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['べ', 'ぶ', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['べ', 'べる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['み', 'みる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['み', 'む', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['め', 'む', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['め', 'める', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['よ', 'る', Type.Initial, Type.IchidanVerb, Reason.Imperative],
  ['り', 'りる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['り', 'る', Type.MasuStem, Type.GodanVerb, Reason.MasuStem],
  ['れ', 'る', Type.Initial, Type.GodanVerb, Reason.Imperative],
  ['れ', 'れる', Type.Initial, Type.IchidanVerb, Reason.MasuStem],
  ['ろ', 'る', Type.Initial, Type.IchidanVerb, Reason.Imperative],
  ['ん', 'ぬ', Type.DaDeStem, Type.GodanVerb, Reason.None],
  ['ん', 'ぶ', Type.DaDeStem, Type.GodanVerb, Reason.None],
  ['ん', 'む', Type.DaDeStem, Type.GodanVerb, Reason.None],
];

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
    // Initially, the type of word is unknown, so we set the type mask
    // to match all rules except the TaTe/DaDe-stems, as they don't make
    // sense on their own.
    type: 0xffff ^ (Type.TaTeStem | Type.DaDeStem),
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
        if (!newWord.length) {
          continue;
        }

        // If we already have a candidate for this word with the same
        // 'to' type(s), expand the possible reasons by starting a new
        // reason chain.
        //
        // We do not want to start a new reason chain with the 'none'
        // reason, as it cannot stand on its own and needs a preceding
        // rule to make sense.
        //
        // If the 'to' type(s) differ, then we'll add a separate candidate
        // and just hope that when we go to match against dictionary words
        // we'll filter out the mismatching one(s).
        if (resultIndex[newWord]) {
          const candidate = result[resultIndex[newWord]];
          if (candidate.type === rule.toType) {
            if (rule.reason !== Reason.None) {
              // Start a new reason chain
              candidate.reasons.unshift([rule.reason]);
            }
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
            // Don't add the "none" reason.
            rule.reason === Reason.None ||
            // Add the "masu" reason only if the word is solely the masu stem.
            (rule.reason === Reason.MasuStem && firstReasonChain.length) ||
            // If we're inflecting a Vない type word back to V, then we don't want
            // to add the "negative" reason since it's already expected to be in
            // negative form.
            (thisCandidate.type === Type.VNai &&
              rule.reason === Reason.Negative)
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
