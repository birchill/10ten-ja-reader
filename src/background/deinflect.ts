import { kanaToHiragana } from '@birchill/normal-jp';

export const enum Reason {
  PolitePastNegative,
  PoliteNegative,
  PoliteVolitional,
  Chau,
  Sugiru,
  PolitePast,
  Tara,
  Tari,
  Causative,
  PotentialOrPassive,
  Toku,
  Sou,
  Tai,
  Polite,
  Respectful,
  Humble,
  HumbleOrKansaiDialect,
  Past,
  Negative,
  Passive,
  Ba,
  Volitional,
  Potential,
  EruUru,
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
  Irregular,
}

export const deinflectL10NKeys: { [key: number]: string } = {
  [Reason.Respectful]: 'deinflect_respectful',
  [Reason.Humble]: 'deinflect_humble',
  [Reason.HumbleOrKansaiDialect]: 'deinflect_humble_or_kansai_dialect',
  [Reason.PolitePastNegative]: 'deinflect_polite_past_negative',
  [Reason.PoliteNegative]: 'deinflect_polite_negative',
  [Reason.PoliteVolitional]: 'deinflect_polite_volitional',
  [Reason.Chau]: 'deinflect_chau',
  [Reason.Sugiru]: 'deinflect_sugiru',
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
  [Reason.EruUru]: 'deinflect_eru_uru',
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
  [Reason.Irregular]: 'deinflect_irregular',
};

const enum Type {
  // Final word type
  IchidanVerb = 1 << 0, // i.e. ru-verbs
  GodanVerb = 1 << 1, // i.e. u-verbs
  IAdj = 1 << 2,
  KuruVerb = 1 << 3,
  SuruVerb = 1 << 4,
  SpecialSuruVerb = 1 << 5,
  NounVS = 1 << 6,
  All = IchidanVerb |
    GodanVerb |
    IAdj |
    KuruVerb |
    SuruVerb |
    SpecialSuruVerb |
    NounVS,
  // Intermediate types
  Initial = 1 << 7, // original word before any deinflection (from-type only)
  TaTeStem = 1 << 8,
  DaDeStem = 1 << 9,
  MasuStem = 1 << 10,
  IrrealisStem = 1 << 11,
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
  reasons: Array<Reason>;
};

// prettier-ignore
const deinflectRuleData: Array<
  [from: string, to: string, fromType: number, toType: number, reasons: Array<Reason>]
> = [
  // -------------- 7 --------------
  ['ていらっしゃい', '', Type.Initial, Type.TaTeStem, [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
  ['ていらっしゃる', '', Type.GodanVerb, Type.TaTeStem, [Reason.Respectful, Reason.Continuous]],
  ['でいらっしゃい', '', Type.Initial, Type.DaDeStem, [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
  ['でいらっしゃる', '', Type.GodanVerb, Type.DaDeStem, [Reason.Respectful, Reason.Continuous]],
  // -------------- 6 --------------
  ['いらっしゃい', 'いらっしゃる', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['いらっしゃい', 'いらっしゃる', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['くありません', 'い', Type.Initial, Type.IAdj, [Reason.PoliteNegative]],
  ['ざるをえない', '', Type.IAdj, Type.IrrealisStem, [Reason.ZaruWoEnai]],
  ['ざるを得ない', '', Type.IAdj, Type.IrrealisStem, [Reason.ZaruWoEnai]],
  ['ませんでした', '', Type.Initial, Type.MasuStem, [Reason.PolitePastNegative]],
  ['てらっしゃい', '', Type.Initial, Type.TaTeStem, [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
  ['てらっしゃい', 'てらっしゃる', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['てらっしゃる', '', Type.GodanVerb, Type.TaTeStem, [Reason.Respectful, Reason.Continuous]],
  ['でらっしゃい', '', Type.Initial, Type.DaDeStem, [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
  ['でらっしゃい', 'でらっしゃる', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['でらっしゃる', '', Type.GodanVerb, Type.DaDeStem, [Reason.Respectful, Reason.Continuous]],
  // -------------- 5 --------------
  ['おっしゃい', 'おっしゃる', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['おっしゃい', 'おっしゃる', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['ざるえない', '', Type.IAdj, Type.IrrealisStem, [Reason.ZaruWoEnai]],
  ['ざる得ない', '', Type.IAdj, Type.IrrealisStem, [Reason.ZaruWoEnai]],
  ['ざるをえぬ', '', Type.IAdj, Type.IrrealisStem, [Reason.ZaruWoEnai]],
  ['ざるを得ぬ', '', Type.IAdj, Type.IrrealisStem, [Reason.ZaruWoEnai]],
  // -------------- 4 --------------
  ['かったら', 'い', Type.Initial, Type.IAdj, [Reason.Tara]],
  ['かったり', 'い', Type.Initial, Type.IAdj, [Reason.Tari]],
  ['ください', 'くださる', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['ください', 'くださる', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['こさせる', 'くる', Type.IchidanVerb, Type.KuruVerb, [Reason.Causative]],
  ['こられる', 'くる', Type.IchidanVerb, Type.KuruVerb, [Reason.PotentialOrPassive]],
  ['さないで', 'する', Type.Initial, Type.SpecialSuruVerb, [Reason.Irregular, Reason.NegativeTe]],
  ['ざるえぬ', '', Type.IAdj, Type.IrrealisStem, [Reason.ZaruWoEnai]],
  ['ざる得ぬ', '', Type.IAdj, Type.IrrealisStem, [Reason.ZaruWoEnai]],
  ['しないで', 'する', Type.Initial, Type.SuruVerb, [Reason.NegativeTe]],
  ['しさせる', 'する', Type.IchidanVerb, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Causative]],
  ['しられる', 'する', Type.IchidanVerb, Type.SpecialSuruVerb, [Reason.Irregular, Reason.PotentialOrPassive]],
  ['せさせる', 'する', Type.IchidanVerb, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Causative]],
  ['せられる', 'する', Type.IchidanVerb, Type.SpecialSuruVerb, [Reason.Irregular, Reason.PotentialOrPassive]],
  ['ぜさせる', 'ずる', Type.IchidanVerb, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Causative]],
  ['ぜられる', 'ずる', Type.IchidanVerb, Type.SpecialSuruVerb, [Reason.Irregular, Reason.PotentialOrPassive]],
  ['たゆたう', 'たゆたう', Type.TaTeStem, Type.GodanVerb, []],
  ['たゆとう', 'たゆとう', Type.TaTeStem, Type.GodanVerb, []],
  ['のたまう', 'のたまう', Type.TaTeStem, Type.GodanVerb, []],
  ['のたもう', 'のたもう', Type.TaTeStem, Type.GodanVerb, []],
  ['ましたら', '', Type.Initial, Type.MasuStem, [Reason.Polite, Reason.Tara]],
  ['ましたり', '', Type.Initial, Type.MasuStem, [Reason.Polite, Reason.Tari]],
  ['ましょう', '', Type.Initial, Type.MasuStem, [Reason.PoliteVolitional]],
  // -------------- 3 --------------
  ['いたす', '', Type.GodanVerb, Type.MasuStem, [Reason.Humble]],
  ['いたす', '', Type.GodanVerb, Type.NounVS, [Reason.SuruNoun, Reason.Humble]],
  ['かった', 'い', Type.Initial, Type.IAdj, [Reason.Past]],
  ['下さい', '下さる', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['下さい', '下さる', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['くない', 'い', Type.IAdj, Type.IAdj, [Reason.Negative]],
  ['ければ', 'い', Type.Initial, Type.IAdj, [Reason.Ba]],
  ['こよう', 'くる', Type.Initial, Type.KuruVerb, [Reason.Volitional]],
  ['これる', 'くる', Type.IchidanVerb, Type.KuruVerb, [Reason.Potential]],
  ['来れる', '来る', Type.IchidanVerb, Type.KuruVerb, [Reason.Potential]],
  ['來れる', '來る', Type.IchidanVerb, Type.KuruVerb, [Reason.Potential]],
  ['ござい', 'ござる', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['ご座い', 'ご座る', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['御座い', '御座る', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['させる', 'る', Type.IchidanVerb, Type.IchidanVerb | Type.KuruVerb, [Reason.Causative]],
  ['させる', 'する', Type.IchidanVerb, Type.SuruVerb, [Reason.Causative]],
  ['さない', 'する', Type.IAdj, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Negative]],
  ['される', '', Type.IchidanVerb, Type.IrrealisStem, [Reason.CausativePassive]],
  ['される', 'する', Type.IchidanVerb, Type.SuruVerb, [Reason.Passive]],
  ['しうる', 'する', Type.Initial, Type.SuruVerb, [Reason.EruUru]],
  ['しえる', 'する', Type.IchidanVerb, Type.SuruVerb, [Reason.EruUru]],
  ['しない', 'する', Type.IAdj, Type.SuruVerb, [Reason.Negative]],
  ['しよう', 'する', Type.Initial, Type.SuruVerb, [Reason.Volitional]],
  ['じゃう', '', Type.GodanVerb, Type.DaDeStem, [Reason.Chau]],
  ['すぎる', 'い', Type.IchidanVerb, Type.IAdj, [Reason.Sugiru]],
  ['すぎる', '', Type.IchidanVerb, Type.MasuStem, [Reason.Sugiru]],
  ['過ぎる', 'い', Type.IchidanVerb, Type.IAdj, [Reason.Sugiru]],
  ['過ぎる', '', Type.IchidanVerb, Type.MasuStem, [Reason.Sugiru]],
  ['ずれば', 'ずる', Type.Initial, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Ba]],
  ['たまう', 'たまう', Type.TaTeStem, Type.GodanVerb, []],
  ['たもう', 'たもう', Type.TaTeStem, Type.GodanVerb, []],
  ['揺蕩う', '揺蕩う', Type.TaTeStem, Type.GodanVerb, []],
  ['ちゃう', '', Type.GodanVerb, Type.TaTeStem, [Reason.Chau]],
  ['ている', '', Type.IchidanVerb, Type.TaTeStem, [Reason.Continuous]],
  ['ておる', '', Type.GodanVerb, Type.TaTeStem, [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
  ['でいる', '', Type.IchidanVerb, Type.DaDeStem, [Reason.Continuous]],
  ['でおる', '', Type.GodanVerb, Type.DaDeStem, [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
  ['できる', 'する', Type.IchidanVerb, Type.SuruVerb, [Reason.Potential]],
  ['ないで', '', Type.Initial, Type.IrrealisStem, [Reason.NegativeTe]],
  ['なさい', '', Type.Initial, Type.MasuStem, [Reason.Respectful, Reason.Imperative]],
  ['なさい', 'なさる', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['なさい', 'なさる', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['なさる', '', Type.GodanVerb, Type.MasuStem, [Reason.Respectful]],
  ['なさる', '', Type.GodanVerb, Type.NounVS, [Reason.SuruNoun, Reason.Respectful]],
  ['になる', '', Type.GodanVerb, Type.MasuStem, [Reason.Respectful]],
  ['になる', '', Type.GodanVerb, Type.NounVS, [Reason.SuruNoun, Reason.Respectful]],
  ['ました', '', Type.Initial, Type.MasuStem, [Reason.PolitePast]],
  ['まして', '', Type.Initial, Type.MasuStem, [Reason.Polite, Reason.Te]],
  ['ません', '', Type.Initial, Type.MasuStem, [Reason.PoliteNegative]],
  ['られる', 'る', Type.IchidanVerb, Type.IchidanVerb | Type.KuruVerb, [Reason.PotentialOrPassive]],
  // -------------- 2 --------------
  ['致す', '', Type.GodanVerb, Type.MasuStem, [Reason.Humble]],
  ['致す', '', Type.GodanVerb, Type.NounVS, [Reason.SuruNoun, Reason.Humble]],
  ['えば', 'う', Type.Initial, Type.GodanVerb, [Reason.Ba]],
  ['える', 'う', Type.IchidanVerb, Type.GodanVerb, [Reason.Potential]],
  ['得る', '', Type.IchidanVerb, Type.MasuStem, [Reason.EruUru]],
  ['おう', 'う', Type.Initial, Type.GodanVerb, [Reason.Volitional]],
  ['仰い', '仰る', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['仰い', '仰る', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['くて', 'い', Type.Initial, Type.IAdj, [Reason.Te]],
  ['けば', 'く', Type.Initial, Type.GodanVerb, [Reason.Ba]],
  ['げば', 'ぐ', Type.Initial, Type.GodanVerb, [Reason.Ba]],
  ['ける', 'く', Type.IchidanVerb, Type.GodanVerb, [Reason.Potential]],
  ['げる', 'ぐ', Type.IchidanVerb, Type.GodanVerb, [Reason.Potential]],
  ['こい', 'くる', Type.Initial, Type.KuruVerb, [Reason.Imperative]],
  ['こう', 'く', Type.Initial, Type.GodanVerb, [Reason.Volitional]],
  ['ごう', 'ぐ', Type.Initial, Type.GodanVerb, [Reason.Volitional]],
  ['しろ', 'する', Type.Initial, Type.SuruVerb, [Reason.Imperative]],
  ['さず', 'する', Type.Initial, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Zu]],
  ['すぎ', 'い', Type.Initial, Type.IAdj, [Reason.Sugiru]],
  ['すぎ', '', Type.Initial, Type.MasuStem, [Reason.Sugiru]],
  ['過ぎ', 'い', Type.Initial, Type.IAdj, [Reason.Sugiru]],
  ['過ぎ', '', Type.Initial, Type.MasuStem, [Reason.Sugiru]],
  ['する', '', Type.SuruVerb, Type.NounVS, [Reason.SuruNoun]],
  ['せず', 'する', Type.Initial, Type.SuruVerb, [Reason.Zu]],
  ['せぬ', 'する', Type.Initial, Type.SuruVerb, [Reason.Negative]],
  ['せん', 'する', Type.Initial, Type.SuruVerb, [Reason.Negative]],
  ['せば', 'す', Type.Initial, Type.GodanVerb, [Reason.Ba]],
  ['せば', 'する', Type.Initial, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Ba]],
  ['せよ', 'する', Type.Initial, Type.SuruVerb, [Reason.Imperative]],
  ['せる', 'す', Type.IchidanVerb, Type.GodanVerb, [Reason.Potential]],
  ['せる', '', Type.IchidanVerb, Type.IrrealisStem, [Reason.Causative]],
  ['ぜず', 'ずる', Type.Initial, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Zu]],
  ['ぜぬ', 'ずる', Type.Initial, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Negative]],
  ['ぜよ', 'ずる', Type.Initial, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Imperative]],
  ['そう', '', Type.Initial, Type.MasuStem, [Reason.Sou]],
  ['そう', 'い', Type.Initial, Type.IAdj, [Reason.Sou]],
  ['そう', 'す', Type.Initial, Type.GodanVerb, [Reason.Volitional]],
  ['そう', 'する', Type.Initial, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Volitional]],
  ['たい', '', Type.IAdj, Type.MasuStem, [Reason.Tai]],
  ['たら', '', Type.Initial, Type.TaTeStem, [Reason.Tara]],
  ['だら', '', Type.Initial, Type.DaDeStem, [Reason.Tara]],
  ['たり', '', Type.Initial, Type.TaTeStem, [Reason.Tari]],
  ['だり', '', Type.Initial, Type.DaDeStem, [Reason.Tari]],
  ['てば', 'つ', Type.Initial, Type.GodanVerb, [Reason.Ba]],
  ['てる', 'つ', Type.IchidanVerb, Type.GodanVerb, [Reason.Potential]],
  ['てる', '', Type.IchidanVerb, Type.TaTeStem, [Reason.Continuous]],
  ['でる', '', Type.IchidanVerb, Type.DaDeStem, [Reason.Continuous]],
  ['とう', 'つ', Type.Initial, Type.GodanVerb, [Reason.Volitional]],
  ['とく', '', Type.GodanVerb, Type.TaTeStem, [Reason.Toku]],
  ['とる', '', Type.GodanVerb, Type.TaTeStem, [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
  ['どく', '', Type.GodanVerb, Type.DaDeStem, [Reason.Toku]],
  ['どる', '', Type.GodanVerb, Type.DaDeStem, [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
  ['ない', '', Type.IAdj, Type.IrrealisStem, [Reason.Negative]],
  ['ねば', 'ぬ', Type.Initial, Type.GodanVerb, [Reason.Ba]],
  ['ねる', 'ぬ', Type.IchidanVerb, Type.GodanVerb, [Reason.Potential]],
  ['のう', 'ぬ', Type.Initial, Type.GodanVerb, [Reason.Volitional]],
  ['べば', 'ぶ', Type.Initial, Type.GodanVerb, [Reason.Ba]],
  ['べる', 'ぶ', Type.IchidanVerb, Type.GodanVerb, [Reason.Potential]],
  ['ぼう', 'ぶ', Type.Initial, Type.GodanVerb, [Reason.Volitional]],
  ['ます', '', Type.Initial, Type.MasuStem, [Reason.Polite]],
  ['ませ', '', Type.Initial, Type.MasuStem, [Reason.Polite, Reason.Imperative]],
  ['めば', 'む', Type.Initial, Type.GodanVerb, [Reason.Ba]],
  ['める', 'む', Type.IchidanVerb, Type.GodanVerb, [Reason.Potential]],
  ['もう', 'む', Type.Initial, Type.GodanVerb, [Reason.Volitional]],
  ['よう', 'る', Type.Initial, Type.IchidanVerb | Type.KuruVerb, [Reason.Volitional]],
  ['れば', 'る', Type.Initial, Type.IchidanVerb | Type.GodanVerb | Type.KuruVerb | Type.SuruVerb, [Reason.Ba]],
  ['れる', 'る', Type.IchidanVerb, Type.IchidanVerb | Type.GodanVerb, [Reason.Potential]],
  ['れる', '', Type.IchidanVerb, Type.IrrealisStem, [Reason.Passive]],
  ['ろう', 'る', Type.Initial, Type.GodanVerb, [Reason.Volitional]],
  // Irregular て-form stems
  ['いっ', 'いく', Type.TaTeStem, Type.GodanVerb, []],
  ['おう', 'おう', Type.TaTeStem, Type.GodanVerb, []],
  ['こう', 'こう', Type.TaTeStem, Type.GodanVerb, []],
  ['そう', 'そう', Type.TaTeStem, Type.GodanVerb, []],
  ['とう', 'とう', Type.TaTeStem, Type.GodanVerb, []],
  ['行っ', '行く', Type.TaTeStem, Type.GodanVerb, []],
  ['逝っ', '逝く', Type.TaTeStem, Type.GodanVerb, []],
  ['往っ', '往く', Type.TaTeStem, Type.GodanVerb, []],
  ['請う', '請う', Type.TaTeStem, Type.GodanVerb, []],
  ['乞う', '乞う', Type.TaTeStem, Type.GodanVerb, []],
  ['恋う', '恋う', Type.TaTeStem, Type.GodanVerb, []],
  ['問う', '問う', Type.TaTeStem, Type.GodanVerb, []],
  ['負う', '負う', Type.TaTeStem, Type.GodanVerb, []],
  ['沿う', '沿う', Type.TaTeStem, Type.GodanVerb, []],
  ['添う', '添う', Type.TaTeStem, Type.GodanVerb, []],
  ['副う', '副う', Type.TaTeStem, Type.GodanVerb, []],
  ['厭う', '厭う', Type.TaTeStem, Type.GodanVerb, []],
  ['給う', '給う', Type.TaTeStem, Type.GodanVerb, []],
  ['賜う', '賜う', Type.TaTeStem, Type.GodanVerb, []],
  ['宣う', '宣う', Type.TaTeStem, Type.GodanVerb, []],
  ['曰う', '曰う', Type.TaTeStem, Type.GodanVerb, []],
  // -------------- 1 --------------
  ['い', 'う', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['い', 'く', Type.TaTeStem, Type.GodanVerb, []],
  ['い', 'ぐ', Type.DaDeStem, Type.GodanVerb, []],
  ['い', 'る', Type.Initial, Type.KuruVerb, [Reason.Imperative]],
  ['え', 'う', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['か', 'く', Type.IrrealisStem, Type.GodanVerb, []],
  ['が', 'ぐ', Type.IrrealisStem, Type.GodanVerb, []],
  ['き', 'い', Type.Initial, Type.IAdj, [Reason.Ki]],
  ['き', 'く', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['き', 'くる', Type.TaTeStem, Type.KuruVerb, []],
  ['き', 'くる', Type.MasuStem, Type.KuruVerb, [Reason.MasuStem]],
  ['ぎ', 'ぐ', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['く', 'い', Type.Initial, Type.IAdj, [Reason.Adv]],
  ['け', 'く', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['げ', 'ぐ', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['こ', 'くる', Type.IrrealisStem, Type.KuruVerb, []],
  ['さ', 'い', Type.Initial, Type.IAdj, [Reason.Noun]],
  ['さ', 'す', Type.IrrealisStem, Type.GodanVerb, []],
  ['し', 'す', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['し', 'する', Type.MasuStem, Type.SuruVerb, [Reason.MasuStem]],
  ['し', 'す', Type.TaTeStem, Type.GodanVerb, []],
  ['し', 'する', Type.TaTeStem, Type.SuruVerb, []],
  ['ず', '', Type.Initial, Type.IrrealisStem, [Reason.Zu]],
  ['せ', 'す', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['せ', 'する', Type.Initial, Type.SpecialSuruVerb, [Reason.Irregular, Reason.Imperative]],
  ['た', 'つ', Type.IrrealisStem, Type.GodanVerb, []],
  ['た', '', Type.Initial, Type.TaTeStem, [Reason.Past]],
  ['だ', '', Type.Initial, Type.DaDeStem, [Reason.Past]],
  ['ち', 'つ', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['っ', 'う', Type.TaTeStem, Type.GodanVerb, []],
  ['っ', 'つ', Type.TaTeStem, Type.GodanVerb, []],
  ['っ', 'る', Type.TaTeStem, Type.GodanVerb, []],
  ['て', '', Type.Initial, Type.TaTeStem, [Reason.Te]],
  ['て', 'つ', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['で', '', Type.Initial, Type.DaDeStem, [Reason.Te]],
  ['な', 'ぬ', Type.IrrealisStem, Type.GodanVerb, []],
  ['な', '', Type.Initial, Type.IchidanVerb | Type.GodanVerb | Type.KuruVerb | Type.SuruVerb, [Reason.ImperativeNegative]],
  ['に', 'ぬ', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['ぬ', '', Type.Initial, Type.IrrealisStem, [Reason.Negative]],
  ['ね', 'ぬ', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['ば', 'ぶ', Type.IrrealisStem, Type.GodanVerb, []],
  ['び', 'ぶ', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['べ', 'ぶ', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['ま', 'む', Type.IrrealisStem, Type.GodanVerb, []],
  ['み', 'む', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['め', 'む', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['よ', 'る', Type.Initial, Type.IchidanVerb, [Reason.Imperative]],
  ['ら', 'る', Type.IrrealisStem, Type.GodanVerb, []],
  ['り', 'る', Type.MasuStem, Type.GodanVerb, [Reason.MasuStem]],
  ['れ', 'る', Type.Initial, Type.GodanVerb, [Reason.Imperative]],
  ['ろ', 'る', Type.Initial, Type.IchidanVerb, [Reason.Imperative]],
  ['わ', 'う', Type.IrrealisStem, Type.GodanVerb, []],
  ['ん', 'ぬ', Type.DaDeStem, Type.GodanVerb, []],
  ['ん', 'ぶ', Type.DaDeStem, Type.GodanVerb, []],
  ['ん', 'む', Type.DaDeStem, Type.GodanVerb, []],
  ['ん', '', Type.Initial, Type.IrrealisStem, [Reason.Negative]],
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

    for (const [from, to, fromType, toType, reasons] of deinflectRuleData) {
      const rule: DeinflectRule = { from, to, fromType, toType, reasons };

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
  reasonChains: Array<Array<Reason>>;
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
    // Initially, the type of word is unknown, so we set the type mask to
    // match all rules except stems, that don't make sense on their own.
    type: 0xffff ^ (Type.TaTeStem | Type.DaDeStem | Type.IrrealisStem),
    reasonChains: [],
  };
  result.push(original);
  resultIndex[word] = 0;

  let i = 0;
  do {
    const thisCandidate = result[i];

    // Don't deinflect masu-stem results of Ichidan verbs any further since
    // they should already be the plain form.
    //
    // Without this we would take something like 食べて, try deinflecting it as
    // a masu stem into 食べてる and then try de-inflecting it as a continuous
    // form. However, we should just stop immediately after de-inflecting to
    // the plain form.
    if (
      thisCandidate.type & Type.IchidanVerb &&
      thisCandidate.reasonChains.length === 1 &&
      thisCandidate.reasonChains[0].length === 1 &&
      thisCandidate.reasonChains[0][0] === Reason.MasuStem
    ) {
      continue;
    }

    const word = thisCandidate.word;
    const type = thisCandidate.type;

    // Ichidan verbs have only one stem, which is the plain form minus the
    // final る. Since the stem is shorter than the plain form, to avoid
    // adding multiple entries for all possible stem variations to the rule
    // data array, we forward the stem to the plain form programmatically.
    if (type & (Type.MasuStem | Type.TaTeStem | Type.IrrealisStem)) {
      const reason = [];

      // Add the "masu" reason only if the word is solely the masu stem.
      if (type & Type.MasuStem && !thisCandidate.reasonChains.length) {
        reason.push([Reason.MasuStem]);
      }

      // Ichidan verbs attach the auxiliary verbs られる and させる instead of
      // れる and せる for the passive and causative forms to their stem. Since
      // られる and させる exist as separate rules that bypass the irrealis stem
      // type, we ignore the the rules with a to-type of IrrealisStem for the
      // passive and causative, i.e. the rules for れる and せる.
      // Similarly, we need to ignore the rule for the causative passive, as
      // the contraction of せられる to される is incorrect for Ichidan verbs.
      const inapplicableForm =
        type & Type.IrrealisStem &&
        (thisCandidate.reasonChains[0][0] == Reason.Passive ||
          thisCandidate.reasonChains[0][0] == Reason.Causative ||
          thisCandidate.reasonChains[0][0] == Reason.CausativePassive);

      if (!inapplicableForm) {
        result.push({
          word: word + 'る',
          type: Type.IchidanVerb | Type.KuruVerb,
          reasonChains: [...thisCandidate.reasonChains, ...reason],
        });
      }
    }

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

        // Continue if the rule introduces a duplicate in the reason chain,
        // as it wouldn't make sense grammatically.
        const ruleReasons = new Set(rule.reasons);
        if (thisCandidate.reasonChains.flat().some((r) => ruleReasons.has(r))) {
          continue;
        }

        // If we already have a candidate for this word with the same
        // 'to' type(s), expand the possible reasons by starting a new
        // reason chain.
        //
        // We do not want to start a new reason chain with a pure forwarding
        // rule, represented by an empty reasons array, as it cannot stand on
        // its own and needs a preceding rule to make sense.
        //
        // If the 'to' type(s) differ, then we'll add a separate candidate
        // and just hope that when we go to match against dictionary words
        // we'll filter out the mismatching one(s).
        if (resultIndex[newWord]) {
          const candidate = result[resultIndex[newWord]];
          if (candidate.type === rule.toType) {
            if (rule.reasons.length) {
              // Start a new reason chain
              candidate.reasonChains.unshift([...rule.reasons]);
            }
            continue;
          }
        }
        resultIndex[newWord] = result.length;

        //
        // Start a new candidate
        //

        // Deep clone multidimensional array
        const reasonChains = [];
        for (const array of thisCandidate.reasonChains) {
          reasonChains.push([...array]);
        }

        // We only need to add something to the reason chain if the rule is
        // not a pure forwarding rule, i.e. the reasons array is not empty.
        if (rule.reasons.length) {
          // Add our new reason in
          //
          // If we already have reason chains, prepend to the first chain
          if (reasonChains.length) {
            const firstReasonChain = reasonChains[0];

            // Rather having causative + passive, combine the two rules into
            // "causative passive":
            if (
              rule.reasons[0] === Reason.Causative &&
              firstReasonChain.length &&
              firstReasonChain[0] === Reason.PotentialOrPassive
            ) {
              firstReasonChain.splice(0, 1, Reason.CausativePassive);
            } else if (
              // Add the "masu" reason only if the word is solely the masu stem.
              rule.reasons[0] === Reason.MasuStem &&
              firstReasonChain.length
            ) {
              // Do nothing
            } else {
              firstReasonChain.unshift(...rule.reasons);
            }
          } else {
            // Add new reason to the start of the chain
            reasonChains.push([...rule.reasons]);
          }
        }

        const candidate: CandidateWord = {
          reasonChains,
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
