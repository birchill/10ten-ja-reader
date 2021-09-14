import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from './content-container';
import type { ContentMessage } from './content-messages';
import { MarginBox } from './geometry';
import { getIframeOriginFromWindow } from './iframe-tracker';
import type { SafeAreaProvider } from './safe-area-provider';
import { getThemeClass } from './themes';

import puckStyles from '../css/puck.css';
import { SVG_NS } from './svg';
import { isIOS } from './ua-utils';

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

type ClickState =
  | {
      kind: 'idle';
    }
  | {
      kind: 'firstpointerdown';
      // This is the timeout we use to detect if it's a drag or not
      timeout: number;
    }
  | {
      kind: 'dragging';
    }
  | {
      kind: 'firstclick';
      // This is the timeout we use to detect if it's a double-click or not
      timeout: number;
    }
  | {
      kind: 'secondpointerdown';
      // This is the same timeout as we start when we enter the firstclick state
      timeout: number;
    };

interface ClickStateBase<T extends string> {
  kind: T;
}
interface ClickStateWithTimeout<T extends string> extends ClickStateBase<T> {
  timeout: number;
}

function clickStateHasTimeout<T extends ClickState['kind']>(
  clickState: ClickStateBase<T>
): clickState is ClickStateWithTimeout<T> {
  return typeof (clickState as ClickStateWithTimeout<T>).timeout === 'number';
}

export class LookupPuck {
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
  // The translateY value to apply to the moon when it is orbiting above the
  // earth. Expressed as an absolute (positive) value.
  private targetAbsoluteOffsetYAbove: number;
  // The translateY value to apply to the moon when it is orbiting below the
  // earth. Expressed as an absolute (positive) value.
  private targetAbsoluteOffsetYBelow: number;
  // The translate (X and Y) values applied to the moon whilst it is being
  // dragged. They are measured relative to the midpoint of the moon (which is
  // also the midpoint of the earth).
  private targetOffset: { x: number; y: number } = { x: 0, y: 0 };
  private targetOrientation: 'above' | 'below' = 'above';
  private cachedViewportDimensions: ViewportDimensions | null = null;

  constructor(private safeAreaProvider: SafeAreaProvider) {}

  // @see SafeAreaConsumerDelegate
  onSafeAreaUpdated(): void {
    this.cachedViewportDimensions = null;
    this.setPositionWithinSafeArea(this.puckX, this.puckY);
  }

  private setPosition({
    x,
    y,
    safeAreaLeft,
    safeAreaRight,
  }: {
    x: number;
    y: number;
    safeAreaLeft: number;
    safeAreaRight: number;
  }) {
    this.puckX = x;
    this.puckY = y;

    // Update the puck position (that is, the earth)
    if (this.puck) {
      this.puck.style.transform = `translate(${this.puckX}px, ${this.puckY}px)`;
    }

    // Calculate the corresponding target point (that is, the moon)

    // First determine the actual range of motion of the moon, taking into
    // account any safe area on either side of the screen.
    const { viewportWidth } = this.getViewportDimensions(
      this.puck?.ownerDocument || document
    );
    const safeAreaWidth = viewportWidth - safeAreaLeft - safeAreaRight;

    // Now work out where the moon is within that range such that it is
    //
    // * 0 when the the left side of the earth is touching the left safe area
    //   inset, and
    // * 1 when the right side of the earth is touching the right safe area
    //   inset.
    const clamp = (num: number, min: number, max: number) =>
      Math.min(Math.max(num, min), max);
    const horizontalPortion = clamp(
      (this.puckX - safeAreaLeft) / (safeAreaWidth - this.earthWidth),
      0,
      1
    );

    // Then we calculate the horizontal offset. We need to ensure that we
    // produce enough displacement that we can reach to the other edge of the
    // safe area in either direction.

    // The range is the amount the moon rotates either side of the moon, in this
    // case 45 degrees in either direction.
    const range = Math.PI / 2;

    // We need to determine the radius of the offset.
    //
    // Typically we set this to 10 pixels greater than the radius of the earth
    // itself.
    const radiusOfEarth = this.earthWidth / 2;
    const preferredRadius = radiusOfEarth + 10;

    // However, we may need to extend that to reach the other side of the safe
    // area.
    const safeAreaExtent = Math.max(safeAreaLeft, safeAreaRight);
    const requiredReach = safeAreaExtent + radiusOfEarth;
    const requiredRadius = requiredReach / Math.sin(range / 2);

    // Choose whichever is larger
    const offsetRadius = Math.max(preferredRadius, requiredRadius);

    // Now finally we can calculate the horizontal offset.
    const angle = horizontalPortion * range - range / 2;
    const offsetX = Math.sin(angle) * offsetRadius;

    // For the vertical offset, we don't actually extend the moon out by the
    // same radius but instead try to keep a fixed vertical offset since that
    // makes scanning horizontally easier and allows us to tweak that offset to
    // make room for the user's thumb.
    const offsetYOrientationFactor =
      this.targetOrientation === 'above' ? -1 : 1;
    const offsetY =
      (this.targetOrientation === 'above'
        ? this.targetAbsoluteOffsetYAbove
        : this.targetAbsoluteOffsetYBelow) * offsetYOrientationFactor;

    // At rest, make the target land on the surface of the puck.
    const restOffsetX = Math.sin(angle) * radiusOfEarth;
    const restOffsetY =
      Math.cos(angle) * radiusOfEarth * offsetYOrientationFactor;

    this.targetOffset = { x: offsetX, y: offsetY };

    // Update target position in style
    if (this.puck) {
      this.puck.style.setProperty('--target-x-offset', `${offsetX}px`);
      this.puck.style.setProperty('--target-y-offset', `${offsetY}px`);
      this.puck.style.setProperty('--rest-x-offset', `${restOffsetX}px`);
      this.puck.style.setProperty('--rest-y-offset', `${restOffsetY}px`);
    }
  }

  // Returns the total clearance to allow arround the target offset for the
  // puck.
  public getPuckClearance(): MarginBox {
    const moonVerticalClearance = this.moonHeight / 2;
    const earthVerticalClearance =
      Math.abs(this.targetOffset.y) +
      (this.earthScaleFactorWhenDragging * this.earthHeight) / 2;

    return {
      top:
        this.targetOrientation === 'above'
          ? moonVerticalClearance
          : earthVerticalClearance,
      bottom:
        this.targetOrientation === 'above'
          ? earthVerticalClearance
          : moonVerticalClearance,
      left:
        (this.earthScaleFactorWhenDragging * this.earthWidth) / 2 +
        this.targetOffset.x,
      right:
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

    let clampedX = Math.min(Math.max(minX, x), maxX);
    let clampedY = Math.min(Math.max(minY, y), maxY);

    // When we initialize the puck, we put it in the bottom-right corner, but on
    // iOS 15 Safari, if it's flush up against the right edge of the screen then
    // when you try to drag it away, you end up dragging in the next tab.
    //
    // To avoid that we detect the initial position coordinates and add a few
    // pixels margin.
    if (x === Number.MAX_SAFE_INTEGER && y === Number.MAX_SAFE_INTEGER) {
      clampedX -= 8;
      clampedY -= 8;
    }

    this.setPosition({
      x: clampedX,
      y: clampedY,
      safeAreaLeft,
      safeAreaRight,
    });
  }

  readonly onWindowPointerMove = (event: PointerEvent) => {
    if (
      !this.puck ||
      !this.earthWidth ||
      !this.earthHeight ||
      !this.enabled ||
      // i.e. if it's neither being pressed nor dragged
      !(
        this.clickState.kind === 'dragging' ||
        this.clickState.kind === 'firstpointerdown' ||
        this.clickState.kind === 'secondpointerdown'
      )
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

  private clickState: ClickState = { kind: 'idle' };
  private static readonly clickHysteresis = 300;

  private readonly onPuckPointerDown = (event: PointerEvent) => {
    if (!this.enabled || !this.puck) {
      return;
    }

    if (this.clickState.kind === 'idle') {
      // If no transition to 'pointerup' occurs during the click hysteresis
      // period, then we transition to 'dragging'. This avoids onPuckClick()
      // being fired every time the puck gets parked.
      this.clickState = {
        kind: 'firstpointerdown',
        timeout: window.setTimeout(() => {
          if (this.clickState.kind === 'firstpointerdown') {
            this.clickState = { kind: 'dragging' };
          }
        }, LookupPuck.clickHysteresis),
      };
    } else if (this.clickState.kind === 'firstclick') {
      // Carry across the timeout from 'firstclick', as we still want to
      // transition back to 'idle' if no 'pointerdown' event came within
      // the hysteresis period of the preceding 'firstclick' state.
      this.clickState = {
        ...this.clickState,
        kind: 'secondpointerdown',
      };
    }

    event.preventDefault();
    event.stopPropagation();

    this.puck.style.pointerEvents = 'none';
    this.puck.classList.add('dragging');
    this.puck.setPointerCapture(event.pointerId);

    window.addEventListener('pointermove', this.onWindowPointerMove);
    window.addEventListener('pointerup', this.stopDraggingPuck);
    window.addEventListener('pointercancel', this.stopDraggingPuck);
  };

  private readonly onPuckSingleClick = () => {
    // TODO: toggle whether the puck is enabled or disabled.
  };

  private readonly onPuckDoubleClick = () => {
    this.targetOrientation =
      this.targetOrientation === 'above' ? 'below' : 'above';
    this.setPositionWithinSafeArea(this.puckX, this.puckY);
  };

  // May be called manually (without an event), or upon 'pointerup' or 'pointercancel'.
  private readonly stopDraggingPuck = (event?: PointerEvent) => {
    if (this.puck) {
      this.puck.style.pointerEvents = 'revert';
      this.puck.classList.remove('dragging');
      this.setPositionWithinSafeArea(this.puckX, this.puckY);
    }

    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.stopDraggingPuck);
    window.removeEventListener('pointercancel', this.stopDraggingPuck);

    if (!event) {
      if (clickStateHasTimeout(this.clickState)) {
        window.clearTimeout(this.clickState.timeout);
        this.clickState = { kind: 'idle' };
      }
      return;
    }

    if (event.type === 'pointercancel') {
      // Stop tracking this click and wait for the next 'pointerdown' to come along instead.
      if (clickStateHasTimeout(this.clickState)) {
        window.clearTimeout(this.clickState.timeout);
      }
      this.clickState = { kind: 'idle' };
    } else if (event.type === 'pointerup') {
      // Prevent any double-taps turning into a zoom
      event.preventDefault();
      event.stopPropagation();

      if (this.clickState.kind === 'firstpointerdown') {
        // Prevent 'firstpointerdown' transitioning to 'dragging' state.
        window.clearTimeout(this.clickState.timeout);

        // Wait for the hysteresis period to expire before calling
        // this.onPuckSingleClick() (to rule out a double-click).
        this.clickState = {
          kind: 'firstclick',
          timeout: window.setTimeout(() => {
            this.clickState = { kind: 'idle' };
            this.onPuckSingleClick();
          }, LookupPuck.clickHysteresis),
        };
      } else if (this.clickState.kind === 'secondpointerdown') {
        window.clearTimeout(this.clickState.timeout);

        this.clickState = { kind: 'idle' };
        this.onPuckDoubleClick();
      } else if (this.clickState.kind === 'dragging') {
        this.clickState = { kind: 'idle' };
      }
    }
  };

  private readonly noOpPointerUpHandler = () => {};

  render({ doc, theme }: PuckRenderOptions): void {
    // Set up shadow tree
    const container = getOrCreateEmptyContainer({
      doc,
      id: LookupPuck.id,
      styles: puckStyles.toString(),
    });

    // Create puck elem
    this.puck = doc.createElement('div');
    this.puck.classList.add('puck');

    const earth = doc.createElement('div');
    earth.classList.add('earth');
    this.puck.append(earth);

    // Brand the earth
    const logoSvg = doc.createElementNS(SVG_NS, 'svg');
    logoSvg.setAttribute('viewBox', '0 0 20 20');
    logoSvg.classList.add('logo');
    const dot1 = doc.createElementNS(SVG_NS, 'circle');
    dot1.setAttribute('cx', '11.5');
    dot1.setAttribute('cy', '10');
    dot1.setAttribute('r', '1.5');
    logoSvg.append(dot1);
    const dot2 = doc.createElementNS(SVG_NS, 'circle');
    dot2.setAttribute('cx', '18.5');
    dot2.setAttribute('cy', '15.5');
    dot2.setAttribute('r', '1.5');
    logoSvg.append(dot2);
    const path = doc.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M4.9 7.1c-.1-.5-.2-.9-.5-1.3-.2-.4-.5-.8-.8-1.1-.2-.3-.5-.5-.8-.7C2 3.3 1 3 0 3v3c1.2 0 1.9.7 2 1.9v9.2h3V8.2c0-.4 0-.8-.1-1.1zM11.5 3c-2.8 0-5 2.3-5 5.1v3.7c0 2.8 2.2 5.1 5 5.1s5-2.3 5-5.1V8.1c0-2.8-2.2-5.1-5-5.1zm2.3 5.1v3.7c0 .3-.1.6-.2.9-.4.8-1.2 1.4-2.1 1.4s-1.7-.6-2.1-1.4c-.1-.3-.2-.6-.2-.9V8.1c0-.3.1-.6.2-.9.4-.8 1.2-1.4 2.1-1.4s1.7.6 2.1 1.4c.1.3.2.6.2.9z'
    );
    logoSvg.append(path);
    earth.append(logoSvg);

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

      // By adding this extra clearance, we avoid the iOS 15 Safari full-size
      // URL bar springing back into place when dragging the puck too far into
      // the bottom of the viewport. Hopefully this covers the worst-case
      // scenario.
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

    this.puck.classList.add(getThemeClass(theme));
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
    // Needed to stop iOS Safari from stealing pointer events after we finish
    // scrolling.
    window.addEventListener('pointerup', this.noOpPointerUpHandler);
  }

  disable(): void {
    this.enabled = false;
    this.safeAreaProvider.delegate = null;
    if (this.puck) {
      this.stopDraggingPuck();
      this.puck.removeEventListener('pointerdown', this.onPuckPointerDown);
    }
    window.removeEventListener('pointerup', this.noOpPointerUpHandler);
    this.clickState = { kind: 'idle' };
  }

  highlightMatch(): void {
    // On iOS the selection API is very unreliable so we don't have a good way
    // of indicating to the user what they looked up, unless they enable the
    // (experimental) CSS Highlight API.
    //
    // So, in that case, whenever our lookup gets a match we make the moon
    // stick to its extended position.
    if (!isIOS() || CSS?.highlights) {
      return;
    }

    this.puck?.classList.add('hold-position');
  }

  clearHighlight(): void {
    this.puck?.classList.remove('hold-position');
  }
}

export function removePuck(): void {
  removeContentContainer(LookupPuck.id);
}
