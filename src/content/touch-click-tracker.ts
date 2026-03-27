export class TouchClickTracker {
  #wasTouch = false;
  #ignoring = false;
  #disabled = false;
  #clickHandlerRegistered = false;
  onTouchClick?: (event: MouseEvent) => void;

  constructor() {
    this.#addEventListeners();
  }

  destroy() {
    this.#removeEventListeners();
  }

  disable() {
    if (this.#disabled) {
      return;
    }

    this.#disabled = true;
    this.#removeEventListeners();
  }

  enable() {
    if (!this.#disabled) {
      return;
    }

    this.#disabled = false;
    this.#addEventListeners();
  }

  startIgnoringClicks() {
    this.#ignoring = true;
  }

  stopIgnoringClicks() {
    this.#ignoring = false;
  }

  #addEventListeners() {
    window.addEventListener('touchstart', this.#onTouchStart, {
      passive: true,
    });
    window.addEventListener('touchend', this.#onTouchEnd, { passive: true });
    // We need to register for clicks on the _body_ because if there is no
    // click handler on the body element, iOS won't generate click events
    // from touch taps.
    document.body?.addEventListener('click', this.#onClick);
    this.#clickHandlerRegistered = !!document.body;
  }

  #removeEventListeners() {
    window.removeEventListener('touchstart', this.#onTouchStart);
    window.removeEventListener('touchend', this.#onTouchEnd);
    document.body?.removeEventListener('click', this.#onClick);
    this.#clickHandlerRegistered = false;
  }

  #onTouchStart = () => {
    if (!this.#clickHandlerRegistered) {
      document.body?.addEventListener('click', this.#onClick);
      this.#clickHandlerRegistered = !!document.body;
    }
    this.#wasTouch = false;
  };

  #onTouchEnd = () => {
    this.#wasTouch = !this.#ignoring;
  };

  #onClick = (event: MouseEvent) => {
    const wasTouch = this.#wasTouch;
    this.#wasTouch = false;
    if (wasTouch) {
      this.onTouchClick?.(event);
    }
  };
}
