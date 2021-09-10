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
  | PopupHiddenMessage
  | PopupShownMessage
  | IsPopupShownMessage
  | MoonMovedMessage;
