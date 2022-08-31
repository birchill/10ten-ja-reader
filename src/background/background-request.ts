import { discriminator } from '@birchill/discriminator';
import * as s from 'superstruct';

import { PopupStateSchema } from '../content/popup-state';

const SearchRequestSchema = s.type({
  input: s.string(),
  includeRomaji: s.optional(s.boolean()),
});

export type SearchRequest = s.Infer<typeof SearchRequestSchema>;

export const BackgroundRequestSchema = discriminator('type', {
  //
  // Requests for the background page
  //
  disabled: s.type({}),
  'enable?': s.type({}),
  enabled: s.type({
    src: s.string(),
  }),
  options: s.type({}),
  searchWords: SearchRequestSchema,
  searchOther: SearchRequestSchema,
  switchedDictionary: s.type({}),
  toggleDefinition: s.type({}),
  translate: s.type({
    input: s.string(),
    includeRomaji: s.optional(s.boolean()),
  }),

  //
  // Requests to be forwarded to different frames
  //

  // We send these messages via the background page simply because using
  // postMessage causes some Web pages to break when they encounter unrecognized
  // messages.

  // Popup showing status
  'frame:popupShown': s.type({
    frameId: s.number(),
    state: s.optional(PopupStateSchema),
  }),
  'children:popupShown': s.type({
    state: s.optional(PopupStateSchema),
  }),
  'children:popupHidden': s.type({}),
  'top:isPopupShowing': s.type({}),

  // Text highlighting
  'frame:highlightText': s.type({ length: s.number(), frameId: s.number() }),
  'frame:clearTextHighlight': s.type({ frameId: s.number() }),

  // Lookup-related requests
  'top:lookup': s.type({
    // We don't validate the bulk of the contents here but leave that to the
    // receiving end.

    // Parameters for designating the iframe source properties
    source: s.type({
      src: s.string(),
      dimensions: s.type({
        width: s.number(),
        height: s.number(),
      }),
    }),
  }),
  'top:clearResult': s.type({}),
  'top:nextDictionary': s.type({}),
  'top:toggleDefinition': s.type({}),
  'top:movePopup': s.type({ direction: s.enums(['up', 'down'] as const) }),

  // Copy mode requests
  'top:enterCopyMode': s.type({}),
  'top:exitCopyMode': s.type({}),
  'top:nextCopyEntry': s.type({}),
  'top:copyCurrentEntry': s.type({
    copyType: s.enums(['entry', 'tab', 'word'] as const),
  }),
});

export type BackgroundRequest = s.Infer<typeof BackgroundRequestSchema>;
