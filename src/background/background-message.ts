import { discriminator } from '@birchill/discriminator';
import * as s from 'superstruct';

import { PopupState, PopupStateSchema } from '../content/popup-state';

export const BackgroundMessageSchema = discriminator('type', {
  disable: s.type({ frame: s.literal('*') }),
  enable: s.type({
    // We don't validate the contents of the config object yet
    config: s.type({}),
    id: s.optional(s.number()),
    frame: s.literal('*'),
  }),
  dbUpdated: s.type({ frame: s.literal('*') }),
  isTopMost: s.type({ frame: s.number() }),

  //
  // Relayed messages from other content scripts
  //

  // Popup showing status
  popupShown: s.type({
    frame: s.union([s.literal('children'), s.number()]),
    state: PopupStateSchema,
  }),
  popupHidden: s.type({ frame: s.literal('children') }),
  isPopupShowing: s.type({ frameId: s.number(), frame: s.literal('top') }),

  // Text highlighting
  highlightText: s.type({ length: s.number(), frame: s.number() }),
  clearTextHighlight: s.type({ frame: s.number() }),

  // Lookup-related messages
  lookup: s.type({
    dictMode: s.enums(['default', 'kanji']),
    // We don't validate the contents of meta (yet)
    meta: s.optional(s.type({})),
    point: s.type({ x: s.number(), y: s.number() }),
    // Likewise, we don't validate target props (yet)
    targetProps: s.type({}),
    text: s.string(),
    wordLookup: s.boolean(),
    // Parameters for designating the iframe source
    source: s.type({
      frameId: s.number(),
      initialSrc: s.optional(s.string()),
      currentSrc: s.string(),
      dimensions: s.type({ width: s.number(), height: s.number() }),
    }),
    frame: s.literal('top'),
  }),
  pinPopup: s.type({ frame: s.literal('top') }),
  unpinPopup: s.type({ frame: s.literal('top') }),
  commitPopup: s.type({ frame: s.literal('top') }),
  clearResult: s.type({ frame: s.literal('top') }),
  nextDictionary: s.type({ frame: s.literal('top') }),
  toggleDefinition: s.type({ frame: s.literal('top') }),
  expandPopup: s.type({ frame: s.literal('top') }),
  movePopup: s.type({
    direction: s.enums(['up', 'down']),
    frame: s.literal('top'),
  }),

  // Copy mode messages
  enterCopyMode: s.type({ frame: s.literal('top') }),
  exitCopyMode: s.type({ frame: s.literal('top') }),
  nextCopyEntry: s.type({ frame: s.literal('top') }),
  copyCurrentEntry: s.type({
    copyType: s.enums(['entry', 'tab', 'word']),
    frame: s.literal('top'),
  }),
});

export type BackgroundMessage = s.Infer<typeof BackgroundMessageSchema>;

export type IndividualFrameMessage =
  | Extract<BackgroundMessage, { frame: number }>
  | { type: 'popupShown'; frame: number | 'children'; state: PopupState };
// ^ This last bit is because I'm terrible at TypeScript meta programming

export type TopFrameMessage = Extract<BackgroundMessage, { frame: 'top' }>;
