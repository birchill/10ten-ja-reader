import { CopyType } from './copy-keys';

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

type MoonMovedMessage = {
  kind: '10ten(ja):moonMoved';
  clientX: number;
  clientY: number;
};

export type ContentMessage =
  | ClearResultMessage
  | NextDictionaryMessage
  | ToggleDefinitionMessage
  | MovePopupMessage
  | EnterCopyModeMessage
  | ExitCopyModeMessage
  | NextCopyEntryMessage
  | CopyCurrentEntryMessage
  | PopupHiddenMessage
  | PopupShownMessage
  | IsPopupShownMessage
  | MoonMovedMessage;
