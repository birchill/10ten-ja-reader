import {
  CurrencyMeta,
  extractCurrencyMetadata,
  lookForCurrency,
} from './currency';
import { MeasureMeta, extractMeasureMetadata, lookForMeasure } from './measure';
import { EraMeta, extractEraMetadata, lookForEra } from './years';

export type SelectionMeta = CurrencyMeta | EraMeta | MeasureMeta;

export function lookForMetadata({
  currentText,
  nodeText,
  textEnd,
  textDelimiter,
}: {
  currentText: string;
  nodeText: string;
  textEnd: number;
  textDelimiter: RegExp;
}): {
  textDelimiter: RegExp;
  textEnd: number;
} {
  return (
    lookForCurrency({ nodeText, textDelimiter }) ||
    lookForEra({ currentText, nodeText, textEnd }) ||
    lookForMeasure({ nodeText, textDelimiter }) || {
      textDelimiter,
      textEnd,
    }
  );
}

export function extractGetTextMetadata(
  text: string
): SelectionMeta | undefined {
  return (
    extractCurrencyMetadata(text) ||
    extractEraMetadata(text) ||
    extractMeasureMetadata(text)
  );
}
