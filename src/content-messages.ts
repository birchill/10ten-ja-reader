// Puck methods

type MoonMovedMessage = {
  kind: '10ten(ja):moonMoved';
  clientX: number;
  clientY: number;
};

export type ContentMessage = MoonMovedMessage;
