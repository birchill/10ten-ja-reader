export class TouchClickTracker {
  private wasTouch = false;
  private ignoring = false;
  private disabled = false;
  private clickHandlerRegistered = false;
  onTouchClick?: (event: MouseEvent) => void;

  constructor() {
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onClick = this.onClick.bind(this);

    this.addEventListeners();
  }

  destroy() {
    this.removeEventListeners();
  }

  disable() {
    if (this.disabled) {
      return;
    }

    this.disabled = true;
    this.removeEventListeners();
  }

  enable() {
    if (!this.disabled) {
      return;
    }

    this.disabled = false;
    this.addEventListeners();
  }

  startIgnoringClicks() {
    this.ignoring = true;
  }

  stopIgnoringClicks() {
    this.ignoring = false;
  }

  private addEventListeners() {
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    // We need to register for clicks on the _body_ because if there is no
    // click handler on the body element, iOS won't generate click events
    // from touch taps.
    document.body?.addEventListener('click', this.onClick);
    this.clickHandlerRegistered = !!document.body;
  }

  private removeEventListeners() {
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchend', this.onTouchEnd);
    document.body?.removeEventListener('click', this.onClick);
    this.clickHandlerRegistered = false;
  }

  private onTouchStart() {
    if (!this.clickHandlerRegistered) {
      document.body?.addEventListener('click', this.onClick);
      this.clickHandlerRegistered = !!document.body;
    }
    this.wasTouch = false;
  }

  private onTouchEnd() {
    this.wasTouch = !this.ignoring;
  }

  private onClick(event: MouseEvent) {
    const { wasTouch } = this;
    this.wasTouch = false;
    if (wasTouch) {
      this.onTouchClick?.(event);
    }
  }
}
