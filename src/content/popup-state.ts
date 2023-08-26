import { discriminator } from '@birchill/discriminator';
import * as s from 'superstruct';

export const PopupStateSchema = s.type({
  // Record the position of the window
  pos: s.optional(
    s.type({
      // The frame to which the coordinates are relative.
      frameId: s.number(),
      // Page coordinates
      x: s.number(),
      y: s.number(),
      width: s.number(),
      height: s.number(),
      direction: s.enums(['vertical', 'horizontal', 'disjoint']),
      side: s.enums(['before', 'after', 'disjoint']),
      // Whether or not the popup is allowed to overlap the lookup point.
      allowOverlap: s.boolean(),
      // Reference lookup point we should use for determining if a mouse move is
      // "between" the lookup point and the popup.
      lookupPoint: s.optional(
        s.type({
          // Page coordinates
          x: s.number(),
          y: s.number(),
          // Area around the lookup point that should be treated as being "on"
          // the point.
          //
          // For example, when the lookup point is the center of a text
          // character, we want to treat the whole the bbox of the character as
          // being part of the "point'.
          //
          // This is only needed when the popup transitions from hover -> ghost
          // display mode and hold-to-show keys are configured (but no longer
          // pressed, hence the transition). Without this, we can easily get
          // mousemove events that are outside the lookup point and not on the
          // path to the popup but where we really don't want to close the
          // popup since they're still in roughly the same place.
          //
          // When we _don't_ have hold-to-show keys configured this is not
          // a problem because, provided the mouse is still inside the character
          // that triggered the lookup, we'll keep showing the popup.
          //
          // This is expressed as a margin simply so that we don't have to
          // convert it when transferring between frames.
          marginX: s.number(),
          marginY: s.number(),
        })
      ),
    })
  ),

  // The type of content the popup is positioned relative to.
  contentType: s.enums(['text', 'image']),

  // The particular appearance and behavior of the popup
  display: discriminator('mode', {
    // static: no interactivity, small tabs, no close button etc.
    static: s.type({}),
    // ghost: not interactive yet, shows tabs etc. but has a dotted outline,
    // has no pointer events, and no arrow. Used while scanning using the mouse
    // before settling on a word to lookup.
    ghost: discriminator('trigger', {
      // Transition to hover when the timeout expires
      timeout: s.type({ timeout: s.number() }),
      // Transition to hover when the following keys are no longer held
      keys: s.type({ keyType: s.number() }),
    }),
    // hover: interactive using the mouse by hovering over it. Shows an arrow
    // to the lookup point.
    hover: s.type({}),
    // pinned: similar to hover but remains visible even if the mouse moves
    // outside the popup.
    pinned: s.type({}),
    // touch: interactive using touch events. Has no arrow to the lookup point
    // and does not allowing hovering over using the mouse.
    touch: s.type({}),
  }),
});

export type PopupState = s.Infer<typeof PopupStateSchema>;

export type DisplayMode = PopupState['display']['mode'];

export function clearPopupTimeout(popupState?: PopupState) {
  if (
    popupState?.display.mode === 'ghost' &&
    popupState.display.trigger === 'timeout'
  ) {
    window.clearTimeout(popupState.display.timeout);
  }
}
