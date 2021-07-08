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
  private targetOffset: { x: number; y: number } = { x: 0, y: 0 };
  private cachedViewportDimensions: ViewportDimensions | null = null;
  private cachedSafeAreaInsets: SafeAreaInsets | null = null;
  private isBeingDragged: boolean = false;

  private setPosition(x: number, y: number) {
    this.puckX = x;
    this.puckY = y;

    // Update puck
    if (this.puck) {
      this.puck.style.transform = `translate(${this.puckX}px, ${this.puckY}px)`;
    }

    // Calculate the corresponding target point.
    const { viewportWidth } = this.getViewportDimensions(
      this.puck?.ownerDocument || document
    );
    const midpointOfPuck = this.puckX + this.puckWidth / 2;
    const horizontalPortion = midpointOfPuck / viewportWidth;

    // Let the target drift by up to 45 degrees in either direction
    const range = Math.PI / 2;
    const angle = horizontalPortion * range - range / 2;
    const offsetX = Math.sin(angle) * 35;
    const offsetY = -60;

    const restOffsetX = Math.sin(angle) * 25;
    const restOffsetY = -Math.cos(angle) * 25;

    this.targetOffset = { x: offsetX, y: offsetY };

    // Update target position in style
    if (this.puck) {
      this.puck.style.setProperty('--target-x-offset', `${offsetX}px`);
      this.puck.style.setProperty('--target-y-offset', `${offsetY}px`);
      this.puck.style.setProperty('--rest-x-offset', `${restOffsetX}px`);
      this.puck.style.setProperty('--rest-y-offset', `${restOffsetY}px`);
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

  private readonly onWindowPointerMove = (event: PointerEvent) => {
    if (
      !this.puck ||
      !this.puckWidth ||
      !this.puckHeight ||
      !this.enabled ||
      !this.isBeingDragged
    ) {
      return;
    }

    event.preventDefault();

    const { clientX, clientY } = event;

    this.setPositionWithinSafeArea(
      clientX - this.puckWidth / 2,
      clientY - this.puckHeight / 2
    );

    // Work out where we want to lookup
    const targetX = this.puckX + this.puckWidth / 2 + this.targetOffset.x;
    const targetY = this.puckY + this.puckHeight / 2 + this.targetOffset.y;

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

  private readonly onPuckPointerDown = (event: PointerEvent) => {
    if (!this.enabled || !this.puck) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.isBeingDragged = true;
    this.puck.style.pointerEvents = 'none';
    this.puck.classList.add('dragging');

    window.addEventListener('pointermove', this.onWindowPointerMove);
    window.addEventListener('pointerup', this.stopDraggingPuck);
    window.addEventListener('pointercancel', this.stopDraggingPuck);
  };

  private readonly stopDraggingPuck = () => {
    this.isBeingDragged = false;
    if (this.puck) {
      this.puck.style.pointerEvents = 'revert';
      this.puck.classList.remove('dragging');
    }

    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.stopDraggingPuck);
    window.removeEventListener('pointercancel', this.stopDraggingPuck);
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

    const earth = doc.createElement('div');
    earth.classList.add('earth');
    this.puck.append(earth);

    const moon = doc.createElement('div');
    moon.classList.add('moon');
    this.puck.append(moon);

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
      this.puck.addEventListener('pointerdown', this.onPuckPointerDown);
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
      this.puck.addEventListener('pointerdown', this.onPuckPointerDown);
    }
  }

  disable(): void {
    this.enabled = false;
    if (this.puck) {
      window.removeEventListener('resize', this.onWindowResize);
      this.stopDraggingPuck();
      this.puck.removeEventListener('pointerdown', this.onPuckPointerDown);
    }
  }
}

export function removePuck(): void {
  removeContentContainer(RikaiPuck.id);
}
