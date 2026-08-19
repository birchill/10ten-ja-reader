import type { WordResult } from '@birchill/jpdict-idb';
import { h, render } from 'preact';
import { describe, expect, it } from 'vitest';

import type { AccentDisplay } from '../../../common/content-config-params';

import { Reading } from './Reading';

/**
 * @vitest-environment jsdom
 */

const HIGH = 'tp:border-0 tp:border-t-(length:--border-width)';
const LOW = 'tp:border-0 tp:border-b-(length:--border-width)';
const FALL = `${HIGH} tp:border-r-(length:--border-width)`;
const RISE = `${LOW} tp:border-r-(length:--border-width)`;

const binaryCases: Array<{
  name: string;
  ent: string;
  a: Kana['a'];
  segments: Array<[string, string]>;
}> = [
  {
    name: 'heiban',
    ent: 'さくら',
    a: 0,
    segments: [
      ['さ', RISE],
      ['くら', HIGH],
    ],
  },
  { name: 'heiban, one mora', ent: 'め', a: 0, segments: [['め', HIGH]] },
  {
    name: 'atamadaka',
    ent: 'あめ',
    a: 1,
    segments: [
      ['あ', FALL],
      ['め', LOW],
    ],
  },
  { name: 'atamadaka, one mora', ent: 'め', a: 1, segments: [['め', FALL]] },
  {
    name: 'nakadaka',
    ent: 'おとこ',
    a: 2,
    segments: [
      ['お', RISE],
      ['と', FALL],
      ['こ', LOW],
    ],
  },
  {
    name: 'odaka',
    ent: 'おとこ',
    a: 3,
    segments: [
      ['お', RISE],
      ['とこ', FALL],
    ],
  },
  {
    name: 'nakadaka over five moras',
    ent: 'あいうえお',
    a: 3,
    segments: [
      ['あ', RISE],
      ['いう', FALL],
      ['えお', LOW],
    ],
  },
  {
    name: 'combined mora, atamadaka',
    ent: 'きゃく',
    a: 1,
    segments: [
      ['きゃ', FALL],
      ['く', LOW],
    ],
  },
  {
    name: 'combined mora, heiban',
    ent: 'きゃく',
    a: 0,
    segments: [
      ['きゃ', RISE],
      ['く', HIGH],
    ],
  },
  {
    name: 'combined mora alone, atamadaka',
    ent: 'きゃ',
    a: 1,
    segments: [['きゃ', FALL]],
  },
  {
    name: 'combined mora alone, heiban',
    ent: 'きゃ',
    a: 0,
    segments: [['きゃ', HIGH]],
  },
  {
    name: 'long vowels, atamadaka',
    ent: 'コーヒー',
    a: 1,
    segments: [
      ['コ', FALL],
      ['ーヒー', LOW],
    ],
  },
  {
    name: 'long vowels, nakadaka',
    ent: 'コーヒー',
    a: 3,
    segments: [
      ['コ', RISE],
      ['ーヒ', FALL],
      ['ー', LOW],
    ],
  },
  {
    name: 'accent position past the last mora',
    ent: 'たまご',
    a: 5,
    segments: [
      ['た', RISE],
      ['まご', FALL],
    ],
  },
  {
    name: 'accent supplied as an array',
    ent: 'おとこ',
    a: [{ i: 2 }],
    segments: [
      ['お', RISE],
      ['と', FALL],
      ['こ', LOW],
    ],
  },
];

describe('Reading', () => {
  for (const { name, ent, a, segments } of binaryCases) {
    it(`renders binary pitch for ${name}`, () => {
      expect(renderSegments({ ent, a }, 'binary')).toEqual(segments);
    });
  }

  it('wraps the binary segments in a dotted layer scaled to 90%', () => {
    const layer = renderReading({ ent: 'さくら', a: 0 }, 'binary').firstChild;

    expect((layer as Element).getAttribute('class')).toBe(
      'tp:inline-block tp:mb-1 tp:*:m-0 tp:*:text-[90%] tp:*:border-dotted tp:*:border-current'
    );
    expect((layer as Element).getAttribute('style')).toBe(
      '--border-width: 1.5px;'
    );
  });

  it('draws the high-contrast layer 2px wide in its own color', () => {
    const layer = renderReading(
      { ent: 'さくら', a: 0 },
      'binary-hi-contrast'
    ).firstChild;

    expect((layer as Element).getAttribute('class')).toBe(
      'tp:inline-block tp:mb-1 tp:*:m-0 tp:*:text-[90%] tp:*:border-dotted tp:*:border-(--hi-contrast-pitch-accent)'
    );
    expect((layer as Element).getAttribute('style')).toBe(
      '--border-width: 2px;'
    );
    expect(
      renderSegments({ ent: 'さくら', a: 0 }, 'binary-hi-contrast')
    ).toEqual([
      ['さ', RISE],
      ['くら', HIGH],
    ]);
  });

  // The two cases below are a deliberate change from the pre-token rendering,
  // which clamped mora offsets inconsistently with how it sliced the text.
  it('marks a one-mora reading whose accent runs past its end as a fall', () => {
    // Was: a rise on the mora plus an empty trailing fall span.
    expect(renderSegments({ ent: 'め', a: 2 }, 'binary')).toEqual([
      ['め', FALL],
    ]);
    expect(renderSegments({ ent: 'め', a: 3 }, 'binary')).toEqual([
      ['め', FALL],
    ]);
  });

  it('keeps every small kana of a mora built from three codepoints', () => {
    // Was: ぎゃぁ rendered as ぎゃ — the trailing ぁ was dropped outright.
    expect(renderSegments({ ent: 'ぎゃぁ', a: 1 }, 'binary')).toEqual([
      ['ぎゃぁ', FALL],
    ]);
    expect(renderSegments({ ent: 'ぎゃぁ', a: 0 }, 'binary')).toEqual([
      ['ぎゃぁ', HIGH],
    ]);
    // Was: ぎゃꜜぁ, with the mark inside the mora it belongs to.
    expect(renderReading({ ent: 'ぎゃぁ', a: 1 }, 'downstep').innerHTML).toBe(
      'ぎゃぁꜜ'
    );
  });

  it('renders bare text when there is nothing to mark', () => {
    expect(renderReading({ ent: 'さくら', a: 0 }, 'none').innerHTML).toBe(
      'さくら'
    );
    expect(renderReading({ ent: 'さくら' }, 'binary').innerHTML).toBe('さくら');
    expect(renderReading({ ent: 'さくら', a: [] }, 'binary').innerHTML).toBe(
      'さくら'
    );
    expect(renderReading({ ent: 'さくら' }, 'downstep').innerHTML).toBe(
      'さくら'
    );
  });

  it('marks heiban in downstep mode with a dotted overline', () => {
    expect(renderReading({ ent: 'さくら', a: 0 }, 'downstep').innerHTML).toBe(
      '<span class="tp:border-dotted tp:border-current tp:border-0 tp:border-t-[1.5px]">さくら</span>'
    );
  });

  it.each([
    ['あめ', 1, 'あꜜめ'],
    ['おとこ', 2, 'おとꜜこ'],
    ['おとこ', 3, 'おとこꜜ'],
    ['きゃく', 1, 'きゃꜜく'],
    ['たまご', 5, 'たまごꜜ'],
  ])('marks the downstep in %s (%i)', (ent, a, expected) => {
    expect(renderReading({ ent, a }, 'downstep').innerHTML).toBe(expected);
  });
});

type Kana = WordResult['r'][0];

function renderSegments(
  kana: Pick<Kana, 'ent' | 'a'>,
  accentDisplay: AccentDisplay
): Array<[string, string | null]> {
  return [
    ...renderReading(kana, accentDisplay).querySelectorAll('span span'),
  ].map((span) => [span.textContent ?? '', span.getAttribute('class')]);
}

function renderReading(
  kana: Pick<Kana, 'ent' | 'a'>,
  accentDisplay: AccentDisplay
): HTMLElement {
  const container = document.createElement('div');
  render(h(Reading, { kana: kana as Kana, accentDisplay }), container);
  return container;
}
