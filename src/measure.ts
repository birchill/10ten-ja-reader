import {
  getCombinedCharRange,
  getNegatedCharRange,
  startsWithNumber,
} from './char-range';
import { parseNumber } from './numbers';

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

  // getTextFromTextNode should already have expanded this range to include
  // half-width numbers and serparators so we just need to add the units and
  // space characters.
  const japaneseOrUnit = getCombinedCharRange([
    getNegatedCharRange(originalTextDelimeter),
    /[\sm2㎡²]/,
  ]);
  const textDelimiter = getNegatedCharRange(japaneseOrUnit);

  return {
    textDelimiter,
    textEnd: nodeText.search(textDelimiter),
  };
}

export type MeasureMeta = {
  type: 'measure';
  unit: '帖' | '畳' | 'm2';
  value: number;
  matchLen: number;
};

const jouRegex = /([0-9.０-９。．〇一二三四五六七八九十百]+)\s*(畳|帖)(半?)/;
const squareMeterRegex =
  /([0-9.０-９。．〇一二三四五六七八九十百千万]+)\s*(㎡|(?:m2)|(?:m²)|(?:平方メートル)|(?:平方ﾒｰﾄﾙ)|(?:平方㍍)|(?:平㍍)|(?:平米)|(?:平方米))/;

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
  let value = parseNumber(valueStr);

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

export type ConvertedMeasure = {
  unit: '帖' | '畳' | 'm2';
  value: number;
  alt?: Array<AlternateMeasure>;
};

export type AlternateMeasure = {
  type: 'kyouma' | 'chuukyouma' | 'edoma' | 'danchima';
  label?: string;
  unit: '畳' | 'm2';
  value: number;
};

const alternateJouSizes: Array<{
  type: AlternateMeasure['type'];
  label: string;
  ratio: number;
}> = [
  { type: 'kyouma', label: '京間', ratio: 1.82405 },
  { type: 'chuukyouma', label: '中京間', ratio: 1.6562 },
  { type: 'edoma', label: '江戸間', ratio: 1.5488 },
  { type: 'danchima', label: '団地間', ratio: 1.445 },
];

export function convertMeasure(measure: MeasureMeta): ConvertedMeasure {
  if (measure.unit === 'm2') {
    return {
      unit: '帖',
      value: measure.value / 1.62,
      alt: alternateJouSizes.map((size) => ({
        type: size.type,
        label: size.label,
        unit: '畳',
        value: measure.value / size.ratio,
      })),
    };
  }

  return {
    unit: 'm2',
    value: measure.value * 1.62,
    alt:
      // Only show alternative sizes of the unit is 畳. If it's 帖 it
      // means 1.62m2.
      measure.unit === '畳'
        ? alternateJouSizes.map((size) => ({
            type: size.type,
            label: size.label,
            unit: 'm2',
            value: measure.value * size.ratio,
          }))
        : undefined,
  };
}
