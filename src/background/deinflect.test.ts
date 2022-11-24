import { deinflect, Reason, WordType } from './deinflect';

describe('deinflect', () => {
  it('performs de-inflection', () => {
    const result = deinflect('走ります');
    const match = result.find((candidate) => candidate.word === '走る');
    expect(match).toEqual({
      reasons: [[Reason.Polite]],
      type: 2,
      word: '走る',
    });
  });

  it('performs de-inflection recursively', () => {
    const result = deinflect('踊りたくなかった');
    const match = result.find((candidate) => candidate.word === '踊る');
    expect(match).toEqual({
      reasons: [[Reason.Tai, Reason.Negative, Reason.Past]],
      type: 2,
      word: '踊る',
    });
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

    for (const [inflected, plain, reasons, type] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toMatchObject({ reasons, type, word: plain });
    }
  });

  it('deinflects -masu stem forms', () => {
    const result = deinflect('食べ');
    const match = result.find((candidate) => candidate.word === '食べる');
    expect(match).toEqual({
      reasons: [[Reason.MasuStem]],
      type: 1,
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
      ['見ぬ', '見る', 1],
      ['こぬ', 'くる', 8],
      ['せぬ', 'する', 16],
    ];

    for (const [inflected, plain, type] of cases) {
      const result = deinflect(inflected as string);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toEqual({
        reasons: [[Reason.Negative]],
        type: type,
        word: plain,
      });
    }
  });

  it('recursively deinflects -nu', () => {
    const result = deinflect('食べられぬ');
    const match = result.find((candidate) => candidate.word === '食べる');
    expect(match).toEqual({
      reasons: [[Reason.PotentialOrPassive, Reason.Negative]],
      type: 9,
      word: '食べる',
    });
  });

  it('deinflects ki to kuru', () => {
    const result = deinflect('き');
    const match = result.find((candidate) => candidate.word === 'くる');
    expect(match).toEqual({
      reasons: [[Reason.MasuStem]],
      type: 8,
      word: 'くる',
    });
  });

  it('deinflects ki ending for i-adj', () => {
    const result = deinflect('美しき');
    const match = result.find((candidate) => candidate.word === '美しい');
    expect(match).toEqual({
      reasons: [[Reason.Ki]],
      type: WordType.IAdj,
      word: '美しい',
    });
  });

  it('deinflects vs-c', () => {
    const result = deinflect('兼した');
    const match = result.find((candidate) => candidate.word === '兼す');
    expect(match).toEqual({
      reasons: [[Reason.Past]],
      type: 18,
      word: '兼す',
    });
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
      expect(match).toEqual({
        reasons: [[reason]],
        type,
        word: plain,
      });
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
      ['のたもうた', 'のたまう'],
    ];

    for (const [inflected, plain] of cases) {
      const result = deinflect(inflected);
      const match = result.find((candidate) => candidate.word == plain);
      expect(match).toEqual({
        reasons: [[Reason.Past]],
        type: 2,
        word: plain,
      });
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
      ['話している', '話す', 18, undefined],
      ['話してる', '話す', 18, undefined],
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
        reasons: reasons ? [reasons] : [[Reason.Continuous]],
        type,
        word: plain,
      });
    }

    // Check we don't get false positives
    const result = deinflect('食べて');
    const match = result.find((candidate) => candidate.word == '食べる');
    expect(match).toBeDefined();
    expect(match!.reasons).not.toContainEqual([Reason.Continuous]);
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
      expect(match!.reasons[0][0]).toBe(Reason.ZaruWoEnai);
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
      expect(match!.reasons[0][0]).toBe(Reason.NegativeTe);
    }
  });
});
