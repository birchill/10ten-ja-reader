import { getCombinedCharRange, getNegatedCharRange, kanji } from './char-range';
import { kanjiToNumber } from './numbers';

export function lookForMeasure({
  nodeText,
  textDelimiter: originalTextDelimeter,
}: {
  nodeText: string;
  textDelimiter: RegExp;
}): {
  textDelimiter: RegExp;
  textEnd: number;
} | null {
  if (!startsWithNumber(nodeText)) {
    return null;
  }

  const japaneseOrNumberish = getCombinedCharRange([
    getNegatedCharRange(originalTextDelimeter),
    /[0-9.。\sm2㎡²]/,
  ]);
  const textDelimiter = getNegatedCharRange(japaneseOrNumberish);

  return {
    textDelimiter,
    textEnd: nodeText.search(textDelimiter),
  };
}

const numberStartRegex = /^[0-9０-９一二三四五六七八九十百]/;

function startsWithNumber(input: string): boolean {
  return !!input.length && numberStartRegex.test(input);
}

export type MeasureMeta = {
  type: 'measure';
  unit: '帖' | '畳' | 'm2';
  value: number;
  matchLen: number;
};

const jouRegex = /([0-9.０-９。〇一二三四五六七八九十百]+)\s*(畳|帖)(半?)/;
const squareMeterRegex =
  /([0-9.０-９。〇一二三四五六七八九十百]+)\s*(㎡|(?:m2)|(?:m²)|(?:平方メートル)|(?:平方ﾒｰﾄﾙ)|(?:平方㍍)|(?:平㍍)|(?:平米)|(?:平方米))/;

export function extractMeasureMetadata(text: string): MeasureMeta | undefined {
  let type: 'jou' | 'm2';

  // Try either of our regexs
  let matches = jouRegex.exec(text);
  if (matches && matches.index === 0 && matches.length === 4) {
    type = 'jou';
  } else {
    matches = squareMeterRegex.exec(text);
    if (!matches || matches.index !== 0 || matches.length !== 3) {
      return undefined;
    }
    type = 'm2';
  }

  // Parse value
  if (typeof matches[1] !== 'string') {
    return undefined;
  }

  const valueStr = matches[1];
  let value: number | null = null;
  if (kanji.test(valueStr.substring(0, 1))) {
    value = kanjiToNumber(valueStr);
  } else {
    value = parseFloat(
      valueStr.replace(/[０-９]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
      )
    );
  }

  if (value === null) {
    return undefined;
  }

  // Parse unit
  let unit: MeasureMeta['unit'];
  if (type === 'jou') {
    if (matches[2] !== '畳' && matches[2] !== '帖') {
      return undefined;
    }
    unit = matches[2];
  } else {
    unit = type;
  }

  // Add final 半
  if (type === 'jou' && matches[3] === '半') {
    value += 0.5;
  }

  return {
    type: 'measure',
    unit,
    value,
    matchLen: matches[0].length,
  };
}

export type ConvertedMeasure = Omit<MeasureMeta, 'matchLen' | 'type'>;

export function convertMeasure(measure: MeasureMeta): ConvertedMeasure {
  if (measure.unit === 'm2') {
    return {
      unit: '帖',
      value: measure.value / 1.62,
    };
  }

  return {
    unit: 'm2',
    value: measure.value * 1.62,
  };
}
