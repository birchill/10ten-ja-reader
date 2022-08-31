import { discriminator } from '@birchill/discriminator';
import * as s from 'superstruct';

export const PopupStateSchema = s.type({
  // Record the position of the window
  //
  // Only set on the top-most window and the iframe whose content the popup is
  // positioned relative to.
  pos: s.optional(
    s.type({
      // The frame to which the coordinates are relative.
      frameId: s.number(),
      // Page coordinates
      x: s.number(),
      y: s.number(),
      width: s.number(),
      height: s.number(),
      direction: s.enums(['vertical', 'horizontal', 'disjoint'] as const),
      side: s.enums(['before', 'after', 'disjoint'] as const),
      // Reference lookup point we should use for determining if a mouse move is
      // "between" the lookup point and the popup.
      lookupPoint: s.optional(
        s.type({
          // Page coordinates
          x: s.number(),
          y: s.number(),
        })
      ),
    })
  ),

  // The type of content the popup is positioned relative to.
  contentType: s.enums(['text', 'image'] as const),

  // Set when the popup is showing, but is not yet interactive.
  //
  // The 'kind' field indicates the condition required to transition to
  // being interactive.
  ghost: s.optional(
    discriminator('kind', {
      // Transition to interactive when the timeout expires
      // (Only used by the top-most window.)
      timeout: s.type({ timeout: s.number() }),
      // Transition to interactive when the following keys are no longer held
      keys: s.type({ keyType: s.number() }),
    })
  ),
});

export type PopupState = s.Infer<typeof PopupStateSchema>;
