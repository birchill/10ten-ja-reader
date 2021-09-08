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
  highlightText: s.type({ length: s.number() }),
  clearTextHighlight: s.type({}),
});

export type BackgroundMessage = s.Infer<typeof BackgroundMessageSchema>;
