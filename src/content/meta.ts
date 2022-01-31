import {
  CurrencyMeta,
  extractCurrencyMetadata,
  lookForCurrency,
} from './currency';
import { extractMeasureMetadata, lookForMeasure, MeasureMeta } from './measure';
import { extractNumberMetadata, NumberMeta } from './numbers';
import { ShogiMeta } from './shogi';
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
      ? lookForCurrency({ nodeText, textDelimiter })
      : undefined) ||
    lookForEra({ currentText, nodeText, textEnd }) ||
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
    extractMeasureMetadata(text) ||
    extractNumberMetadata(text)
  );
}
