import * as s from 'superstruct';

export const PopupGeometrySchema = s.type({
  x: s.number(),
  y: s.number(),
  width: s.number(),
  height: s.number(),
  direction: s.enums(['vertical', 'horizontal', 'disjoint'] as const),
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
