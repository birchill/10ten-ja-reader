/// <reference path="../common/css.d.ts" />
import puckStyles from '../../css/puck.css?inline';

import { PuckState } from '../common/puck-state';
import { SVG_NS } from '../utils/dom-utils';
import { MarginBox } from '../utils/geometry';
import { getThemeClass } from '../utils/themes';
import { isIOS } from '../utils/ua-utils';

import {
  getOrCreateEmptyContainer,
  removeContentContainer,
} from './content-container';
import { getIframeOrigin } from './iframes';
import { isPopupWindowHostElem } from './popup/popup-container';
import type { SafeAreaProvider } from './safe-area-provider';

interface ViewportDimensions {
  viewportWidth: number;
  viewportHeight: number;
}

export interface PuckRenderOptions {
  icon: 'default' | 'sky';
  theme: string;
}

export function isPuckPointerEvent(
  pointerEvent: PointerEvent
): pointerEvent is PuckPointerEvent {
  return !!(pointerEvent as PuckPointerEvent).fromPuck;
}

export interface PuckPointerEvent extends PointerEvent {
  fromPuck: true;
}

type ClickState =
  | { kind: 'idle' }
  | {
      kind: 'firstpointerdown';
      // This is the timeout we use to detect if it's a drag or not
      timeout: number;
    }
  | { kind: 'dragging' }
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

function clearClickTimeout(clickState: ClickState) {
  if (clickStateHasTimeout(clickState)) {
    clearTimeout(clickState.timeout);
  }
}

// - 'disabled': Does not listen for any events (so can't be moved
//   nor tapped).
// - 'inactive': Listens for events (so can be moved and tapped),
//   but does not look up words.
// - 'active': Listens for events (so can be moved and tapped), and
//   furthermore looks up words.
export type PuckEnabledState = 'disabled' | 'inactive' | 'active';

export type InitialPuckPosition = Omit<PuckState, 'active'>;

type RestoreContentParams = { root: Element; restore: () => void };

export const LookupPuckId = 'tenten-ja-puck';

const clickHysteresis = 300;

export class LookupPuck {
  private puck: HTMLDivElement | undefined;
  private enabledState: PuckEnabledState = 'disabled';

  private clickState: ClickState = { kind: 'idle' };

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

  // We need to detect if the browser has a buggy position:fixed behavior
  // (as is currently the case for Safari
  // https://bugs.webkit.org/show_bug.cgi?id=207089)
  // so we can adjust the way we position the puck.
  //
  // This probably should _also_ apply to the way we position the safe area
  // but we haven't looked into that case just yet.
  //
  // undefined means we haven't been able to detect whether or not the bug is
  // present yet.
  private hasBuggyPositionFixed: boolean | undefined;

  // We sometimes temporarily modify the content so we can look it up. In such
  // a case we register a `restore` function to return the content back
  // to its original state when we have finished with it.
  private contentToRestore: RestoreContentParams | undefined;

  private safeAreaProvider: SafeAreaProvider;

  // Callbacks
  private onLookupDisabled: () => void;
  private onPuckStateChanged: (puckState: PuckState) => void;

  constructor({
    initialPosition,
    safeAreaProvider,
    onLookupDisabled,
    onPuckStateChanged,
  }: {
    initialPosition?: InitialPuckPosition;
    safeAreaProvider: SafeAreaProvider;
    onLookupDisabled: () => void;
    onPuckStateChanged: (puckState: PuckState) => void;
  }) {
    if (initialPosition) {
      this.puckX = initialPosition.x;
      this.puckY = initialPosition.y;
      this.targetOrientation = initialPosition.orientation;
    } else {
      // Initially position the puck in the bottom-right corner of the screen
      this.puckX = Number.MAX_SAFE_INTEGER;
      this.puckY = Number.MAX_SAFE_INTEGER;
    }
    this.safeAreaProvider = safeAreaProvider;
    this.onLookupDisabled = onLookupDisabled;
    this.onPuckStateChanged = onPuckStateChanged;
  }

  private readonly onSafeAreaUpdated = () => {
    this.cachedViewportDimensions = null;
    this.setPositionWithinSafeArea(this.puckX, this.puckY);
  };

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
    const { viewportWidth } = this.getViewportDimensions(document);
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

  public getTargetOrientation(): 'above' | 'below' {
    return this.targetOrientation;
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
    //
    // Another curiousity, if you load a page initially zoomed-in using pinch
    // zoom (e.g. by refreshing it after zooming in), the innerHeight will
    // initially report the zoomed-in viewport height (i.e. the same value as
    // window.visualViewport.height). However, if you zoom all the way out and
    // back in again, it will give you the layout viewport. If you zoom
    // partially out and back in, you get something in between.
    this.cachedViewportDimensions = {
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight:
        document.defaultView?.innerHeight ??
        document.documentElement.clientHeight,
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
    } = this.safeAreaProvider.getSafeArea();

    const { viewportWidth, viewportHeight } =
      this.getViewportDimensions(document);

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
      clampedX -= 15;
      clampedY -= 15;
    }

    this.setPosition({ x: clampedX, y: clampedY, safeAreaLeft, safeAreaRight });
  }

  readonly onWindowPointerMove = (event: PointerEvent) => {
    if (isPuckPointerEvent(event)) {
      return;
    }

    if (
      !this.puck ||
      !this.earthWidth ||
      !this.earthHeight ||
      this.enabledState === 'disabled' ||
      // If we're not being pressed or dragged, ignore
      !(
        this.clickState.kind === 'dragging' ||
        this.clickState.kind === 'firstpointerdown' ||
        this.clickState.kind === 'secondpointerdown'
      )
    ) {
      return;
    }

    event.preventDefault();

    let { clientX, clientY } = event;

    // Factor in any viewport offset needed to make up for Safari iOS's buggy
    // implementation of position:fixed.
    let viewportOffsetLeft = 0;
    let viewportOffsetTop = 0;
    if (this.hasBuggyPositionFixed) {
      viewportOffsetLeft = window.visualViewport?.offsetLeft ?? 0;
      viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
    }
    clientX += viewportOffsetLeft;
    clientY += viewportOffsetTop;

    // Translate the midpoint of the earth to the position of the pointer event.
    // This updates the moon offset
    this.setPositionWithinSafeArea(
      clientX - this.earthWidth / 2,
      clientY - this.earthHeight / 2
    );

    if (this.enabledState !== 'active') {
      return;
    }

    // Before applying the transformations to the earth and the moon, they
    // both share the same midpoint.
    // Work out the midpoint of the moon post-transformations. This is where
    // we'll fire the mousemove event to trigger a lookup.
    //
    // We drop any zoom offsets here since both elementFromPoint and the mouse
    // event handlers we pass these coordinates to will expect an unadjusted
    // value.
    const targetX =
      this.puckX +
      this.earthWidth / 2 +
      this.targetOffset.x -
      viewportOffsetLeft;
    const targetY =
      this.puckY +
      this.earthHeight / 2 +
      this.targetOffset.y -
      viewportOffsetTop;

    // See what we are pointing at
    let target =
      document
        .elementsFromPoint(targetX, targetY)
        // Ignore any element in the 10ten popup itself; we don't want
        // the puck moon to hold the popup open like a mouse event does.
        .find((target) => !isPopupWindowHostElem(target)) || null;

    // Check if we need to adjust the content to look it up.
    //
    // But first check we aren't pointing at the same content as we adjusted
    // last time (or one of its descendents).
    if (!this.contentToRestore?.root.contains(target)) {
      // Restore any content we previously adjusted.
      this.restoreContent();

      // Look for hidden textboxes on mokuro reader pages
      const mokuroResult = LookupPuck.uncoverMokuroText(
        target,
        targetX,
        targetY
      );
      if (mokuroResult) {
        target = mokuroResult.newTarget;
        this.contentToRestore = mokuroResult.contentToRestore;
      }
    }

    // Make sure the target is an actual element since the mousemove handler
    // expects that.
    if (!target) {
      return;
    }

    // When the target is an iframe, simply firing a 'mousemove' event at it
    // does not have the desired effect of prompting a lookup at the target
    // location within the iframe.
    //
    // Instead, we send a 'puckMoved' message to the iframe. Our injected
    // content script ensures that the iframe has a listener in place to handle
    // this message. Upon receiving this message, the iframe will fire a
    // 'mousemove' event at the indicated location, ultimately resulting in a
    // lookup at the target point.
    //
    // Note that this is the one and only case where we use postMessage, the
    // reasons for which are described here:
    //
    //  https://github.com/birchill/10ten-ja-reader/issues/747#issuecomment-918774588
    //
    // For any other cross-frame messaging we should very very strongly prefer
    // passing messages via the background page.
    if (target.tagName === 'IFRAME') {
      const iframeElement = target as HTMLIFrameElement;
      const contentWindow = iframeElement.contentWindow;
      if (!contentWindow) {
        return;
      }

      // Adjust the target position by the offset of the iframe itself within
      // the viewport.
      const originPoint = getIframeOrigin(iframeElement);
      if (!originPoint) {
        return;
      }
      const { x, y } = originPoint;

      contentWindow.postMessage(
        {
          type: '10ten(ja):puckMoved',
          clientX: targetX - x,
          clientY: targetY - y,
        },
        '*'
      );
      return;
    }

    const pointerEvent = new PointerEvent('pointermove', {
      // Make sure the event bubbles up to the listener on the window
      bubbles: true,
      clientX: targetX,
      clientY: targetY,
      pointerType: 'mouse',
    });
    (pointerEvent as PuckPointerEvent).fromPuck = true;

    target.dispatchEvent(pointerEvent);
  };

  private restoreContent() {
    this.contentToRestore?.restore();
    this.contentToRestore = undefined;
  }

  // Look for textBox elements generated by mokuro reader
  // (https://github.com/kha-white/mokuro) since they have hidden paragraph
  // elements that are only shown on hover.
  private static uncoverMokuroText(
    target: Element | null,
    targetX: number,
    targetY: number
  ): { newTarget: Element; contentToRestore: RestoreContentParams } | null {
    // Check for a suitable suspect
    if (
      !(target instanceof HTMLElement) ||
      !target.classList.contains('textBox')
    ) {
      return null;
    }

    // Set the paragraphs to display: table to match the hover style's from
    // mokuro's stylesheet:
    //
    // https://github.com/kha-white/mokuro/blob/43c59a3c49100db522db088563297dc609afa031/mokuro/styles.css#L70-L72
    //
    // We also record the previous setting on the inline style attribute so we
    // can faithfully restore it when we're done.
    const paragraphs = target.querySelectorAll('p');
    const toRestore: Array<[HTMLParagraphElement, string | null]> = [];
    for (const p of paragraphs) {
      if (getComputedStyle(p).display === 'none') {
        toRestore.push([p, p.style.display || null]);
        p.style.display = 'table';
      }
    }

    // Check if we found any paragraphs to adjust
    if (!toRestore.length) {
      return null;
    }

    // Setup a function to restore the content
    const restore = () => {
      // If we selected part of the content we uncovered we need to clear
      // selection or else we'll be unable to select anything more.
      const selection = window.getSelection();
      if (target && toRestore.some(([p]) => selection?.containsNode(p, true))) {
        selection!.removeAllRanges();
      }

      // Restore the inline style display
      for (const [p, display] of toRestore) {
        if (display) {
          p.style.display = display;
        } else {
          p.style.removeProperty('display');
        }
      }
    };

    const newTarget = document.elementFromPoint(targetX, targetY);
    if (!newTarget) {
      restore();
      return null;
    }

    return { newTarget, contentToRestore: { root: target, restore } };
  }

  private readonly checkForBuggyPositionFixed = () => {
    // Check if we've already run this check
    if (typeof this.hasBuggyPositionFixed !== 'undefined') {
      return;
    }

    // Check we have the visual viewport API available.
    //
    // If not, it's hard to detect the browser bug (since we don't know if we're
    // scaled or not) and it's hard to work around it too without flushing style
    // on every pointer event so we just act as if there's no bug.
    //
    // (Normally this function won't be called in the first place if we don't
    // have the visual viewport API since we can't register for viewport resize
    // events, but we manually call this function initially after rendering so
    // we can still arrive here even without the API.)
    if (
      typeof window.visualViewport === 'undefined' ||
      window.visualViewport === null
    ) {
      this.hasBuggyPositionFixed = false;
      return;
    }

    // Check that there is a suitable viewport scale applied so that we could
    // potentially detect the bug
    if (
      Math.abs(window.visualViewport.scale - 1) < 0.01 ||
      (Math.abs(window.visualViewport.offsetLeft) <= 1 &&
        Math.abs(window.visualViewport.offsetTop) <= 1)
    ) {
      return;
    }

    // Check the puck is actually being rendered
    if (!this.puck) {
      return;
    }

    // Clear the transform on the puck and check if its resting position is
    // actually equal to the offset of the visual viewport.
    //
    // When that's the case we've got iOS's buggy position:fixed that makes the
    // element not actually fixed.
    //
    // https://bugs.webkit.org/show_bug.cgi?id=207089
    //
    // Furthermore, because the offsets match we know we can work around it
    // by factoring the viewport offset into our calculations.
    const previousTransform = this.puck.style.transform || 'none';
    this.puck.style.transform = 'none';
    const bbox = this.puck.getBoundingClientRect();
    this.hasBuggyPositionFixed =
      Math.abs(bbox.left + window.visualViewport.offsetLeft) < 1 &&
      Math.abs(bbox.top + window.visualViewport.offsetTop) < 1;
    this.puck.style.transform = previousTransform;

    // Don't listen for any more viewport resize events
    window.visualViewport.removeEventListener(
      'resize',
      this.checkForBuggyPositionFixed
    );
  };

  private readonly onPuckPointerDown = (event: PointerEvent) => {
    if (this.enabledState === 'disabled' || !this.puck) {
      return;
    }

    // Ignore right-clicks
    if (event.button) {
      return;
    }

    // NOTE: Some of the code in this function is duplicated in onPuckMouseDown
    // so please make sure to keep these two functions in sync.

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
        }, clickHysteresis),
      };
    } else if (this.clickState.kind === 'firstclick') {
      // Carry across the timeout from 'firstclick', as we still want to
      // transition back to 'idle' if no 'pointerdown' event came within
      // the hysteresis period of the preceding 'firstclick' state.
      this.clickState = { ...this.clickState, kind: 'secondpointerdown' };
    }

    event.preventDefault();
    event.stopPropagation();

    this.puck.classList.add('dragging');
    this.puck.setPointerCapture(event.pointerId);

    // We need to register in the capture phase because Bibi reader (which
    // apparently is based on Epub.js) registers a pointermove handler on the
    // window in the capture phase and calls `stopPropagation()` on the events
    // so if we don't register in the capture phase, we'll never see the events.
    window.addEventListener('pointermove', this.onWindowPointerMove, {
      capture: true,
    });
    window.addEventListener('pointerup', this.stopDraggingPuck);
    window.addEventListener('pointercancel', this.stopDraggingPuck);
  };

  // See notes where we register the following two functions (onPuckMouseDown
  // and onPuckMouseUp) for why they are needed. The summary is that they are
  // only here to work around iOS swallowing pointerevents during the _second_
  // tap of a double-tap gesture.
  //
  // As a result these event listeners are _only_ interested in when we are
  // detecting the second tap of a double-tap gesture.
  //
  // When the pointer events are _not_ swallowed, because we call preventDefault
  // on the pointerdown / pointerup events, these functions should never be
  // called.

  private readonly onPuckMouseDown = (event: MouseEvent) => {
    // This is only needed for iOS Safari and on Firefox for Android, calling
    // preventDefault on a pointerdown event will _not_ prevent it from
    // triggering subsequent mousedown/mouseup events (see
    // https://codepen.io/birtles/pen/rNPKNQJ) so we should _not_ run this code
    // on platforms other than iOS.
    if (!isIOS()) {
      return;
    }

    if (this.enabledState === 'disabled' || !this.puck) {
      return;
    }

    // Ignore right-clicks
    if (event.button) {
      return;
    }

    // We only care about detecting the start of a second tap
    if (this.clickState.kind !== 'firstclick') {
      return;
    }

    // Following are the important bits of onPuckPointerDown.
    //
    // Eventually we should find a way to share this code better with that
    // function.
    this.clickState = { ...this.clickState, kind: 'secondpointerdown' };

    event.preventDefault();

    // See note in onPointerDown for why we need to register in the capture
    // phase.
    window.addEventListener('pointermove', this.onWindowPointerMove, {
      capture: true,
    });
    window.addEventListener('pointerup', this.stopDraggingPuck);
    window.addEventListener('pointercancel', this.stopDraggingPuck);
  };

  private readonly onPuckMouseUp = (event: MouseEvent) => {
    // This is only needed for iOS Safari and on Firefox for Android, calling
    // preventDefault on a pointerdown event will _not_ prevent it from
    // triggering subsequent mousedown/mouseup events (see
    // https://codepen.io/birtles/pen/rNPKNQJ) so we should _not_ run this code
    // on platforms other than iOS.
    if (!isIOS()) {
      return;
    }

    if (this.enabledState === 'disabled' || !this.puck) {
      return;
    }

    // Ignore right-clicks
    if (event.button) {
      return;
    }

    // We only care about detecting the end of the second tap in a double-tap
    // gesture.
    if (this.clickState.kind !== 'secondpointerdown') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.stopDraggingPuck();
    this.onPuckDoubleClick();
  };

  private readonly onPuckSingleClick = () => {
    this.setEnabledState(
      this.enabledState === 'active' ? 'inactive' : 'active'
    );
    this.notifyPuckStateChanged();
  };

  private readonly onPuckDoubleClick = () => {
    this.targetOrientation =
      this.targetOrientation === 'above' ? 'below' : 'above';
    this.setPositionWithinSafeArea(this.puckX, this.puckY);
    this.notifyPuckStateChanged();
  };

  // May be called manually (without an event), or upon 'pointerup' or
  // 'pointercancel'.
  private readonly stopDraggingPuck = (event?: PointerEvent) => {
    // Ignore right-clicks
    if (event?.button) {
      return;
    }

    if (this.puck) {
      this.puck.classList.remove('dragging');
      this.setPositionWithinSafeArea(this.puckX, this.puckY);
      this.notifyPuckStateChanged();
    }

    window.removeEventListener('pointermove', this.onWindowPointerMove, {
      capture: true,
    });
    window.removeEventListener('pointerup', this.stopDraggingPuck);
    window.removeEventListener('pointercancel', this.stopDraggingPuck);

    if (!event || event.type === 'pointercancel') {
      clearClickTimeout(this.clickState);
      this.clickState = { kind: 'idle' };
      return;
    }

    // Prevent any double-taps turning into a zoom
    event.preventDefault();
    event.stopPropagation();

    if (this.clickState.kind === 'firstpointerdown') {
      // Prevent 'firstpointerdown' transitioning to 'dragging' state.
      clearClickTimeout(this.clickState);

      // Wait for the hysteresis period to expire before calling
      // this.onPuckSingleClick() (to rule out a double-click).
      this.clickState = {
        kind: 'firstclick',
        timeout: window.setTimeout(() => {
          if (this.clickState.kind === 'firstclick') {
            this.clickState = { kind: 'idle' };
            this.onPuckSingleClick();
          } else if (this.clickState.kind === 'secondpointerdown') {
            this.clickState = { kind: 'dragging' };
          }
        }, clickHysteresis),
      };
    } else if (this.clickState.kind === 'secondpointerdown') {
      clearClickTimeout(this.clickState);
      this.clickState = { kind: 'idle' };
      this.onPuckDoubleClick();
    } else if (this.clickState.kind === 'dragging') {
      this.clickState = { kind: 'idle' };
    }
  };

  private readonly noOpEventHandler = () => {};

  render({ icon, theme }: PuckRenderOptions): void {
    // Set up shadow tree
    const container = getOrCreateEmptyContainer({
      id: LookupPuckId,
      styles: puckStyles.toString(),
    });

    // Create puck elem
    this.puck = document.createElement('div');
    this.puck.classList.add('puck');

    const earth = document.createElement('div');
    earth.classList.add('earth');
    this.puck.append(earth);

    // Brand the earth
    const logoSvg = this.renderIcon(icon);
    logoSvg.classList.add('logo');
    earth.append(logoSvg);

    const moon = document.createElement('div');
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
      // altitude needs to be added to the orbit so that the thumb doesn't cover
      // it.
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

    this.setPositionWithinSafeArea(this.puckX, this.puckY);

    // Add event listeners
    //
    // Note: This currently never happens. We always render before enabling.
    if (this.enabledState !== 'disabled') {
      this.puck.addEventListener('pointerdown', this.onPuckPointerDown);
      this.puck.addEventListener('mousedown', this.onPuckMouseDown);
      this.puck.addEventListener('mouseup', this.onPuckMouseUp);
    }

    // Start trying to detect a buggy position:fixed implementation.
    window.visualViewport?.addEventListener(
      'resize',
      this.checkForBuggyPositionFixed
    );
    // If the viewport has already been scaled, we might be able to detect it
    // right away (and avoid mis-positioning the puck before the viewport is
    // next resized).
    this.checkForBuggyPositionFixed();
  }

  private renderIcon(icon: 'default' | 'sky'): SVGSVGElement {
    return icon === 'default' ? this.renderDefaultIcon() : this.renderSkyIcon();
  }

  private renderDefaultIcon(): SVGSVGElement {
    const icon = document.createElementNS(SVG_NS, 'svg');
    icon.setAttribute('viewBox', '0 0 20 20');

    const dot1 = document.createElementNS(SVG_NS, 'circle');
    dot1.setAttribute('cx', '11.5');
    dot1.setAttribute('cy', '10');
    dot1.setAttribute('r', '1.5');
    icon.append(dot1);

    const dot2 = document.createElementNS(SVG_NS, 'circle');
    dot2.setAttribute('cx', '18.5');
    dot2.setAttribute('cy', '15.5');
    dot2.setAttribute('r', '1.5');
    icon.append(dot2);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M4.9 7.1c-.1-.5-.2-.9-.5-1.3-.2-.4-.5-.8-.8-1.1-.2-.3-.5-.5-.8-.7C2 3.3 1 3 0 3v3c1.2 0 1.9.7 2 1.9v9.2h3V8.2c0-.4 0-.8-.1-1.1zM11.5 3c-2.8 0-5 2.3-5 5.1v3.7c0 2.8 2.2 5.1 5 5.1s5-2.3 5-5.1V8.1c0-2.8-2.2-5.1-5-5.1zm2.3 5.1v3.7c0 .3-.1.6-.2.9-.4.8-1.2 1.4-2.1 1.4s-1.7-.6-2.1-1.4c-.1-.3-.2-.6-.2-.9V8.1c0-.3.1-.6.2-.9.4-.8 1.2-1.4 2.1-1.4s1.7.6 2.1 1.4c.1.3.2.6.2.9z'
    );
    icon.append(path);

    return icon;
  }

  private renderSkyIcon(): SVGSVGElement {
    const icon = document.createElementNS(SVG_NS, 'svg');
    icon.setAttribute('viewBox', '0 0 20 20');

    const dot1 = document.createElementNS(SVG_NS, 'circle');
    dot1.setAttribute('cx', '18.5');
    dot1.setAttribute('cy', '15.5');
    dot1.setAttribute('r', '1.5');
    icon.append(dot1);

    const dot2 = document.createElementNS(SVG_NS, 'circle');
    dot2.setAttribute('cx', '1.5');
    dot2.setAttribute('cy', '4.5');
    dot2.setAttribute('r', '1.5');
    icon.append(dot2);

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      'M3.4 3.5c.1.3.2.6.2 1s-.1.7-.2 1h4.1V8H3c-.5 0-1 .5-1 1s.5 1 1 1h4.3c-.3.9-.7 1.6-1.5 2.4-1 1-2.3 1.8-3.8 2.3-.6.2-.9.9-.7 1.5.3.5.9.8 1.4.6 2.9-1.1 5-2.9 6-5.2 1 2.3 3.1 4.1 6 5.2.5.2 1.2-.1 1.4-.6.3-.6 0-1.3-.7-1.5a9.7 9.7 0 0 1-3.8-2.3c-.8-.8-1.2-1.5-1.5-2.4h4.4c.5 0 1-.5 1-1s-.4-1-1-1H10V5.5h5.4c.5 0 1-.5 1-1s-.4-1-1-1h-12z'
    );
    icon.append(path);

    return icon;
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

  setIcon(icon: 'default' | 'sky') {
    if (!this.puck) {
      return;
    }

    const logo = this.puck.querySelector('.logo');
    const logoParent = logo?.parentElement;
    if (!logo || !logoParent) {
      return;
    }

    const classes = logo.getAttribute('class') || '';

    logo.remove();
    const newLogo = this.renderIcon(icon);
    newLogo.setAttribute('class', classes);
    logoParent.append(newLogo);
  }

  unmount(): void {
    this.restoreContent();
    removePuck();
    window.visualViewport?.removeEventListener(
      'resize',
      this.checkForBuggyPositionFixed
    );
    this.setEnabledState('disabled');
    this.puck = undefined;
  }

  getEnabledState(): PuckEnabledState {
    return this.enabledState;
  }

  setEnabledState(enabledState: PuckEnabledState): void {
    const previousState = this.enabledState;
    this.enabledState = enabledState;

    if (enabledState === 'disabled') {
      this.safeAreaProvider.removeEventListener(this.onSafeAreaUpdated);
      if (this.puck) {
        this.stopDraggingPuck();
        this.puck.removeEventListener('pointerdown', this.onPuckPointerDown);
        this.puck.removeEventListener('mousedown', this.onPuckMouseDown);
        this.puck.removeEventListener('mouseup', this.onPuckMouseUp);
      }
      window.removeEventListener('pointerup', this.noOpEventHandler);
      clearClickTimeout(this.clickState);
      this.clickState = { kind: 'idle' };

      // Reset puck position
      this.puckX = Number.MAX_SAFE_INTEGER;
      this.puckY = Number.MAX_SAFE_INTEGER;
      this.targetOrientation = 'above';

      return;
    }

    // Avoid redoing any of this setup (that's common between both 'active'
    // and 'inactive').
    if (previousState === 'disabled') {
      this.safeAreaProvider.addEventListener(this.onSafeAreaUpdated);
      if (this.puck) {
        this.puck.addEventListener('pointerdown', this.onPuckPointerDown);

        // The following event handlers are needed to cover the case where iOS
        // Safari sometimes seems to eat the second tap in a double-tap gesture.
        //
        // We've tried everything to avoid this (touch-action: none,
        // -webkit-user-select: none, etc. etc.) but it just sometimes does it.
        //
        // Furthermore, when debugging, after about ~1hr or so it will sometimes
        // _stop_ eating these events, leading you to believe you've fixed it
        // only for it to start eating them again a few minutes later.
        //
        // However, in this case it still dispatches _mouse_ events so we listen
        // to them and trigger the necessary state transitions when needed.
        //
        // Note that the mere _presence_ of the mousedown handler is also needed
        // to prevent double-tap being interpreted as a zoom.
        this.puck.addEventListener('mousedown', this.onPuckMouseDown);
        this.puck.addEventListener('mouseup', this.onPuckMouseUp);
      }
      // Needed to stop iOS Safari from stealing pointer events after we finish
      // scrolling.
      window.addEventListener('pointerup', this.noOpEventHandler);
    }

    if (this.puck) {
      this.puck.classList.toggle(
        'lookup-inactive',
        this.enabledState === 'inactive'
      );
    }

    if (this.enabledState === 'inactive') {
      // Calling this callback allows the owner (ContentHandler) to clear any
      // existing popups.
      this.onLookupDisabled();
      return;
    }
  }

  setState(state: PuckState): void {
    if (this.enabledState === 'disabled') {
      return;
    }

    this.targetOrientation = state.orientation;
    this.setPositionWithinSafeArea(state.x, state.y);

    const updatedEnabledState = state.active ? 'active' : 'inactive';
    if (this.enabledState !== updatedEnabledState) {
      this.setEnabledState(updatedEnabledState);
    }
  }

  notifyPuckStateChanged(): void {
    if (this.enabledState === 'disabled') {
      return;
    }

    this.onPuckStateChanged({
      x: this.puckX,
      y: this.puckY,
      orientation: this.targetOrientation,
      active: this.enabledState === 'active',
    });
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
  removeContentContainer(LookupPuckId);
}
