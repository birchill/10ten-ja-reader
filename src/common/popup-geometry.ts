import * as s from 'superstruct';

export const PopupGeometrySchema = s.type({
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

export type PopupGeometry = s.Infer<typeof PopupGeometrySchema>;

// When we translate the popup geometry for a specific iframe, we annotate the
// result with the frameId.
export const TranslatedPopupGeometrySchema = s.intersection([
  PopupGeometrySchema,
  s.type({ frameId: s.number() }),
]);

export type TranslatedPopupGeometry = s.Infer<
  typeof TranslatedPopupGeometrySchema
>;
