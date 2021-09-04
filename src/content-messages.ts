import { CopyType } from './copy-keys';
import { Point } from './geometry';
import { SelectionMeta } from './meta';
import { TargetProps } from './target-props';

export type LookupMessage = {
  kind: '10ten(ja):lookup';
  dictMode: 'default' | 'kanji';
  meta?: SelectionMeta;
  point: Point;
  targetProps: TargetProps;
  text: string;
  wordLookup: boolean;
};

export type ClearResultMessage = {
  kind: '10ten(ja):clearResult';
};

export type NextDictionaryMessage = {
  kind: '10ten(ja):nextDictionary';
};

export type ToggleDefinitionMessage = {
  kind: '10ten(ja):toggleDefinition';
};

export type MovePopupMessage = {
  kind: '10ten(ja):movePopup';
  direction: 'up' | 'down';
};

// Copy-mode related messages

export type EnterCopyModeMessage = {
  kind: '10ten(ja):enterCopyMode';
};

export type ExitCopyModeMessage = {
  kind: '10ten(ja):exitCopyMode';
};

export type NextCopyEntryMessage = {
  kind: '10ten(ja):nextCopyEntry';
};

export type CopyCurrentEntryMessage = {
  kind: '10ten(ja):copyCurrentEntry';
  copyType: CopyType;
};

// Text highlight messages

export type HighlightTextMessage = {
  kind: '10ten(ja):highlightText';
  length: number;
};

export type ClearTextHighlightMessage = {
  kind: '10ten(ja):clearTextHighlight';
};

// Popup showing status messages

type PopupHiddenMessage = {
  kind: '10ten(ja):popupHidden';
};

type PopupShownMessage = {
  kind: '10ten(ja):popupShown';
};

type IsPopupShownMessage = {
  kind: '10ten(ja):isPopupShown';
};

// Puck methods

type MovePuckMessage = {
  kind: '10ten(ja):movePuck';
  clientX: number;
  clientY: number;
};

type StopDraggingPuckMessage = {
  kind: '10ten(ja):stopDraggingPuck';
};

type PuckTargetMovedMessage = {
  kind: '10ten(ja):puckTargetMoved';
  clientX: number;
  clientY: number;
};

export type ContentMessage =
  | LookupMessage
  | ClearResultMessage
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
  | IsPopupShownMessage
  | MovePuckMessage
  | StopDraggingPuckMessage
  | PuckTargetMovedMessage;
