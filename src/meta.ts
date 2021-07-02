import { MeasureMeta, extractMeasureMetadata, lookForMeasure } from './measure';
import { EraMeta, extractEraMetadata, lookForEra } from './years';

export type SelectionMeta = EraMeta | MeasureMeta;

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
  return extractEraMetadata(text) || extractMeasureMetadata(text);
}
