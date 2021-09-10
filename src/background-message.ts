import { discriminator } from '@birchill/discriminator';
import * as s from 'superstruct';

export const BackgroundMessageSchema = discriminator('type', {
  disable: s.type({}),
  enable: s.type({
    // We don't validate the contents of the config object yet
    config: s.type({}),
    id: s.optional(s.number()),
  }),
  isTopMost: s.type({}),

  // Relayed messages from other content scripts

  // Child-frame
  highlightText: s.type({ length: s.number() }),
  clearTextHighlight: s.type({}),

  // Top-most window
  lookup: s.type({
    dictMode: s.enums(['default', 'kanji'] as const),
    // We don't validate the contents of meta (yet)
    meta: s.optional(s.type({})),
    point: s.type({
      x: s.number(),
      y: s.number(),
    }),
    // Likewise, we don't validate target props (yet)
    targetProps: s.type({}),
    text: s.string(),
    wordLookup: s.boolean(),
    // Parameters for designating the iframe source
    source: s.type({
      frameId: s.number(),
      initialSrc: s.optional(s.string()),
      currentSrc: s.optional(s.string()),
      dimensions: s.optional(
        s.type({
          width: s.number(),
          height: s.number(),
        })
      ),
    }),
  }),
  clearResult: s.type({}),
  nextDictionary: s.type({}),
  toggleDefinition: s.type({}),
  movePopup: s.type({ direction: s.enums(['up', 'down'] as const) }),
  enterCopyMode: s.type({}),
  exitCopyMode: s.type({}),
  nextCopyEntry: s.type({}),
  copyCurrentEntry: s.type({
    copyType: s.enums(['entry', 'tab', 'word'] as const),
  }),
});

export type BackgroundMessage = s.Infer<typeof BackgroundMessageSchema>;
