import { h, render } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShogiMeta } from '../shogi';

import { ShogiInfo } from './Metadata/ShogiInfo';

/**
 * @vitest-environment jsdom
 */

let locale: 'en' | 'ja' | 'zh_CN' = 'en';

vi.mock('../../common/i18n', async () => {
  const { mockGetMessage } = await import('./mock-get-message');
  return {
    useLocale: () => {
      return {
        t: (id: string, replacements?: string | Array<string>) =>
          mockGetMessage(locale, id, replacements),
        langTag: locale,
      };
    },
  };
});

describe('renderShogiInfo', () => {
  afterEach(() => {
    locale = 'en';
  });

  it('renders a shogi move with a piece and destination', () => {
    expect(getShogiMove({ dest: [8, 3], piece: 's' })).toBe(
      'silver general to 83'
    );
    expect(getShogiMove({ dest: [8, 3], piece: 's' }, 'ja')).toBe(
      '銀将を８三に'
    );
    expect(getShogiMove({ dest: [8, 3], piece: 's' }, 'zh_CN')).toBe(
      '銀将を８三に'
    );
  });

  it('renders a shogi move using the same destination', () => {
    expect(getShogiMove({ piece: 's' })).toBe(
      "silver general to previous move's position"
    );
    expect(getShogiMove({ piece: 's' }, 'ja')).toBe('銀将を同じ場所に');
    expect(getShogiMove({ piece: 's' }, 'zh_CN')).toBe('銀将を同じ場所に');
  });

  it('renders a shogi move with a destination indicated as being the same', () => {
    expect(getShogiMove({ dest: [8, 3, 1], piece: 's' })).toBe(
      'silver general to 83 (same as previous move)'
    );
    expect(getShogiMove({ dest: [8, 3, 1], piece: 's' }, 'ja')).toBe(
      '銀将を８三（同じ場所）に'
    );
    expect(getShogiMove({ dest: [8, 3, 1], piece: 's' }, 'zh_CN')).toBe(
      '銀将を８三（同じ場所）に'
    );
  });

  it('renders a shogi move where a side is specified', () => {
    expect(getShogiMove({ side: 'black', dest: [2, 5], piece: 'pro_b' })).toBe(
      'black horse (promoted bishop) to 25'
    );
    expect(
      getShogiMove({ side: 'black', dest: [2, 5], piece: 'pro_b' }, 'ja')
    ).toBe('先手が竜馬を２五に');
    expect(
      getShogiMove({ side: 'black', dest: [2, 5], piece: 'pro_b' }, 'zh_CN')
    ).toBe('先手が竜馬を２五に');
  });

  it('renders a shogi move where a movement is specified', () => {
    expect(getShogiMove({ dest: [5, 2], piece: 'g', movement: 'right' })).toBe(
      'gold general moves from the right to 52'
    );
    expect(
      getShogiMove({ dest: [5, 2], piece: 'g', movement: 'right' }, 'ja')
    ).toBe('金将を５二に右から動かす');
    expect(
      getShogiMove({ dest: [5, 2], piece: 'g', movement: 'right' }, 'zh_CN')
    ).toBe('金将を５二に右から動かす');
  });

  it('renders a shogi move where a movement and side are specified', () => {
    expect(
      getShogiMove({
        side: 'white',
        dest: [5, 6],
        piece: 'g',
        movement: 'drop',
      })
    ).toBe('white gold general dropped at 56');
    expect(
      getShogiMove(
        { side: 'white', dest: [5, 6], piece: 'g', movement: 'drop' },
        'ja'
      )
    ).toBe('後手が金将を５六に打つ');
    expect(
      getShogiMove(
        { side: 'white', dest: [5, 6], piece: 'g', movement: 'drop' },
        'zh_CN'
      )
    ).toBe('後手が金将を５六に打つ');
  });

  it('renders a shogi move with promotion information', () => {
    expect(
      getShogiMove({
        side: 'black',
        dest: [4, 4],
        piece: 's',
        promotion: false,
      })
    ).toBe('black silver general to 44 without promoting');
    expect(
      getShogiMove(
        { side: 'black', dest: [4, 4], piece: 's', promotion: false },
        'ja'
      )
    ).toBe('先手が銀将を４四に（成らない）');
    expect(
      getShogiMove(
        { side: 'black', dest: [4, 4], piece: 's', promotion: false },
        'zh_CN'
      )
    ).toBe('先手が銀将を４四に（成らない）');
  });
});

function getShogiMove(
  meta: Omit<ShogiMeta, 'type' | 'matchLen'>,
  localeToUse?: 'en' | 'ja' | 'zh_CN'
): string | undefined {
  const shogiMeta: ShogiMeta = {
    ...meta,
    type: 'shogi',
    matchLen: 5, // Not used
  };

  const prevLocale = locale;
  if (localeToUse) {
    locale = localeToUse;
  }

  let result =
    renderShogiMetadata(shogiMeta).querySelector('#shogi-move')?.textContent ??
    undefined;

  // Drop any zero-width spaces since we only add them for Safari's sake and
  // they're not expected to affect the visual result
  result = result?.replace(/\u200b/g, '');

  if (prevLocale !== localeToUse) {
    locale = prevLocale;
  }

  return result;
}

export function renderShogiMetadata(meta: ShogiMeta): HTMLElement {
  const container = document.createElement('div');
  render(h(ShogiInfo, { meta }), container);
  return container;
}
