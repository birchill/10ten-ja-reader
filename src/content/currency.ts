import {
  getCombinedCharRange,
  getNegatedCharRange,
  startsWithNumeral,
} from '../utils/char-range';

import { parseNumber } from './numbers';

export type CurrencyMeta = {
  type: 'currency';
  value: number;
  matchLen: number;
};

export function lookForCurrency({
  currentText,
  nodeText,
  textDelimiter: originalTextDelimiter,
}: {
  currentText: string;
  nodeText: string;
  textDelimiter: RegExp;
}): {
  textDelimiter: RegExp;
  textEnd: number;
} | null {
  // If the source text might be a currency, expand our text delimiter to allow
  // extra symbols that would normally be ignored.
  const sourceText = currentText + nodeText;
  const mightBeCurrency =
    sourceText[0] === '¥' ||
    sourceText[0] === '￥' ||
    (startsWithNumeral(sourceText) && sourceText.indexOf('円') > 0);
  if (!mightBeCurrency) {
    return null;
  }

  const japaneseOrPrice = getCombinedCharRange([
    getNegatedCharRange(originalTextDelimiter),
    /[¥￥\s,、.．。]/,
  ]);
  const textDelimiter = getNegatedCharRange(japaneseOrPrice);

  return {
    textDelimiter,
    textEnd: nodeText.search(textDelimiter),
  };
}

const currencyRegex =
  /([￥¥]\s*([0-9.,０-９。．、〇一二三四五六七八九十百千万億兆京]+))|(([0-9.,０-９。．、〇一二三四五六七八九十百千万億兆京]+)\s*円)/;

export function extractCurrencyMetadata(
  text: string
): CurrencyMeta | undefined {
  const matches = currencyRegex.exec(text);
  if (!matches || matches.index !== 0) {
    return undefined;
  }

  const valueStr = matches[2] ?? matches[4];

  if (!valueStr) {
    return undefined;
  }

  const value = parseNumber(valueStr);
  if (!value) {
    return undefined;
  }

  return { type: 'currency', value, matchLen: matches[0].length };
}
