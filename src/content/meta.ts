import type { CurrencyMeta } from './currency';
import { extractCurrencyMetadata, lookForCurrency } from './currency';
import type { EraMeta } from './dates';
import { extractEraMetadata, lookForEra } from './dates';
import type { MeasureMeta } from './measure';
import { extractMeasureMetadata, lookForMeasure } from './measure';
import type { NumberMeta } from './numbers';
import { extractNumberMetadata } from './numbers';
import type { ShogiMeta } from './shogi';
import { extractShogiMetadata, lookForShogi } from './shogi';

export type SelectionMeta =
  | CurrencyMeta
  | EraMeta
  | MeasureMeta
  | NumberMeta
  | ShogiMeta;

export function lookForMetadata({
  currentText,
  nodeText,
  matchCurrency,
  textEnd,
  textDelimiter,
}: {
  currentText: string;
  nodeText: string;
  matchCurrency: boolean;
  textEnd: number;
  textDelimiter: RegExp;
}): { textDelimiter: RegExp; textEnd: number } {
  return (
    (matchCurrency
      ? lookForCurrency({ currentText, nodeText, textDelimiter })
      : undefined) ||
    lookForEra({ currentText, nodeText, textEnd, textDelimiter }) ||
    lookForShogi({ nodeText, textDelimiter }) ||
    lookForMeasure({ nodeText, textDelimiter }) || { textDelimiter, textEnd }
  );
}

export function extractGetTextMetadata({
  text,
  matchCurrency,
}: {
  text: string;
  matchCurrency: boolean;
}): SelectionMeta | undefined {
  return (
    (matchCurrency ? extractCurrencyMetadata(text) : undefined) ||
    extractEraMetadata(text) ||
    extractShogiMetadata(text) ||
    extractMeasureMetadata(text) ||
    extractNumberMetadata(text)
  );
}
