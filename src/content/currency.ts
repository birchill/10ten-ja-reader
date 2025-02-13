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
}): { textDelimiter: RegExp; textEnd: number } | null {
  // If the source text might be a currency, expand our text delimiter to allow
  // extra symbols that would normally be ignored.
  const sourceText = currentText + nodeText;
  const mightBeCurrency =
    sourceText[0] === '¥' ||
    sourceText[0] === '￥' ||
    sourceText.startsWith('JPY') ||
    (startsWithNumeral(sourceText) &&
      (sourceText.indexOf('円') > 0 ||
        sourceText.toLowerCase().indexOf('yen') > 0));
  if (!mightBeCurrency) {
    return null;
  }

  const japaneseOrPrice = getCombinedCharRange([
    getNegatedCharRange(originalTextDelimiter),
    /[¥￥\s,、.．。kKmMbBtTyYeEnNJPY]/,
  ]);
  const textDelimiter = getNegatedCharRange(japaneseOrPrice);

  return { textDelimiter, textEnd: nodeText.search(textDelimiter) };
}

const currencyRegex =
  /((?:[￥¥]|JPY)\s*([0-9.,０-９。．、〇一二三四五六七八九十百千万億兆京]+)([kKmMbBtT]\b)?)|(([0-9.,０-９。．、〇一二三四五六七八九十百千万億兆京]+)([kKmMbBtT])?\s*(?:円|(?:[yY][eE][nN]\b)))/;

export function extractCurrencyMetadata(
  text: string
): CurrencyMeta | undefined {
  const matches = currencyRegex.exec(text);
  if (!matches || matches.index !== 0) {
    return undefined;
  }

  const valueStr = matches[2] ?? matches[5];

  if (!valueStr) {
    return undefined;
  }

  let value = parseNumber(valueStr);
  if (value === null) {
    return undefined;
  }

  // Handle metric suffixes---we handle them here instead of in parseNumber
  // because we only support them when they are part of a currency.
  const metricSuffix = matches[2] ? matches[3] : matches[6];
  switch (metricSuffix) {
    case 'k':
    case 'K':
      value *= 1_000;
      break;
    case 'm':
    case 'M':
      value *= 1_000_000;
      break;
    case 'b':
    case 'B':
      value *= 1_000_000_000;
      break;
    case 't':
    case 'T':
      value *= 1_000_000_000_000;
      break;
  }

  return { type: 'currency', value, matchLen: matches[0].length };
}
