const fs = require('fs');

import { deinflect, DeinflectReason } from '../src/deinflect';

describe('deinflect', () => {
  it('performs de-inflection', () => {
    const result = deinflect('走ります');
    const match = result.find(candidate => candidate.word === '走る');
    expect(match).toEqual({
      reasons: [[DeinflectReason.Polite]],
      type: 2,
      word: '走る',
    });
  });

  it('performs de-inflection recursively', () => {
    const result = deinflect('踊りたくなかった');
    const match = result.find(candidate => candidate.word === '踊る');
    expect(match).toEqual({
      reasons: [
        [DeinflectReason.Tai, DeinflectReason.Negative, DeinflectReason.Past],
      ],
      type: 2,
      word: '踊る',
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
      const result = deinflect(inflected);
      const match = result.find(candidate => candidate.word == plain);
      expect(match).toEqual({
        reasons: [[DeinflectReason.Negative]],
        type: type,
        word: plain,
      });
    }
  });

  it('recursively deinflects -nu', () => {
    const result = deinflect('食べられぬ');
    const match = result.find(candidate => candidate.word === '食べる');
    expect(match).toEqual({
      reasons: [[DeinflectReason.PotentialOrPassive, DeinflectReason.Negative]],
      type: 9,
      word: '食べる',
    });
  });
});
