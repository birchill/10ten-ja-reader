import { describe, expect, it } from 'vitest';

import { Reason, WordType, deinflect } from './deinflect';

describe('deinflect', () => {
  it('performs de-inflection', () => {
    const result = deinflect('走ります');
    const match = result.find((candidate) => candidate.word === '走る');
    expect(match).toEqual({
      reasonChains: [[Reason.Polite]],
      type: 2,
      word: '走る',
    });
  });

  it('performs de-inflection recursively', () => {
    const result = deinflect('踊りたくなかった');
    const match = result.find((candidate) => candidate.word === '踊る');
    expect(match).toEqual({
      reasonChains: [[Reason.Tai, Reason.Negative, Reason.Past]],
      type: 2,
      word: '踊る',
    });
  });

  it('does NOT allow duplicates in the reason chain', () => {
    const cases = [
      '見させさせる', // causative < causative
      '見させてさせる', // causative < continuous < causative
      '見ていている', // continuous < continuous
      '見てさせている', // continuous < causative < continuous
      '見とけとく', // -te oku < potential < -te oku
    ];

    for (const inflected of cases) {
      const result = deinflect(inflected);
      const match = result.find(
        (candidate) =>
          candidate.word === '見る' && candidate.type & WordType.IchidanVerb
      );
      expect(match).toBeUndefined();
    }
  });

  it('deinflects kana variations', () => {
    const cases = [
      ['走ります', '走る', [[Reason.Polite]], 2],
      ['走りまス', '走る', [[Reason.Polite]], 2],
      ['走りマス', '走る', [[Reason.Polite]], 2],
      ['走リマス', '走る', [[Reason.Polite]], 2],
      ['走リマす', '走る', [[Reason.Polite]], 2],
      ['走った', '走る', [[Reason.Past]], 2],
      ['走っタ', '走る', [[Reason.Past]], 2],
      ['走ッタ', '走る', [[Reason.Past]], 2],
      ['走ッた', '走る', [[Reason.Past]], 2],
    ];

    for (const [inflected, plain, reasonChains, type] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toMatchObject({ reasonChains, type, word: plain });
    }
  });

  it('deinflects -masu stem forms', () => {
    const result = deinflect('食べ');
    const match = result.find((candidate) => candidate.word === '食べる');
    expect(match).toEqual({
      reasonChains: [[Reason.MasuStem]],
      type: WordType.IchidanVerb | WordType.KuruVerb,
      word: '食べる',
    });
  });

  it('deinflects -nu', () => {
    const cases = [
      ['思わぬ', '思う', 2],
      ['行かぬ', '行く', 2],
      ['話さぬ', '話す', 2],
      ['経たぬ', '経つ', 2],
      ['死なぬ', '死ぬ', 2],
      ['遊ばぬ', '遊ぶ', 2],
      ['止まぬ', '止む', 2],
      ['切らぬ', '切る', 2],
      ['見ぬ', '見る', 9],
      ['こぬ', 'くる', 8],
      ['せぬ', 'する', 16],
    ];

    for (const [inflected, plain, type] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toEqual({
        reasonChains: [[Reason.Negative]],
        type: type,
        word: plain,
      });
    }
  });

  it('recursively deinflects -nu', () => {
    const result = deinflect('食べられぬ');
    const match = result.find((candidate) => candidate.word === '食べる');
    expect(match).toEqual({
      reasonChains: [[Reason.PotentialOrPassive, Reason.Negative]],
      type: 9,
      word: '食べる',
    });
  });

  it('deinflects ki to kuru', () => {
    const result = deinflect('き');
    const match = result.find((candidate) => candidate.word === 'くる');
    expect(match).toEqual({
      reasonChains: [[Reason.MasuStem]],
      type: 8,
      word: 'くる',
    });
  });

  it('deinflects ki ending for i-adj', () => {
    const result = deinflect('美しき');
    const match = result.find((candidate) => candidate.word === '美しい');
    expect(match).toEqual({
      reasonChains: [[Reason.Ki]],
      type: WordType.IAdj,
      word: '美しい',
    });
  });

  it('deinflects all forms of する', () => {
    const cases = [
      ['した', [Reason.Past]],
      ['しよう', [Reason.Volitional]],
      ['しない', [Reason.Negative]],
      ['せぬ', [Reason.Negative]],
      ['せん', [Reason.Negative]],
      ['せず', [Reason.Zu]],
      ['される', [Reason.Passive]],
      ['させる', [Reason.Causative]],
      ['しろ', [Reason.Imperative]],
      ['せよ', [Reason.Imperative]],
      ['すれば', [Reason.Ba]],
      ['できる', [Reason.Potential]],
    ];

    for (const [inflected, reasons] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find(
        (candidate) =>
          candidate.word == 'する' && candidate.type & WordType.SuruVerb
      );
      expect(match).toBeDefined();
      expect(match!.reasonChains).toEqual([reasons]);
    }
  });

  it('deinflects additional forms of special class suru-verbs', () => {
    const cases = [
      ['発する', '発せさせる', [Reason.Irregular, Reason.Causative]],
      ['発する', '発せられる', [Reason.Irregular, Reason.PotentialOrPassive]],
      ['発する', '発しさせる', [Reason.Irregular, Reason.Causative]],
      ['発する', '発しられる', [Reason.Irregular, Reason.PotentialOrPassive]],
      // 五段化
      ['発する', '発さない', [Reason.Irregular, Reason.Negative]],
      ['発する', '発さないで', [Reason.Irregular, Reason.NegativeTe]],
      ['発する', '発さず', [Reason.Irregular, Reason.Zu]],
      ['発する', '発そう', [Reason.Irregular, Reason.Volitional]],
      ['愛する', '愛せば', [Reason.Irregular, Reason.Ba]],
      ['愛する', '愛せ', [Reason.Irregular, Reason.Imperative]],
      // ずる / vz class verbs
      ['信ずる', '信ぜぬ', [Reason.Irregular, Reason.Negative]],
      ['信ずる', '信ぜず', [Reason.Irregular, Reason.Zu]],
      ['信ずる', '信ぜさせる', [Reason.Irregular, Reason.Causative]],
      ['信ずる', '信ぜられる', [Reason.Irregular, Reason.PotentialOrPassive]],
      ['信ずる', '信ずれば', [Reason.Irregular, Reason.Ba]],
      ['信ずる', '信ぜよ', [Reason.Irregular, Reason.Imperative]],
    ];

    for (const [plain, inflected, reasons] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toBeDefined();
      expect(match!.type).toEqual(WordType.SpecialSuruVerb);
      expect(match!.reasonChains).toEqual([reasons]);
    }
  });

  it('deinflects irregular forms of 行く', () => {
    const cases = [
      ['行った', '行く', Reason.Past, 2],
      ['行って', '行く', Reason.Te, 2],
      ['行ったり', '行く', Reason.Tari, 2],
      ['行ったら', '行く', Reason.Tara, 2],
      ['いった', 'いく', Reason.Past, 2],
      ['いって', 'いく', Reason.Te, 2],
      ['いったり', 'いく', Reason.Tari, 2],
      ['いったら', 'いく', Reason.Tara, 2],
      ['逝った', '逝く', Reason.Past, 2],
      ['往った', '往く', Reason.Past, 2],
    ];

    for (const [inflected, plain, reason, type] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toEqual({ reasonChains: [[reason]], type, word: plain });
    }
  });

  it('does NOT deinflect other verbs ending in く like 行く', () => {
    const result = deinflect('もどって');
    const match = result.find((candidate) => candidate.word == 'もどく');
    expect(match).toBeUndefined();
  });

  it('deinflects other irregular verbs', () => {
    const cases = [
      ['請うた', '請う'],
      ['乞うた', '乞う'],
      ['恋うた', '恋う'],
      ['こうた', 'こう'],
      ['問うた', '問う'],
      ['とうた', 'とう'],
      ['負うた', '負う'],
      ['おうた', 'おう'],
      ['沿うた', '沿う'],
      ['添うた', '添う'],
      ['副うた', '副う'],
      ['そうた', 'そう'],
      ['厭うた', '厭う'],
      ['いとうた', 'いとう'],
      ['のたまうた', 'のたまう'],
      ['のたもうた', 'のたもう'],
      ['宣うた', '宣う'],
      ['曰うた', '曰う'],
      ['たまうた', 'たまう'],
      ['たもうた', 'たもう'],
      ['給うた', '給う'],
      ['賜うた', '賜う'],
      ['たゆたうた', 'たゆたう'],
      ['たゆとうた', 'たゆとう'],
      ['揺蕩うた', '揺蕩う'],
    ];

    for (const [inflected, plain] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toEqual({
        reasonChains: [[Reason.Past]],
        type: 2,
        word: plain,
      });
    }
  });

  it('deinflects continuous forms of other irregular verbs', () => {
    const cases: [string, string, Reason[]][] = [
      ['請うている', '請う', [Reason.Continuous]],
      ['乞うている', '乞う', [Reason.Continuous]],
      ['恋うている', '恋う', [Reason.Continuous]],
      ['こうてる', 'こう', [Reason.Continuous]],
      ['問うてる', '問う', [Reason.Continuous]],
      ['とうてる', 'とう', [Reason.Continuous]],
      ['負うていた', '負う', [Reason.Continuous, Reason.Past]],
      ['おうていた', 'おう', [Reason.Continuous, Reason.Past]],
      ['沿うていた', '沿う', [Reason.Continuous, Reason.Past]],
      ['添うてた', '添う', [Reason.Continuous, Reason.Past]],
      ['副うてた', '副う', [Reason.Continuous, Reason.Past]],
      ['そうてた', 'そう', [Reason.Continuous, Reason.Past]],
      ['厭うていて', '厭う', [Reason.Continuous, Reason.Te]],
      ['いとうていて', 'いとう', [Reason.Continuous, Reason.Te]],
      ['のたまうている', 'のたまう', [Reason.Continuous]],
      ['のたもうていた', 'のたもう', [Reason.Continuous, Reason.Past]],
      ['宣うてた', '宣う', [Reason.Continuous, Reason.Past]],
      ['曰うてて', '曰う', [Reason.Continuous, Reason.Te]],
      ['たまうている', 'たまう', [Reason.Continuous]],
      ['たもうていた', 'たもう', [Reason.Continuous, Reason.Past]],
      ['給うてた', '給う', [Reason.Continuous, Reason.Past]],
      ['賜うてて', '賜う', [Reason.Continuous, Reason.Te]],
      ['たゆたうている', 'たゆたう', [Reason.Continuous]],
      ['たゆとうていた', 'たゆとう', [Reason.Continuous, Reason.Past]],
      ['揺蕩うてて', '揺蕩う', [Reason.Continuous, Reason.Te]],
    ];

    for (const [inflected, plain, reasons] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toEqual({ reasonChains: [reasons], type: 2, word: plain });
    }
  });

  it('deinflects ござる', () => {
    const cases = [
      ['ございます', 'ござる', Reason.Polite],
      ['ご座います', 'ご座る', Reason.Polite],
      ['御座います', '御座る', Reason.Polite],
      ['ございません', 'ござる', Reason.PoliteNegative],
      ['ご座いません', 'ご座る', Reason.PoliteNegative],
      ['御座いません', '御座る', Reason.PoliteNegative],
      ['ございませんでした', 'ござる', Reason.PolitePastNegative],
      ['ご座いませんでした', 'ご座る', Reason.PolitePastNegative],
      ['御座いませんでした', '御座る', Reason.PolitePastNegative],
    ];

    for (const [inflected, plain, reason] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toMatchObject({ reasonChains: [[reason]], word: plain });
    }
  });

  it('deinflects くださる', () => {
    const cases = [
      ['くださいます', 'くださる', Reason.Polite],
      ['下さいます', '下さる', Reason.Polite],
      ['くださいません', 'くださる', Reason.PoliteNegative],
      ['下さいません', '下さる', Reason.PoliteNegative],
      ['くださいませんでした', 'くださる', Reason.PolitePastNegative],
      ['下さいませんでした', '下さる', Reason.PolitePastNegative],
    ];

    for (const [inflected, plain, reason] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toMatchObject({ reasonChains: [[reason]], word: plain });
    }
  });

  it('deinflects いらっしゃる', () => {
    // prettier-ignore
    const cases = [
      ['いらっしゃいます', 'いらっしゃる', [[Reason.Polite]]],
      ['いらっしゃい', 'いらっしゃる', [[Reason.Imperative], [Reason.MasuStem]]],
      ['いらっしゃって', 'いらっしゃる', [[Reason.Te]]],
    ];

    for (const [inflected, plain, reasonChains] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toMatchObject({ reasonChains: reasonChains, word: plain });
    }
  });

  it('deinflects the continuous form', () => {
    const cases: Array<[string, string, number, Array<Reason> | undefined]> = [
      // U-verbs
      ['戻っている', '戻る', 2, undefined],
      ['戻ってる', '戻る', 2, undefined],
      ['歩いている', '歩く', 2, undefined],
      ['歩いてる', '歩く', 2, undefined],
      ['泳いでいる', '泳ぐ', 2, undefined],
      ['泳いでる', '泳ぐ', 2, undefined],
      ['話している', '話す', 2, undefined],
      ['話してる', '話す', 2, undefined],
      ['死んでいる', '死ぬ', 2, undefined],
      ['死んでる', '死ぬ', 2, undefined],
      ['飼っている', '飼う', 2, undefined],
      ['飼ってる', '飼う', 2, undefined],
      ['放っている', '放つ', 2, undefined],
      ['放ってる', '放つ', 2, undefined],
      ['遊んでいる', '遊ぶ', 2, undefined],
      ['遊んでる', '遊ぶ', 2, undefined],
      ['歩んでいる', '歩む', 2, undefined],
      ['歩んでる', '歩む', 2, undefined],
      // Ru-verbs
      ['食べている', '食べる', 9, undefined],
      ['食べてる', '食べる', 9, undefined],
      // Special verbs
      ['している', 'する', 16, undefined],
      ['してる', 'する', 16, undefined],
      ['来ている', '来る', 9, undefined],
      ['来てる', '来る', 9, undefined],
      ['きている', 'くる', 8, undefined],
      ['きてる', 'くる', 8, undefined],
      // Combinations
      ['戻っています', '戻る', 2, [Reason.Continuous, Reason.Polite]],
      ['戻ってます', '戻る', 2, [Reason.Continuous, Reason.Polite]],
      ['戻っていない', '戻る', 2, [Reason.Continuous, Reason.Negative]],
      ['戻ってない', '戻る', 2, [Reason.Continuous, Reason.Negative]],
      ['戻っていた', '戻る', 2, [Reason.Continuous, Reason.Past]],
      ['戻ってた', '戻る', 2, [Reason.Continuous, Reason.Past]],
    ];

    for (const [inflected, plain, type, reasons] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toEqual({
        reasonChains: reasons ? [reasons] : [[Reason.Continuous]],
        type,
        word: plain,
      });
    }

    // Check we don't get false positives
    const result = deinflect('食べて');
    const match = result.find((candidate) => candidate.word == '食べる');
    expect(match).toBeDefined();
    expect(match!.reasonChains).not.toContainEqual([Reason.Continuous]);
  });

  it('deinflects respectful continuous forms', () => {
    // prettier-ignore
    const cases: Array<[string, string, Array<Reason>]> = [
      ['分かっていらっしゃる', '分かる', [Reason.Respectful, Reason.Continuous]],
      ['分かっていらっしゃい', '分かる', [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
      ['分かってらっしゃる', '分かる', [Reason.Respectful, Reason.Continuous]],
      ['分かってらっしゃい', '分かる', [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
      ['読んでいらっしゃる', '読む', [Reason.Respectful, Reason.Continuous]],
      ['読んでいらっしゃい', '読む', [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
      ['読んでらっしゃる', '読む', [Reason.Respectful, Reason.Continuous]],
      ['読んでらっしゃい', '読む', [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
      ['起きていらっしゃる', '起きる', [Reason.Respectful, Reason.Continuous]],
      ['起きていらっしゃい', '起きる', [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
      ['起きてらっしゃる', '起きる', [Reason.Respectful, Reason.Continuous]],
      ['起きてらっしゃい', '起きる', [Reason.Respectful, Reason.Continuous, Reason.Imperative]],
      ['分かっていらっしゃいます', '分かる', [Reason.Respectful, Reason.Continuous, Reason.Polite]],
      ['分かってらっしゃいます', '分かる', [Reason.Respectful, Reason.Continuous, Reason.Polite]],
      ['分かっていらっしゃって', '分かる', [Reason.Respectful, Reason.Continuous, Reason.Te]],
      ['分かってらっしゃって', '分かる', [Reason.Respectful, Reason.Continuous, Reason.Te]],
    ];

    for (const [inflected, plain, reasons] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toBeDefined();
      expect(match!.reasonChains).toEqual([reasons]);
    }
  });

  it('deinflects なさる as respectful speech for する', () => {
    // prettier-ignore
    const cases: Array<[string, string, Array<Array<Reason>>]> = [
      ['なさい', 'なさる', [[Reason.Imperative], [Reason.MasuStem]]],
      ['食べなさい', '食べる', [[Reason.Respectful, Reason.Imperative]]],
      ['帰りなさいませ', '帰る', [[Reason.Respectful, Reason.Polite, Reason.Imperative]]],
      ['仕事なさる', '仕事', [[Reason.SuruNoun, Reason.Respectful]]],
      ['エンジョイなさって', 'エンジョイ', [[Reason.SuruNoun, Reason.Respectful, Reason.Te]]],
      ['喜びなさった', '喜ぶ', [[Reason.Respectful, Reason.Past]]],
    ];

    for (const [inflected, plain, reasonChains] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toBeDefined();
      expect(match!.reasonChains).toEqual(reasonChains);
    }
  });

  it('deinflects になる as respectful speech', () => {
    // prettier-ignore
    const cases: Array<[string, string, Array<Reason>]> = [
      ['到着になります', '到着', [Reason.SuruNoun, Reason.Respectful, Reason.Polite]],
      ['読みになります', '読む', [Reason.Respectful, Reason.Polite]],
      ['見えになります', '見える', [Reason.Respectful, Reason.Polite]],
    ];

    for (const [inflected, plain, reasons] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toBeDefined();
      expect(match!.reasonChains).toEqual([reasons]);
    }
  });

  it('deinflects humble or Kansai dialect continuous forms', () => {
    // prettier-ignore
    const cases: Array<[string, string, Array<Reason>]> = [
      ['行っておる', '行く', [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
      ['行っており', '行く', [Reason.HumbleOrKansaiDialect, Reason.Continuous, Reason.MasuStem]],
      ['行っとる', '行く', [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
      ['行っとり', '行く', [Reason.HumbleOrKansaiDialect, Reason.Continuous, Reason.MasuStem]],
      ['読んでおる', '読む', [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
      ['読んでおり', '読む', [Reason.HumbleOrKansaiDialect, Reason.Continuous, Reason.MasuStem]],
      ['読んどる', '読む', [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
      ['読んどり', '読む', [Reason.HumbleOrKansaiDialect, Reason.Continuous, Reason.MasuStem]],
      ['起きておる', '起きる', [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
      ['起きており', '起きる', [Reason.HumbleOrKansaiDialect, Reason.Continuous, Reason.MasuStem]],
      ['起きとる', '起きる', [Reason.HumbleOrKansaiDialect, Reason.Continuous]],
      ['起きとり', '起きる', [Reason.HumbleOrKansaiDialect, Reason.Continuous, Reason.MasuStem]],
    ];

    for (const [inflected, plain, reasons] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toBeDefined();
      expect(match!.reasonChains).toEqual([reasons]);
    }
  });

  it('deinflects 致す as humble speech for する', () => {
    // prettier-ignore
    const cases: Array<[string, string, Array<Reason>]> = [
      ['お願いいたします', 'お願い', [Reason.SuruNoun, Reason.Humble, Reason.Polite]],
      ['お願い致します', 'お願い', [Reason.SuruNoun, Reason.Humble, Reason.Polite]],
      ['待ちいたします', '待つ', [Reason.Humble, Reason.Polite]],
      ['待ち致します', '待つ', [Reason.Humble, Reason.Polite]],
      ['食べいたします', '食べる', [Reason.Humble, Reason.Polite]],
      ['食べ致します', '食べる', [Reason.Humble, Reason.Polite]],
    ];

    for (const [inflected, plain, reasons] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toBeDefined();
      expect(match!.reasonChains).toEqual([reasons]);
    }
  });

  it('deinflects ざるを得ない', () => {
    const cases = [
      ['闘わざるを得なかった', '闘う'],
      ['闘わざるをえなかった', '闘う'],
      ['やらざるを得ぬ', 'やる'],
      ['やらざるをえぬ', 'やる'],
      ['闘わざる得なかった', '闘う'],
      ['闘わざるえなかった', '闘う'],
      ['やらざる得ぬ', 'やる'],
      ['やらざるえぬ', 'やる'],
    ];
    for (const [inflected, plain] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toBeDefined();
      // The ざるを得ない reason should be the first one in the list
      expect(match!.reasonChains[0][0]).toBe(Reason.ZaruWoEnai);
    }
  });

  it('deinflects ないで', () => {
    const cases = [
      ['遊ばないで', '遊ぶ'],
      ['やらないで', 'やる'],
      ['食べないで', '食べる'],
      ['しないで', 'する'],
      ['こないで', 'くる'],
      ['来ないで', '来る'],
    ];
    for (const [inflected, plain] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toBeDefined();
      expect(match!.reasonChains[0][0]).toBe(Reason.NegativeTe);
    }
  });

  it('deinflects -得る', () => {
    const cases = [
      ['し得る', 'する'],
      ['しえる', 'する'],
      ['しうる', 'する'],
      ['来得る', '来る'],
      ['あり得る', 'ある'],
      ['考え得る', '考える'],
    ];
    for (const [inflected, plain] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toBeDefined();
      expect(match!.reasonChains).toEqual([[Reason.EruUru]]);
    }
  });
});
