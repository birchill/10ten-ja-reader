export class TouchClickTracker {
  private wasTouch = false;
  onTouchClick?: (event: MouseEvent) => void;

  constructor() {
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onClick = this.onClick.bind(this);

    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    window.addEventListener('click', this.onClick);
  }

  destroy() {
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('click', this.onClick);
  }

  private onTouchStart() {
    this.wasTouch = false;
  }

  private onTouchEnd() {
    this.wasTouch = true;
  }

  private onClick(event: MouseEvent) {
    const { wasTouch } = this;
    this.wasTouch = false;
    if (wasTouch) {
      this.onTouchClick?.(event);
    }
  }
}
