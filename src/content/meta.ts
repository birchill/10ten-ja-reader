import {
  CurrencyMeta,
  extractCurrencyMetadata,
  lookForCurrency,
} from './currency';
import { MeasureMeta, extractMeasureMetadata, lookForMeasure } from './measure';
import { NumberMeta, extractNumberMetadata } from './numbers';
import { ShogiMeta, extractShogiMetadata, lookForShogi } from './shogi';
import { EraMeta, extractEraMetadata, lookForEra } from './years';

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
}): {
  textDelimiter: RegExp;
  textEnd: number;
} {
  return (
    (matchCurrency
      ? lookForCurrency({ currentText, nodeText, textDelimiter })
      : undefined) ||
    lookForEra({ currentText, nodeText, textEnd, textDelimiter }) ||
    lookForShogi({ nodeText, textDelimiter }) ||
    lookForMeasure({ nodeText, textDelimiter }) || {
      textDelimiter,
      textEnd,
    }
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
