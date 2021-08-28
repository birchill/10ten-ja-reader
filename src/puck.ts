import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from './content-container';

import puckStyles from '../css/puck.css';
import { getThemeClass } from './themes';

interface ViewportDimensions {
  viewportWidth: number;
  viewportHeight: number;
}

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export class RikaiPuck {
  public static id: string = 'tenten-ja-puck';
  private puck: HTMLDivElement | undefined;
  private enabled = false;

  private puckX: number;
  private puckY: number;
  private puckWidth: number;
  private puckHeight: number;
  private cachedViewportDimensions: ViewportDimensions | null = null;
  private cachedSafeAreaInsets: SafeAreaInsets | null = null;

  private setPosition(x: number, y: number) {
    this.puckX = x;
    this.puckY = y;
    if (this.puck) {
      this.puck.style.transform = `translate(${this.puckX}px, ${this.puckY}px)`;
    }
  }

  private getViewportDimensions(document: Document): ViewportDimensions {
    if (this.cachedViewportDimensions) {
      return this.cachedViewportDimensions;
    }

    /**
     * We'd ideally use document.documentElement.clientWidth and
     * document.documentElement.clientHeight for both viewport measurements, but
     * iOS 15 Safari doesn't behave suitably for that.
     *
     * iOS 15 Safari:
     * - seems to measure its safe area insets from the area defined by
     *   document.defaultView.innerHeight and .innerWidth.
     * - decreases both document.defaultView.innerHeight and the safe-area-inset-bottom
     *   in compact mode, and vice versa in non-compact mode.
     *
     * @see https://github.com/shirakaba/10ten-ja-reader/pull/3#issuecomment-875127566
     */
    this.cachedViewportDimensions = {
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.defaultView?.innerHeight ?? 0,
    };

    return this.cachedViewportDimensions;
  }

  private getSafeArea(safeAreaEnvProvider: HTMLElement): SafeAreaInsets {
    if (this.cachedSafeAreaInsets) {
      return this.cachedSafeAreaInsets;
    }

    const computedStyle = getComputedStyle(safeAreaEnvProvider);

    this.cachedSafeAreaInsets = {
      top:
        parseFloat(
          computedStyle.getPropertyValue('--tenten-puck-safe-area-inset-top')
        ) || 0,
      right:
        parseFloat(
          computedStyle.getPropertyValue('--tenten-puck-safe-area-inset-right')
        ) || 0,
      bottom:
        parseFloat(
          computedStyle.getPropertyValue('--tenten-puck-safe-area-inset-bottom')
        ) || 0,
      left:
        parseFloat(
          computedStyle.getPropertyValue('--tenten-puck-safe-area-inset-left')
        ) || 0,
    };

    return this.cachedSafeAreaInsets;
  }

  private setPositionWithinSafeArea(x: number, y: number) {
    if (!this.puck) {
      return;
    }

    const {
      top: safeAreaTop,
      right: safeAreaRight,
      bottom: safeAreaBottom,
      left: safeAreaLeft,
    } = this.getSafeArea(this.puck);

    const { viewportWidth, viewportHeight } = this.getViewportDimensions(
      this.puck.ownerDocument
    );

    const minX = safeAreaLeft;
    const maxX = viewportWidth - safeAreaRight - this.puckWidth;
    const minY = safeAreaTop;
    const maxY = viewportHeight - safeAreaBottom - this.puckHeight;

    this.setPosition(
      Math.min(Math.max(minX, x), maxX),
      Math.min(Math.max(minY, y), maxY)
    );
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.puckWidth || !this.puckHeight || !this.enabled) {
      return;
    }

    event.preventDefault();

    const { clientX, clientY } = event;
    this.setPositionWithinSafeArea(
      clientX - this.puckWidth / 2,
      clientY - this.puckHeight / 2
    );

    // Work out where we want to lookup
    const targetX = this.puckX;
    // Offset by at least one pixel so that Rikai doesn't attempt to tunnel into
    // the puck rather than the text.
    const targetY = this.puckY - 1;

    // Make sure the target is an actual element since the mousemove handler
    // expects that.
    const target = document.elementFromPoint(targetX, targetY);
    if (target) {
      target.dispatchEvent(
        new MouseEvent('mousemove', {
          // Make sure the event bubbles up to the listener on the window
          bubbles: true,
          clientX: targetX,
          clientY: targetY,
        })
      );
    }
  };

  // Prevent any mouse events on the puck itself from being used for lookup.
  //
  // At least in Firefox we can get _both_ pointer events and mouse events being
  // dispatched.
  private readonly onMouseMove = (event: MouseEvent) => {
    event.stopPropagation();
  };

  private readonly onWindowResize = (event: UIEvent) => {
    this.cachedViewportDimensions = null;
    this.cachedSafeAreaInsets = null;
    this.setPositionWithinSafeArea(this.puckX, this.puckY);
  };

  render({ doc, theme }: { doc: Document; theme: string }): void {
    // Set up shadow tree
    const container = getOrCreateEmptyContainer({
      doc,
      id: RikaiPuck.id,
      styles: puckStyles.toString(),
    });

    // Create puck elem
    this.puck = doc.createElement('div');
    this.puck.classList.add('puck');
    container.shadowRoot!.append(this.puck);

    // Set theme styles
    this.puck.classList.add(getThemeClass(theme));

    // Calculate the puck size
    if (!this.puckWidth || !this.puckHeight) {
      const { width, height } = this.puck.getBoundingClientRect();
      this.puckWidth = width;
      this.puckHeight = height;
    }

    // Place in the bottom-right of the safe area
    this.setPositionWithinSafeArea(
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER
    );

    // Add event listeners
    if (this.enabled) {
      window.addEventListener('resize', this.onWindowResize);
      this.puck.addEventListener('pointermove', this.onPointerMove);
      this.puck.addEventListener('mousemove', this.onMouseMove, {
        capture: true,
      });
    }
  }

  setTheme(theme: string) {
    if (!this.puck) {
      return;
    }

    for (const className of this.puck.classList.values()) {
      if (className.startsWith('-')) {
        this.puck.classList.remove(className);
      }
    }

    this.puck.classList.add(`-${theme}`);
  }

  unmount(): void {
    removePuck();
    this.disable();
    this.puck = undefined;
  }

  enable(): void {
    this.enabled = true;
    if (this.puck) {
      window.addEventListener('resize', this.onWindowResize);
      this.puck.addEventListener('pointermove', this.onPointerMove);
      this.puck.addEventListener('mousemove', this.onMouseMove, {
        capture: true,
      });
    }
  }

  disable(): void {
    this.enabled = false;
    if (this.puck) {
      window.removeEventListener('resize', this.onWindowResize);
      this.puck.removeEventListener('pointermove', this.onPointerMove);
      this.puck.removeEventListener('mousemove', this.onMouseMove, {
        capture: true,
      });
    }
  }
}

export function removePuck(): void {
  removeContentContainer(RikaiPuck.id);
}
