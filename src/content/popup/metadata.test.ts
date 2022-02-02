/**
 * @jest-environment jsdom
 */

let locale: 'en' | 'ja' | 'zh_hans' = 'en';

jest.mock('webextension-polyfill-ts', () => ({
  browser: {
    i18n: {
      getMessage: (id: string, replacements?: string | Array<string>) =>
        mockGetMessage(locale, id, replacements),
    },
  },
}));

import { ShogiMeta } from '../shogi';
import { clearLangTagCache } from './lang-tag';

import { renderMetadata } from './metadata';
import { mockGetMessage } from './mock-get-message';

function setLocale(localeToSet: 'en' | 'ja' | 'zh_hans') {
  locale = localeToSet;
  clearLangTagCache();
}

describe('renderShogiInfo', () => {
  afterEach(() => {
    setLocale('en');
  });

  it('renders a shogi move with a piece and destination', () => {
    expect(getShogiMove({ dest: [8, 3], piece: 's' })).toBe(
      'silver general to 83'
    );
    expect(getShogiMove({ dest: [8, 3], piece: 's' }, 'ja')).toBe(
      '銀将を８三に'
    );
    expect(getShogiMove({ dest: [8, 3], piece: 's' }, 'zh_hans')).toBe(
      '銀将を８三に'
    );
  });

  it('renders a shogi move using the same destination', () => {
    expect(getShogiMove({ piece: 's' })).toBe(
      "silver general to previous move's position"
    );
    expect(getShogiMove({ piece: 's' }, 'ja')).toBe('銀将を同じ場所に');
    expect(getShogiMove({ piece: 's' }, 'zh_hans')).toBe('銀将を同じ場所に');
  });

  it('renders a shogi move with a destination indicated as being the same', () => {
    expect(getShogiMove({ dest: [8, 3, 1], piece: 's' })).toBe(
      'silver general to 83 (same as previous move)'
    );
    expect(getShogiMove({ dest: [8, 3, 1], piece: 's' }, 'ja')).toBe(
      '銀将を８三（同じ場所）に'
    );
    expect(getShogiMove({ dest: [8, 3, 1], piece: 's' }, 'zh_hans')).toBe(
      '銀将を８三（同じ場所）に'
    );
  });

  it('renders a shogi move where a side is specified', () => {
    expect(
      getShogiMove({
        side: 'black',
        dest: [2, 5],
        piece: 'pro_b',
      })
    ).toBe('black horse (promoted bishop) to 25');
    expect(
      getShogiMove({ side: 'black', dest: [2, 5], piece: 'pro_b' }, 'ja')
    ).toBe('先手が竜馬を２五に');
    expect(
      getShogiMove({ side: 'black', dest: [2, 5], piece: 'pro_b' }, 'zh_hans')
    ).toBe('先手が竜馬を２五に');
  });

  it('renders a shogi move where a movement is specified', () => {
    expect(
      getShogiMove({
        dest: [5, 2],
        piece: 'g',
        movement: 'right',
      })
    ).toBe('gold general moves from the right to 52');
    expect(
      getShogiMove(
        {
          dest: [5, 2],
          piece: 'g',
          movement: 'right',
        },
        'ja'
      )
    ).toBe('金将を５二に右から動かす');
    expect(
      getShogiMove(
        {
          dest: [5, 2],
          piece: 'g',
          movement: 'right',
        },
        'zh_hans'
      )
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
        {
          side: 'white',
          dest: [5, 6],
          piece: 'g',
          movement: 'drop',
        },
        'ja'
      )
    ).toBe('後手が金将を５六に打つ');
    expect(
      getShogiMove(
        {
          side: 'white',
          dest: [5, 6],
          piece: 'g',
          movement: 'drop',
        },
        'zh_hans'
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
        {
          side: 'black',
          dest: [4, 4],
          piece: 's',
          promotion: false,
        },
        'ja'
      )
    ).toBe('先手が銀将を４四に（成らない）');
    expect(
      getShogiMove(
        {
          side: 'black',
          dest: [4, 4],
          piece: 's',
          promotion: false,
        },
        'zh_hans'
      )
    ).toBe('先手が銀将を４四に（成らない）');
  });
});

function getShogiMove(
  meta: Omit<ShogiMeta, 'type' | 'matchLen'>,
  localeToUse?: 'en' | 'ja' | 'zh_hans'
): string | undefined {
  const params: Parameters<typeof renderMetadata>[0] = {
    fxData: undefined,
    isCombinedResult: false,
    matchLen: 5, // Not used
    meta: {
      ...meta,
      type: 'shogi',
      matchLen: 5, // Not used
    },
  };

  const prevLocale = locale;
  if (localeToUse) {
    setLocale(localeToUse);
  }

  let result =
    renderMetadata(params)?.querySelector('.value')?.textContent ?? undefined;

  // Drop any zero-width spaces since we only add them for Safari's sake and
  // they're not expected to affect the visual result
  result = result?.replace(/\u200b/g, '');

  if (prevLocale !== localeToUse) {
    setLocale(prevLocale);
  }

  return result;
}
