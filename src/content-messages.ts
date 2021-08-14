import { CopyType } from './copy-keys';
import { Point } from './geometry';
import { SelectionMeta } from './meta';
import { TargetProps } from './target-props';

export type LookupMessage = {
  kind: 'lookup';
  dictMode: 'default' | 'kanji';
  meta?: SelectionMeta;
  point: Point;
  targetProps: TargetProps;
  text: string;
  wordLookup: boolean;
};

export type ClearTextMessage = {
  kind: 'clearText';
};

export type NextDictionaryMessage = {
  kind: 'nextDictionary';
};

export type ToggleDefinitionMessage = {
  kind: 'toggleDefinition';
};

export type MovePopupMessage = {
  kind: 'movePopup';
  direction: 'up' | 'down';
};

// Copy-mode related messages

export type EnterCopyModeMessage = {
  kind: 'enterCopyMode';
};

export type ExitCopyModeMessage = {
  kind: 'exitCopyMode';
};

export type NextCopyEntryMessage = {
  kind: 'nextCopyEntry';
};

export type CopyCurrentEntryMessage = {
  kind: 'copyCurrentEntry';
  copyType: CopyType;
};

// Text highlight messages

export type HighlightTextMessage = {
  kind: 'highlightText';
  length: number;
};

export type ClearTextHighlightMessage = {
  kind: 'clearTextHighlight';
};

// Popup showing status messages

type PopupHiddenMessage = {
  kind: 'popupHidden';
};

type PopupShownMessage = {
  kind: 'popupShown';
};

type IsPopupShownMessage = {
  kind: 'isPopupShown';
};

export type ContentMessage =
  | LookupMessage
  | ClearTextMessage
  | NextDictionaryMessage
  | ToggleDefinitionMessage
  | MovePopupMessage
  | EnterCopyModeMessage
  | ExitCopyModeMessage
  | NextCopyEntryMessage
  | CopyCurrentEntryMessage
  | HighlightTextMessage
  | ClearTextHighlightMessage
  | PopupHiddenMessage
  | PopupShownMessage
  | IsPopupShownMessage;
