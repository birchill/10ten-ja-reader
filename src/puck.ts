import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from './content-container';
import type { SafeAreaProvider } from './safe-area-provider';
import { getThemeClass } from './themes';
import { getIframeOriginFromWindow } from './iframe-tracker';
import type { ContentMessage } from './content-messages';

import puckStyles from '../css/puck.css';

interface ViewportDimensions {
  viewportWidth: number;
  viewportHeight: number;
}

export interface PuckRenderOptions {
  doc: Document;
  theme: string;
}

export function isPuckMouseEvent(
  mouseEvent: MouseEvent
): mouseEvent is PuckMouseEvent {
  return !!(mouseEvent as PuckMouseEvent).fromPuck;
}

export interface PuckMouseEvent extends MouseEvent {
  fromPuck: true;
}

export class RikaiPuck {
  public static id: string = 'tenten-ja-puck';
  private puck: HTMLDivElement | undefined;
  private enabled = false;
  private puckX: number;
  private puckY: number;
  private earthWidth: number;
  private earthHeight: number;
  private earthScaleFactorWhenDragging: number;
  private moonWidth: number;
  private moonHeight: number;
  // The translateY value to apply to the moon when it is orbiting above the earth.
  // Expressed as an absolute (positive) value.
  private targetAbsoluteOffsetYAbove: number;
  // The translateY value to apply to the moon when it is orbiting below the earth.
  // Expressed as an absolute (positive) value.
  private targetAbsoluteOffsetYBelow: number;
  // The translate (X and Y) values applied to the moon whilst it is being dragged.
  // They are measured relative to the midpoint of the moon (which is also the midpoint of the earth).
  private targetOffset: { x: number; y: number } = { x: 0, y: 0 };
  private targetOrientation: 'above' | 'below' = 'above';
  private cachedViewportDimensions: ViewportDimensions | null = null;
  private isBeingDragged: boolean = false;

  constructor(private safeAreaProvider: SafeAreaProvider) {}

  // @see SafeAreaConsumerDelegate
  onSafeAreaUpdated(): void {
    this.cachedViewportDimensions = null;
    this.setPositionWithinSafeArea(this.puckX, this.puckY);
  }

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
    const midpointOfPuck = this.puckX + this.earthWidth / 2;
    const horizontalPortion = midpointOfPuck / viewportWidth;

    // Let the target drift by up to 45 degrees in either direction.
    // Place the target either above or below the puck based on its current orientation.
    const range = Math.PI / 2;
    const angle = horizontalPortion * range - range / 2;
    const offsetYOrientationFactor =
      this.targetOrientation === 'above' ? -1 : 1;
    const offsetX = Math.sin(angle) * 35;
    const offsetY =
      (this.targetOrientation === 'above'
        ? this.targetAbsoluteOffsetYAbove
        : this.targetAbsoluteOffsetYBelow) * offsetYOrientationFactor;

    // At rest, make the target land on the surface of the puck.
    const restOffsetX = Math.sin(angle) * 25;
    const restOffsetY = Math.cos(angle) * 25 * offsetYOrientationFactor;

    this.targetOffset = { x: offsetX, y: offsetY };

    // Update target position in style
    if (this.puck) {
      this.puck.style.setProperty('--target-x-offset', `${offsetX}px`);
      this.puck.style.setProperty('--target-y-offset', `${offsetY}px`);
      this.puck.style.setProperty('--rest-x-offset', `${restOffsetX}px`);
      this.puck.style.setProperty('--rest-y-offset', `${restOffsetY}px`);
    }
  }

  public getPuckDimensions() {
    const minorVerticalPortionOfPuckAboutMouseEvent = this.moonHeight / 2;
    const majorVerticalPortionOfPuckAboutMouseEvent =
      Math.abs(this.targetOffset.y) +
      (this.earthScaleFactorWhenDragging * this.earthHeight) / 2;

    return {
      // The mouse event is emitted at the centre of the moon.
      puckAboveMouseEvent:
        this.targetOrientation === 'above'
          ? minorVerticalPortionOfPuckAboutMouseEvent
          : majorVerticalPortionOfPuckAboutMouseEvent,
      puckBelowMouseEvent:
        this.targetOrientation === 'above'
          ? majorVerticalPortionOfPuckAboutMouseEvent
          : minorVerticalPortionOfPuckAboutMouseEvent,
      puckLeftOfMouseEvent:
        (this.earthScaleFactorWhenDragging * this.earthWidth) / 2 +
        this.targetOffset.x,
      puckRightOfMouseEvent:
        (this.earthScaleFactorWhenDragging * this.earthWidth) / 2 -
        this.targetOffset.x,
    };
  }

  private getViewportDimensions(document: Document): ViewportDimensions {
    if (this.cachedViewportDimensions) {
      return this.cachedViewportDimensions;
    }

    // We'd ideally use document.documentElement.clientWidth and
    // document.documentElement.clientHeight for both viewport measurements, but
    // iOS 15 Safari doesn't behave suitably for that.
    //
    // iOS 15 Safari:
    //
    // - seems to measure its safe area insets from the area defined by
    //   document.defaultView.innerHeight and .innerWidth.
    //
    // - decreases both document.defaultView.innerHeight and the
    //   safe-area-inset-bottom in compact mode, and vice versa in non-compact
    //   mode.
    //
    // @see https://github.com/shirakaba/10ten-ja-reader/pull/3#issuecomment-875127566
    this.cachedViewportDimensions = {
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.defaultView?.innerHeight ?? 0,
    };

    return this.cachedViewportDimensions;
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
    } = this.safeAreaProvider.getSafeArea() || {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };

    const { viewportWidth, viewportHeight } = this.getViewportDimensions(
      this.puck.ownerDocument
    );

    const minX = safeAreaLeft;
    const maxX = viewportWidth - safeAreaRight - this.earthWidth;
    const minY = safeAreaTop;
    const maxY = viewportHeight - safeAreaBottom - this.earthHeight;

    this.setPosition(
      Math.min(Math.max(minX, x), maxX),
      Math.min(Math.max(minY, y), maxY)
    );
  }

  readonly onWindowPointerMove = (event: PointerEvent) => {
    if (
      !this.puck ||
      !this.earthWidth ||
      !this.earthHeight ||
      !this.enabled ||
      !this.isBeingDragged
    ) {
      return;
    }

    event.preventDefault();

    const { clientX, clientY } = event;

    // Translate the midpoint of the earth to the position of the pointer event.
    // This updates the moon offset
    this.setPositionWithinSafeArea(
      clientX - this.earthWidth / 2,
      clientY - this.earthHeight / 2
    );

    // Before applying the transformations to the earth and the moon, they
    // both share the same midpoint.
    // Work out the midpoint of the moon post-transformations. This is where
    // we'll fire the mousemove event to trigger a lookup.
    const targetX = this.puckX + this.earthWidth / 2 + this.targetOffset.x;
    const targetY = this.puckY + this.earthHeight / 2 + this.targetOffset.y;

    // Make sure the target is an actual element since the mousemove handler
    // expects that.
    let target = document.elementFromPoint(targetX, targetY);
    if (!target) {
      return;
    }

    // When the target is an iframe, simply firing a 'mousemove' event at it
    // does not have the desired effect of prompting a lookup at the target
    // location within the iframe.
    //
    // Instead, we post a '10ten(ja):moonMoved' message to the iframe. Our
    // injected content script ensures that the iframe has a listener in place
    // to handle this message. Upon receiving this message, the iframe will
    // fire a 'mousemove' event at the indicated location, ultimately resulting
    // in a lookup at the target point.
    if (target.tagName === 'IFRAME') {
      const iframeElement = target as HTMLIFrameElement;
      const contentWindow = iframeElement.contentWindow;
      if (!contentWindow) {
        return;
      }

      const originPoint = getIframeOriginFromWindow(contentWindow);
      if (!originPoint) {
        return;
      }

      // If it's an iframe, adjust the target position by the
      // offset of the iframe itself within the viewport.
      const { x, y } = originPoint;

      contentWindow.postMessage<ContentMessage>(
        {
          kind: '10ten(ja):moonMoved',
          clientX: targetX - x,
          clientY: targetY - y,
        },
        '*'
      );
      return;
    }

    const mouseEvent = new MouseEvent('mousemove', {
      // Make sure the event bubbles up to the listener on the window
      bubbles: true,
      clientX: targetX,
      clientY: targetY,
    });
    (mouseEvent as PuckMouseEvent).fromPuck = true;

    target.dispatchEvent(mouseEvent);
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

      // Update the target orientation if the puck was parked low down on the
      // screen.
      const { viewportHeight } = this.getViewportDimensions(
        this.puck?.ownerDocument || document
      );

      const { bottom: safeAreaBottom } =
        this.safeAreaProvider.getSafeArea() || {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        };

      // The distance from the bottom of the earth (which can only travel within the safe area)
      // to the centre of the moon (which is the point from which the mouse events are fired).
      // This is effectively the height of the "blind spot" that a puck supporting only the "above" orientation would have.
      const activePuckVerticalExtent =
        this.earthHeight +
        (this.targetAbsoluteOffsetYAbove - this.earthHeight / 2);
      this.targetOrientation =
        this.puckY >= viewportHeight - safeAreaBottom - activePuckVerticalExtent
          ? 'below'
          : 'above';
      this.setPositionWithinSafeArea(this.puckX, this.puckY);
    }

    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.stopDraggingPuck);
    window.removeEventListener('pointercancel', this.stopDraggingPuck);
  };

  render({ doc, theme }: PuckRenderOptions): void {
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

    // Calculate the earth size (which is equal to the puck's overall size)
    if (!this.earthWidth || !this.earthHeight) {
      const { width, height } = earth.getBoundingClientRect();
      this.earthWidth = width;
      this.earthHeight = height;
    }

    // Calculate the moon size
    if (!this.moonWidth || !this.moonHeight) {
      const { width, height } = moon.getBoundingClientRect();
      this.moonWidth = width;
      this.moonHeight = height;
    }

    if (typeof this.earthScaleFactorWhenDragging === 'undefined') {
      this.earthScaleFactorWhenDragging =
        parseFloat(
          getComputedStyle(earth).getPropertyValue(
            '--scale-factor-when-dragging'
          )
        ) || 0;
    }

    if (
      typeof this.targetAbsoluteOffsetYAbove === 'undefined' ||
      typeof this.targetAbsoluteOffsetYBelow === 'undefined'
    ) {
      const minimumMoonOffsetY =
        parseFloat(
          getComputedStyle(moon).getPropertyValue('--minimum-moon-offset-y')
        ) || 0;

      // Depending on whether the moon is above or below the earth, some extra
      // altitude needs to be added to the orbit so that the thumb doesn't cover it.
      const extraAltitudeToClearAboveThumb =
        parseFloat(
          getComputedStyle(moon).getPropertyValue(
            '--extra-altitude-to-clear-above-thumb'
          )
        ) || 0;
      const extraAltitudeToClearBelowThumb =
        parseFloat(
          getComputedStyle(moon).getPropertyValue(
            '--extra-altitude-to-clear-above-thumb'
          )
        ) || 0;

      // By adding this extra clearance, we avoid the iOS 15 Safari full-size URL
      // bar springing back into place when dragging the puck too far into the
      // bottom of the viewport. Hopefully this covers the worst-case scenario.
      // @see https://github.com/shirakaba/10ten-ja-reader/pull/5#issuecomment-877794905
      const extraAltitudeToClearIos15SafariSafeAreaActivationZone =
        parseFloat(
          getComputedStyle(moon).getPropertyValue(
            '--extra-altitude-to-clear-ios-15-safari-safe-area-activation-zone'
          )
        ) || 0;

      this.targetAbsoluteOffsetYAbove =
        minimumMoonOffsetY + extraAltitudeToClearAboveThumb;
      this.targetAbsoluteOffsetYBelow =
        minimumMoonOffsetY +
        extraAltitudeToClearBelowThumb +
        extraAltitudeToClearIos15SafariSafeAreaActivationZone;
    }

    // Place in the bottom-right of the safe area
    this.setPositionWithinSafeArea(
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER
    );

    // Add event listeners
    if (this.enabled) {
      this.puck.addEventListener('pointerdown', this.onPuckPointerDown);
    }
  }

  setTheme(theme: string) {
    if (!this.puck) {
      return;
    }

    for (const className of this.puck.classList.values()) {
      if (className.startsWith('theme-')) {
        this.puck.classList.remove(className);
      }
    }

    this.puck.classList.add(`theme-${theme}`);
  }

  unmount(): void {
    removePuck();
    this.disable();
    this.puck = undefined;
  }

  enable(): void {
    this.enabled = true;
    this.safeAreaProvider.delegate = this;
    if (this.puck) {
      this.puck.addEventListener('pointerdown', this.onPuckPointerDown);
    }
  }

  disable(): void {
    this.enabled = false;
    this.safeAreaProvider.delegate = null;
    if (this.puck) {
      this.stopDraggingPuck();
      this.puck.removeEventListener('pointerdown', this.onPuckPointerDown);
    }
  }
}

export function removePuck(): void {
  removeContentContainer(RikaiPuck.id);
}
