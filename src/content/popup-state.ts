import { discriminator } from '@birchill/discriminator';
import * as s from 'superstruct';
import { ExpandRecursively } from '../utils/type-helpers';

const PopupPositionSchema = s.type({
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
      x: s.number(),
      y: s.number(),
    })
  ),
});

const GhostDataSchema = discriminator('kind', {
  // Transition to interactive when the timeout expires
  //
  // This is only used by the top-most window.
  timeout: s.type({ timeout: s.number() }),
  // Transition to interactive when the following keys are no longer held
  keys: s.type({ keyType: s.number() }),
});

export const PopupStateSchema = s.type({
  // Record the position of the window
  //
  // Only set on the top-most window and the iframe whose content the popup is
  // positioned relative to.
  pos: s.optional(PopupPositionSchema),

  // Set when the popup is showing, but is not yet interactive.
  //
  // The 'kind' field indicates the condition required to transition to
  // being interactive.
  ghost: s.optional(GhostDataSchema),
});

export type PopupState = s.Infer<typeof PopupStateSchema>;

// When we translate the popup geometry for a specific iframe, we annotate the
// result with the frameId.
export const TranslatedPopupStateSchema = s.type({
  pos: s.intersection([PopupPositionSchema, s.type({ frameId: s.number() })]),
  ghost: s.optional(GhostDataSchema),
});

export type TranslatedPopupState = ExpandRecursively<
  s.Infer<typeof TranslatedPopupStateSchema>
>;
