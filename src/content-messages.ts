// Popup showing status messages

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
  | PopupShownMessage
  | IsPopupShownMessage
  | MoonMovedMessage;
