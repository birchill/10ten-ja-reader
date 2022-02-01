/**
 * @jest-environment jsdom
 */

let locale: 'en' | 'ja' | 'zh_hans' = 'en';

jest.mock('webextension-polyfill-ts', () => ({
  browser: {
    i18n: {
      getMessage: (id: string, replacements?: string | Array<string>) =>
        getMessagePolyfill(locale, id, replacements),
    },
  },
}));

import * as fs from 'fs';
import * as path from 'path';
import { isObject } from '../../utils/is-object';
import { ShogiMeta } from '../shogi';
import { clearLangTagCache } from './lang-tag';

import { renderMetadata } from './metadata';

function setLocale(localeToSet: 'en' | 'ja' | 'zh_hans') {
  locale = localeToSet;
  clearLangTagCache();
}

function getMessagePolyfill(
  locale: 'en' | 'ja' | 'zh_hans',
  id: string,
  replacements?: string | Array<string>
) {
  const messageContents = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', '_locales', locale, 'messages.json'),
    { encoding: 'utf8' }
  );
  if (!messageContents) {
    throw new Error(`Could not read messages.json for locale \`${locale}\``);
  }

  const messages = JSON.parse(messageContents);
  const stringInfo = messages[id];
  if (!messages) {
    throw new Error(
      `Could not find message \`${id}\` for locale \`${locale}\``
    );
  }

  const message = stringInfo.message as string;

  if (!message.includes('$')) {
    return message;
  }

  // Expand placeholders
  // Based on https://searchfox.org/mozilla-central/rev/78963fe42f8d5f582f84da84a5e78377b6c1fc32/toolkit/components/extensions/ExtensionCommon.jsm#1919
  const placeholders = new Map();
  if ('placeholders' in stringInfo && isObject(stringInfo.placeholders)) {
    for (const key of Object.keys(stringInfo.placeholders)) {
      placeholders.set(key.toLowerCase(), stringInfo.placeholders[key]);
    }
  }

  const placeholderReplacer = (_match: string, name: string) => {
    const replacement = placeholders.get(name.toLowerCase());
    if (isObject(replacement) && 'content' in replacement) {
      return replacement.content;
    }
    return '';
  };

  const expandedMessage = message.replace(
    /\$([A-Za-z0-9@_]+)\$/g,
    placeholderReplacer
  );

  const substitutions: Array<string> = replacements
    ? Array.isArray(replacements)
      ? replacements
      : [replacements]
    : [];

  // Based on https://searchfox.org/mozilla-central/rev/78963fe42f8d5f582f84da84a5e78377b6c1fc32/toolkit/components/extensions/ExtensionCommon.jsm#1919
  const stringReplacer = (
    _matched: string,
    index: string,
    dollarSigns: string
  ) => {
    if (index) {
      // This is not quite Chrome-compatible. Chrome consumes any number
      // of digits following the $, but only accepts 9 substitutions. We
      // accept any number of substitutions.
      const indexAsNum = parseInt(index, 10) - 1;
      return indexAsNum in substitutions ? substitutions[indexAsNum] : '';
    }
    // For any series of contiguous `$`s, the first is dropped, and
    // the rest remain in the output string.
    return dollarSigns;
  };
  return expandedMessage.replace(/\$(?:([1-9]\d*)|(\$+))/g, stringReplacer);
}

describe('renderShogiInfo', () => {
  afterEach(() => {
    setLocale('en');
  });

  it('renders a shogi move with a piece and destination', () => {
    expect(getShogiMove({ src: '８三銀', dest: [8, 3], piece: 's' })).toBe(
      'silver general to 83'
    );
    expect(
      getShogiMove({ src: '８三銀', dest: [8, 3], piece: 's' }, 'ja')
    ).toBe('銀将を８三に');
    expect(
      getShogiMove({ src: '８三銀', dest: [8, 3], piece: 's' }, 'zh_hans')
    ).toBe('銀将を８三に');
  });

  it('renders a shogi move using the same destination', () => {
    expect(getShogiMove({ src: '８三銀', piece: 's' })).toBe(
      "silver general to previous move's position"
    );
    expect(getShogiMove({ src: '８三銀', piece: 's' }, 'ja')).toBe(
      '銀将を同じ場所に'
    );
  });

  it('renders a shogi move where a side is specified', () => {
    expect(
      getShogiMove({
        src: '☗2五馬',
        side: 'black',
        dest: [2, 5],
        piece: 'pro_b',
      })
    ).toBe('black horse (promoted bishop) to 25');
    expect(
      getShogiMove(
        { src: '☗2五馬', side: 'black', dest: [2, 5], piece: 'pro_b' },
        'ja'
      )
    ).toBe('先手が竜馬を２五に');
  });
});

function getShogiMove(
  meta: Omit<ShogiMeta, 'type' | 'matchLen'>,
  localeToUse?: 'en' | 'ja' | 'zh_hans'
): string | undefined {
  const params: Parameters<typeof renderMetadata>[0] = {
    fxData: undefined,
    isCombinedResult: false,
    matchLen: meta.src.length,
    meta: {
      ...meta,
      type: 'shogi',
      matchLen: meta.src.length,
    },
  };

  const prevLocale = locale;
  if (localeToUse) {
    setLocale(localeToUse);
  }

  const result =
    renderMetadata(params)?.querySelector('.value')?.textContent ?? undefined;

  if (prevLocale !== localeToUse) {
    setLocale(prevLocale);
  }

  return result;
}
