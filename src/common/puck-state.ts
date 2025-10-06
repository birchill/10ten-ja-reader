export type PuckState = {
  x: number;
  y: number;
  /**
   * Orientation of the moon. When reading direction is horizontal, can
   * be switched between above and below the earth; when horizontal, can
   * be switched between left and right sides of the earth.
   */
  orientation:
    | { readingDirection: 'horizontal'; moonSide: 'above' | 'below' }
    | { readingDirection: 'vertical'; moonSide: 'left' | 'right' };
  active: boolean;
};
