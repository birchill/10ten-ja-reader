import {
  getCombinedCharRange,
  getNegatedCharRange,
  halfWidthNumbers,
} from './char-range';
import { parseNumber } from './numbers';

export type CurrencyMeta = {
  type: 'currency';
  value: number;
  matchLen: number;
};

export function lookForCurrency({
  nodeText,
  textDelimiter: originalTextDelimeter,
}: {
  nodeText: string;
  textDelimiter: RegExp;
}): {
  textDelimiter: RegExp;
  textEnd: number;
} | null {
  // We only need to expand the search range if it starts with a currency
  // symbol. For the 8千円 case, the regular text lookup will find the necessary
  // text.
  if (nodeText.length && nodeText[0] !== '¥' && nodeText[0] !== '￥') {
    return null;
  }

  const japaneseOrPrice = getCombinedCharRange([
    getNegatedCharRange(originalTextDelimeter),
    halfWidthNumbers,
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
  let matches = currencyRegex.exec(text);
  if (!matches || matches.index !== 0) {
    return undefined;
  }

  const valueStr = matches[2] ?? matches[4];

  if (!valueStr) {
    return undefined;
  }

  let value = parseNumber(valueStr);
  if (!value) {
    return undefined;
  }

  return { type: 'currency', value, matchLen: matches[0].length };
}
