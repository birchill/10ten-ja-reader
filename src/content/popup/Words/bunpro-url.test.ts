import { describe, expect, it } from 'vitest';

import { getBunproUrl } from './bunpro-url';

describe('getBunproUrl', () => {
  it('uses the headword when there is neither a slug nor a source term', () => {
    expect(getBunproUrl({ type: 'vocab', ent: '猫' })).toEqual(
      'https://bunpro.jp/vocabs/%E7%8C%AB'
    );
  });

  it('uses the source term when we matched the headword fuzzily', () => {
    expect(
      getBunproUrl({ type: 'grammar', src: 'に相違ない', ent: '相違ない' })
    ).toEqual(
      'https://bunpro.jp/grammar_points/%E3%81%AB%E7%9B%B8%E9%81%95%E3%81%AA%E3%81%84'
    );
  });

  it('prefers the slug over both, since only it gives the real page', () => {
    expect(
      getBunproUrl({
        type: 'vocab',
        slug: 'Tシャツ-dup',
        src: 'Ｔシャツ',
        ent: 'Ｔシャツ',
      })
    ).toEqual('https://bunpro.jp/vocabs/T%E3%82%B7%E3%83%A3%E3%83%84-dup');
  });

  it('uses the grammar path for grammar decks', () => {
    expect(
      getBunproUrl({ type: 'grammar', slug: '如く-如き-如し', ent: '如く' })
    ).toEqual(
      'https://bunpro.jp/grammar_points/%E5%A6%82%E3%81%8F-%E5%A6%82%E3%81%8D-%E5%A6%82%E3%81%97'
    );
  });
});
