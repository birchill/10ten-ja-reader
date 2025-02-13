/// <reference path="../common/constants.d.ts" />
/*

  10ten Japanese Reader
  by Brian Birtles
  https://github.com/birchill/10ten-ja-reader

  ---

  Originally based on Rikaikun
  by Erek Speed
  http://code.google.com/p/rikaikun/

  ---

  Originally based on Rikaichan 1.07
  by Jonathan Zarate
  http://www.polarcloud.com/

  ---

  Originally based on RikaiXUL 0.4 by Todd Rudick
  http://www.rikai.com/
  http://rikaixul.mozdev.org/

  ---

  This program is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation; either version 2 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

  ---

  Please do not change or remove any of the copyrights or links to web pages
  when modifying any of the files. - Jon

*/
import type { MajorDataSeries } from '@birchill/jpdict-idb';
import * as s from 'superstruct';
import browser, { Runtime } from 'webextension-polyfill';

import { BackgroundMessageSchema } from '../background/background-message';
import {
  AutoExpandableEntry,
  ContentConfigParams,
} from '../common/content-config-params';
import { CopyKeys, CopyType } from '../common/copy-keys';
import { isEditableNode, isInteractiveElement } from '../utils/dom-utils';
import {
  MarginBox,
  Point,
  Rect,
  addMarginToPoint,
  getMarginAroundPoint,
  union,
} from '../utils/geometry';
import { mod } from '../utils/mod';
import { stripFields } from '../utils/strip-fields';
import { WithRequired } from '../utils/type-helpers';
import { isSafari } from '../utils/ua-utils';

import { copyText } from './clipboard';
import { ContentConfig, ContentConfigChange } from './content-config';
import { CopyEntry, getTextToCopy } from './copy-text';
import { injectGdocsStyles, removeGdocsStyles } from './gdocs-canvas';
import { getCopyEntryFromResult } from './get-copy-entry';
import { getTextAtPoint } from './get-text';
import {
  IframeSearchParams,
  IframeSourceParams,
  findIframeElement,
  getIframeOrigin,
  getWindowDimensions,
} from './iframes';
import { hasModifiers, normalizeKey, normalizeKeys } from './keyboard';
import { SelectionMeta } from './meta';
import { DisplayMode, PopupState, clearPopupTimeout } from './popup-state';
import { type CopyState, getCopyMode } from './popup/copy-state';
import {
  hidePopup,
  isPopupVisible,
  removePopup,
  setFontFace,
  setFontSize,
  setPopupStyle,
} from './popup/popup';
import { isPopupWindowHostElem } from './popup/popup-container';
import {
  type PopupPositionConstraints,
  PopupPositionMode,
} from './popup/popup-position';
import { type ShowPopupOptions, showPopup } from './popup/show-popup';
import { showWordsTab } from './popup/tabs';
import {
  LookupPuck,
  PuckPointerEvent,
  isPuckPointerEvent,
  removePuck,
} from './puck';
import { QueryResult, query } from './query';
import { SafeAreaProvider, removeSafeAreaProvider } from './safe-area-provider';
import { getScrollOffset, toPageCoords, toScreenCoords } from './scroll-offset';
import {
  type SelectionSizes,
  type TargetProps,
  getBestFitSize,
  getPageTargetProps,
  selectionSizesToScreenCoords,
  textBoxSizeLengths,
} from './target-props';
import { TextHighlighter } from './text-highlighter';
import { TextRange, textRangesEqual } from './text-range';
import { hasReasonableTimerResolution } from './timer-precision';
import { TouchClickTracker } from './touch-click-tracker';

const enum HoldToShowKeyType {
  None = 0,
  Text = 1 << 0,
  Images = 1 << 1,
  All = Text | Images,
}

export class ContentHandler {
  // The content script is injected into every frame in a page but we delegate
  // some responsibilities to the top-most window since that allows us to,
  // for example, show the popup without it being clipped by its iframe
  // boundary. Furthermore, we want to handle key events regardless of which
  // iframe is currently in focus.
  //
  // As a result, we can divide the state and methods in this class into:
  //
  // 1. Things done by the window / iframe where the text lives,
  //    e.g. processing mouse events, extracting text, highlighting text, etc.
  //
  // 2. Things only the topmost window does,
  //    e.g. querying the dictionary, showing the popup, etc.
  //
  // There are a few exceptions like copyMode which is mirrored in both and
  // popup visibility tracking which only iframes need to care about but
  // roughly these categories hold.
  //
  // One day we might actually separating these out into separate classes but
  // for now we just document which is which here.

  //
  // Common concerns
  //
  private config: ContentConfig;
  private frameId: number | undefined;

  //
  // Text handling window concerns
  //
  private textHighlighter: TextHighlighter;

  private currentTextRange: TextRange | undefined;
  // The current point is used both by the text handling window to detect
  // redundant mouse moves and by the topmost window to know where to position
  // the popup.
  private currentPagePoint: Point | undefined;

  // We keep track of the last element that was the target of a mouse move so
  // that we can popup the window later using its properties.
  private lastMouseTarget: Element | null = null;
  private lastMouseMoveScreenPoint = { x: -1, y: -1 };

  // Safari-only redundant pointermove/mousemove event handling
  //
  // See notes in `onPointerMove` for why we need to do this.
  private ignoreNextPointerMove = false;

  // Track the state of the popup
  //
  // This is used by top-most windows and child iframes alike to detect if
  // a mouse movement is "between" `currentPoint` and the popup so we can avoid
  // hiding the popup in that case (provided the popup is configured to be
  // interactive).
  //
  // Note, however, that the position of the popup (i.e. the `pos` member) is
  // only ever stored on the top-most window and on the child iframe which
  // contains the content that the popup is positioned relative to (if any).
  //
  // This is also used to determine how to handle keyboard keys since. For
  // example, we should ignore keyboard events (and certainly _not_ call
  // preventDefault on them) if the popup is not showing.
  private popupState: PopupState | undefined;

  // Mouse tracking
  //
  // We don't show the popup when the mouse is moving at speed because it's
  // mostly distracting and introduces unnecessary work.
  private static MOUSE_SPEED_SAMPLES = 2;
  private static MOUSE_SPEED_THRESHOLD = 0.5;

  private mouseSpeedRollingSum = 0;
  private mouseSpeeds: Array<number> = [];
  private previousMousePosition: Point | undefined;
  private previousMouseMoveTime: number | undefined;
  // We disable this feature by default and only turn it on once we've
  // established that we have a sufficiently precise timer. If
  // privacy.resistFingerprinting is enabled then the timer won't be precise
  // enough for us to test the speed of the mouse.
  private hidePopupWhenMovingAtSpeed = false;

  // Keyboard support
  private kanjiLookupMode = false;
  private pinToggleState: 'idle' | 'keydown' | 'ignore' = 'idle';

  // Used to try to detect when we are typing so we know when to ignore key
  // events.
  private typingMode = false;

  // Detect touch taps so we can show the popup for them, but not for
  // regular mouse clicks.
  private touchClickTracker: TouchClickTracker = new TouchClickTracker();

  //
  // Top-most window concerns
  //

  // This should be enough for most (but not all) entries for now.
  //
  // See https://github.com/birchill/10ten-ja-reader/issues/319#issuecomment-655545971
  // for a snapshot of the entry lengths by frequency.
  //
  // Once we have switched all databases to IndexedDB, we should investigate the
  // performance impact of increasing this further.
  private static MAX_LENGTH = 16;

  private isEffectiveTopMostWindow = false;

  private currentLookupParams:
    | {
        text: string;
        wordLookup: boolean;
        meta?: SelectionMeta;
        source: IframeSourceParams | null;
      }
    | undefined;
  private currentSearchResult: QueryResult | undefined;
  private currentTargetProps: TargetProps | undefined;
  private currentDict: MajorDataSeries = 'words';

  // Copy support
  //
  // (copyMode is actually used by the text-handling window too to know which
  // keyboard events to handle and how to interpret them.)
  private copyState: CopyState = { kind: 'inactive' };

  // Manual positioning support
  private popupPositionMode: PopupPositionMode = PopupPositionMode.Auto;

  // Content collapsing
  private isPopupExpanded = false;

  // Consulted in order to determine safe area
  private safeAreaProvider: SafeAreaProvider = new SafeAreaProvider();

  // Consulted in order to determine popup positioning
  private puck: LookupPuck | null = null;

  constructor(config: ContentConfigParams) {
    this.config = new ContentConfig(config);
    this.textHighlighter = new TextHighlighter();

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onFocusIn = this.onFocusIn.bind(this);
    this.onFullScreenChange = this.onFullScreenChange.bind(this);
    this.onInterFrameMessage = this.onInterFrameMessage.bind(this);
    this.onBackgroundMessage = this.onBackgroundMessage.bind(this);

    this.onConfigChange = this.onConfigChange.bind(this);
    this.config.addListener(this.onConfigChange);

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('keydown', this.onKeyDown, { capture: true });
    window.addEventListener('keyup', this.onKeyUp, { capture: true });
    window.addEventListener('focusin', this.onFocusIn);
    window.addEventListener('fullscreenchange', this.onFullScreenChange);
    window.addEventListener('message', this.onInterFrameMessage, {
      capture: true,
    });
    browser.runtime.onMessage.addListener(this.onBackgroundMessage);

    this.touchClickTracker.onTouchClick = (event: MouseEvent) => {
      // Ignore clicks on interactive elements
      if (event.target instanceof Node && isInteractiveElement(event.target)) {
        return;
      }

      // If the puck is showing but inactive, use that as a signal that the user
      // doesn't want to do lookups at the moment.
      if (this.puck?.getEnabledState() === 'inactive') {
        return;
      }

      // We need to ensure the 'buttons' field of the event is zero since
      // normally we ignore mousemoves when the buttons are being pressed, but
      // we've decided to allow this "click".
      //
      // This is, unfortunately, a little involved since:
      //
      // (a) the 'buttons' member of `event` is readonly,
      // (b) the object spread operator only deals with enumerable _own_
      //     properties so we can't just spread the values from `event` into a
      //     new object, and
      // (c) we use `getModifierState` etc. on `PointerEvent` elsewhere so we
      //     actually need to generate a `PointerEvent` object rather than just
      //     a property bag.
      const pointerMoveEvent = new PointerEvent('pointermove', {
        altKey: event.altKey,
        bubbles: true,
        button: 0,
        buttons: 0,
        clientX: event.clientX,
        clientY: event.clientY,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        pointerType: 'mouse',
        relatedTarget: event.relatedTarget,
        screenX: event.screenX,
        screenY: event.screenY,
        shiftKey: event.shiftKey,
      });
      (pointerMoveEvent as TouchClickEvent).fromTouch = true;

      (event.target || document.body).dispatchEvent(pointerMoveEvent);
    };

    if (!this.config.enableTapLookup) {
      this.touchClickTracker.disable();
    }

    void hasReasonableTimerResolution().then((isReasonable) => {
      if (isReasonable) {
        this.hidePopupWhenMovingAtSpeed = true;
      }
    });

    // If we are an iframe, check if the popup is currently showing
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:isPopupShowing' });
    }

    this.applyPuckConfig();

    if (document.location.host === 'docs.google.com') {
      injectGdocsStyles();
    }
  }

  applyPuckConfig() {
    if (!this.isTopMostWindow()) {
      return;
    }

    if (this.config.showPuck === 'show') {
      this.setUpPuck();
    } else {
      this.tearDownPuck();
    }
  }

  setUpPuck() {
    if (!this.puck) {
      this.puck = new LookupPuck({
        initialPosition: this.config.puckState,
        safeAreaProvider: this.safeAreaProvider,
        onLookupDisabled: () => {
          this.clearResult();
        },
        onPuckStateChanged: (state) => {
          void browser.runtime.sendMessage({
            type: 'puckStateChanged',
            value: state,
          });
        },
      });
    }

    this.puck.render({
      icon: this.config.toolbarIcon,
      theme: this.config.popupStyle,
    });
    this.puck.setEnabledState(
      this.config.puckState?.active === false ? 'inactive' : 'active'
    );
  }

  tearDownPuck() {
    this.puck?.unmount();
    this.puck = null;

    removePuck();
  }

  setConfig(config: Readonly<ContentConfigParams>) {
    this.config.set(config);
  }

  get canHover() {
    return this.config.canHover;
  }

  onConfigChange(changes: readonly ContentConfigChange[]) {
    for (const { key, value } of changes) {
      switch (key) {
        case 'accentDisplay':
        case 'posDisplay':
        case 'readingOnly':
        case 'showKanjiComponents':
        case 'showPriority':
        case 'tabDisplay':
          if (this.isTopMostWindow()) {
            this.updatePopup();
          }
          break;

        case 'enableTapLookup':
          if (value) {
            this.touchClickTracker.enable();
          } else {
            this.touchClickTracker.disable();
          }
          break;

        case 'fontFace':
          setFontFace(value);
          break;

        case 'fontSize':
          setFontSize(value);
          break;

        case 'showRomaji':
          // Enabling romaji currently means we need to re-run the lookup
          if (
            this.isTopMostWindow() &&
            this.currentLookupParams &&
            this.currentTargetProps
          ) {
            const lookupParams: Parameters<typeof this.lookupText>[0] = {
              dictMode: 'default',
              ...this.currentLookupParams,
              targetProps: this.currentTargetProps,
            };

            void this.lookupText(lookupParams);
          }
          break;

        case 'popupInteractive':
          if (this.isTopMostWindow()) {
            // We can't use updatePopup here since it will try to re-use the
            // existing popup display mode but we specifically want to change it
            // in this case.
            this.showPopup({
              allowOverlap: this.popupState?.pos?.allowOverlap,
              displayMode: value ? 'hover' : 'static',
            });
          }
          break;

        case 'popupStyle':
          setPopupStyle(value);
          this.puck?.setTheme(value);
          break;

        case 'puckState':
          if (value) {
            this.puck?.setState(value);
          }
          break;

        case 'showPuck':
          this.applyPuckConfig();
          break;

        case 'toolbarIcon':
          this.puck?.setIcon(value);
          break;

        case 'canHover':
          void browser.runtime.sendMessage({ type: 'canHoverChanged', value });
          break;
      }
    }
  }

  onDbUpdated() {
    // Re-trigger lookup now that the database has been updated (typically going
    // from being in the initial updating state to the updated state).
    if (
      this.isTopMostWindow() &&
      this.currentLookupParams &&
      this.currentTargetProps
    ) {
      const lookupParams: Parameters<typeof this.lookupText>[0] = {
        dictMode: 'default',
        ...this.currentLookupParams,
        targetProps: this.currentTargetProps,
      };

      void this.lookupText(lookupParams);
    }
  }

  detach() {
    this.config.removeListener(this.onConfigChange);

    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('keydown', this.onKeyDown, { capture: true });
    window.removeEventListener('keyup', this.onKeyUp, { capture: true });
    window.removeEventListener('focusin', this.onFocusIn);
    window.removeEventListener('fullscreenchange', this.onFullScreenChange);
    window.removeEventListener('message', this.onInterFrameMessage, {
      capture: true,
    });
    browser.runtime.onMessage.removeListener(this.onBackgroundMessage);

    this.clearResult();
    this.tearDownPuck();

    this.textHighlighter.detach();
    this.copyState = { kind: 'inactive' };
    this.isPopupExpanded = false;
    this.safeAreaProvider.destroy();
    this.touchClickTracker.destroy();

    removePopup();
    removeGdocsStyles();
  }

  setEffectiveTopMostWindow() {
    const wasTopMost = this.isTopMostWindow();
    this.isEffectiveTopMostWindow = true;

    // If we are now the top most we might now be the puck host
    if (!wasTopMost) {
      this.applyPuckConfig();
    }
  }

  isTopMostWindow() {
    // If a descendant of an iframe is being displayed full-screen, that iframe
    // can temporarily act as the topmost window.
    if (document.fullscreenElement) {
      if (document.fullscreenElement.tagName === 'IFRAME') {
        return false;
      }
      if (document.fullscreenElement.ownerDocument === document) {
        return true;
      }
    }

    return (
      this.isEffectiveTopMostWindow || window.self === this.getTopMostWindow()
    );
  }

  getTopMostWindow() {
    return this.isEffectiveTopMostWindow
      ? window.self
      : window.top || window.self;
  }

  getFrameId(): number | undefined {
    if (typeof this.frameId === 'number') {
      return this.frameId;
    }

    if (typeof browser.runtime.getFrameId === 'function') {
      const frameId = browser.runtime.getFrameId(window);
      if (frameId !== -1) {
        return frameId;
      }
    }

    return undefined;
  }

  setFrameId(frameId: number) {
    this.frameId = frameId;
  }

  onPointerMove(event: PointerEvent) {
    this.typingMode = false;

    // Safari has an odd bug where it dispatches extra pointermove/mousemove
    // events when you press any modifier key (e.g. Shift).
    //
    // It goes something like this:
    //
    // * Press Shift down
    // -> mousemove with shiftKey = true
    // -> keydown with shiftKey = true
    //
    // * Release Shift key
    // -> mousemove with shiftKey = false
    // -> keyup with shiftKey = false
    //
    // We really need to ignore these events since they will intefere with
    // detecting taps of the "pin popup" key as well as when using Shift to only
    // show kanji.
    //
    // For now the best way we know of doing that is to just check if the
    // position has changed.
    //
    // 2022-09-12: This is tracked as WebKit bug
    // https://bugs.webkit.org/show_bug.cgi?id=16271
    // which was apparently fixed in July 2021 but in September 2022 I can still
    // reproduce it, at least with the control key.
    //
    // 2023-08-03: It looks like this was finally fixed in May 2023 in
    // https://github.com/WebKit/WebKit/pull/14221
    // It will be some time before that's available in release Safari everywhere
    // we care about.
    if (isSafari()) {
      if (
        (event.shiftKey ||
          event.altKey ||
          event.metaKey ||
          event.ctrlKey ||
          this.ignoreNextPointerMove) &&
        this.lastMouseMoveScreenPoint.x === event.clientX &&
        this.lastMouseMoveScreenPoint.y === event.clientY
      ) {
        // We need to ignore the mousemove event corresponding to the keyup
        // event too.
        this.ignoreNextPointerMove = !this.ignoreNextPointerMove;
        return;
      }

      this.ignoreNextPointerMove = false;
    }
    this.lastMouseMoveScreenPoint = { x: event.clientX, y: event.clientY };

    // If we start moving the mouse, we should stop trying to recognize a tap on
    // the "pin" key as such since it's no longer a tap (and very often these
    // keys overlap with the hold-to-show keys which are held while moving the
    // mouse).
    //
    // Note that it's not enough just to check if `pinToggleState` is in the
    // 'keydown' state because it seems like sometimes browsers (at least
    // Firefox) batch up input events so that all the mousemove events arrive
    // before the keyboard events.
    //
    // In order to handle that case, we need to check if the relevant key for
    // pinning are being held (and hence we are likely to get a keydown event
    // soon).
    if (
      this.pinToggleState === 'keydown' ||
      (this.pinToggleState === 'idle' && this.hasPinKeysPressed(event))
    ) {
      this.pinToggleState = 'ignore';
    }

    // Ignore mouse events while buttons are being pressed.
    if (event.buttons) {
      return;
    }

    // If we are ignoring taps, ignore events that are not from the mouse
    //
    // You might think, "Why don't we just listen for mousemove events in the
    // first place?" but iOS Safari will dispatch mousemove events for touch
    // events too (e.g. if you start to select text) and we need to ignore them
    // so we need to know what kind of "mousemove" event we got.
    //
    // If we are NOT ignoring taps then we probably should allow other pointer
    // types since it's probably useful to look up things with a pen?
    if (!this.config.enableTapLookup && event.pointerType !== 'mouse') {
      return;
    }

    // We don't know how to deal with anything that's not an element
    if (!(event.target instanceof Element)) {
      return;
    }

    // Ignore mouse moves if we are pinned
    if (
      !isTouchClickEvent(event) &&
      this.popupState?.display.mode === 'pinned'
    ) {
      this.lastMouseTarget = event.target;
      return;
    }

    // Ignore mouse events on the popup window
    if (isPopupWindowHostElem(event.target)) {
      return;
    }

    // Check if we have released the hold-to-show keys such that a ghosted popup
    // should be committed.
    //
    // Normally we'd handle this case in onKeyUp, but it's possible, even common
    // to have the focus in a different window/frame while mousing over content.
    //
    // Our window/frame will still get mousemove events with the corresponding
    // modifier key attributes set so we can _show_ the popup, but we _won't_
    // get the `keyup` event(s) when the modifier(s) are released so instead
    // we need to try and detect when that happens on the next mousemove event.
    if (
      !isTouchClickEvent(event) &&
      this.popupState?.display.mode === 'ghost' &&
      this.popupState.display.trigger === 'keys' &&
      !(this.getActiveHoldToShowKeys(event) & this.popupState.display.keyType)
    ) {
      this.commitPopup();
      return;
    }

    // Check if any required "hold to show keys" are held.
    //
    // We do this before checking throttling since that can be expensive and
    // when this is configured, typically the user will have the extension
    // more-or-less permanently enabled so we don't want to add unnecessary
    // latency to regular mouse events.
    //
    // Note that the "hold to show keys" setting is only relevant for mouse
    // events, not puck events.
    const contentsToMatch =
      this.getActiveHoldToShowKeys(event) |
      (isPuckPointerEvent(event) || isTouchClickEvent(event)
        ? HoldToShowKeyType.All
        : 0);
    const matchText = !!(contentsToMatch & HoldToShowKeyType.Text);
    const matchImages = !!(contentsToMatch & HoldToShowKeyType.Images);

    // If nothing is going to match, close the popup. If we're in hover mode,
    // however, we need to proceed with the regular processing to see if we are
    // hovering over the arrow area or not.
    //
    // (For pinned mode and touch mode, contentsToMatch is guaranteed to be
    // non-zero. For static mode we certainly want to close the popup, and we
    // never seem to hit this case in ghost mode but presumably if we did we'd
    // want to close the popup.)
    if (!contentsToMatch && this.popupState?.display.mode !== 'hover') {
      if (this.popupState) {
        this.clearResult({ currentElement: event.target });
      }

      // We still want to set the current position and element information so
      // that if the user presses the hold-to-show keys later we can show the
      // popup immediately.
      this.currentPagePoint = toPageCoords({
        x: event.clientX,
        y: event.clientY,
      });
      this.lastMouseTarget = event.target;
      return;
    }

    // If the mouse have moved in a triangular shape between the original popup
    // point and the popup, don't hide it, but instead allow the user to
    // interact with the popup.
    if (this.isEnRouteToPopup(event)) {
      return;
    }

    // If the mouse is moving too quickly, don't show the popup
    if (this.shouldThrottlePopup(event)) {
      this.clearResult({ currentElement: event.target });
      return;
    }

    let dictMode: 'default' | 'kanji' = 'default';
    if (event.shiftKey && this.config.keys.kanjiLookup.includes('Shift')) {
      this.kanjiLookupMode = event.shiftKey;
      dictMode = 'kanji';
    }

    // Record the last mouse target in case we need to trigger the popup
    // again.
    this.lastMouseTarget = event.target;

    void this.tryToUpdatePopup({
      fromPuck: isPuckPointerEvent(event),
      fromTouch: isTouchClickEvent(event),
      matchText,
      matchImages,
      screenPoint: { x: event.clientX, y: event.clientY },
      eventElement: event.target,
      dictMode,
    });
  }

  isEnRouteToPopup(event: PointerEvent) {
    if (isPuckPointerEvent(event) || isTouchClickEvent(event)) {
      return false;
    }

    if (
      this.popupState?.display.mode !== 'hover' ||
      !this.popupState.pos?.lookupPoint
    ) {
      return false;
    }

    const {
      x: popupX,
      y: popupY,
      width: popupWidth,
      height: popupHeight,
      direction,
      lookupPoint: {
        x: lookupX,
        y: lookupY,
        marginX: lookupMarginX,
        marginY: lookupMarginY,
      },
    } = this.popupState.pos;

    // If the popup is not related to the mouse position we don't want to allow
    // mousing over it as it might require making most of the screen
    // un-scannable.
    if (direction === 'disjoint') {
      return false;
    }

    // Check block axis range

    const lookupBlockPos = direction === 'vertical' ? lookupY : lookupX;

    // Get the closest edge of the popup edge
    const popupBlockPos = direction === 'vertical' ? popupY : popupX;
    const popupBlockSize = direction === 'vertical' ? popupHeight : popupWidth;
    const popupEdge =
      popupBlockPos >= lookupBlockPos
        ? popupBlockPos
        : popupBlockPos + popupBlockSize;

    // Work out the distance between the lookup point and the edge of the popup
    const popupDist = popupEdge - lookupBlockPos;

    // Work out the mouse distance from the lookup point
    //
    // NOTE: We _don't_ want to use event.pageY/pageX since that will return the
    // wrong result when we are in full-screen mode. Instead we should manually
    // add the scroll offset in.
    const { scrollX, scrollY } = getScrollOffset();
    const mouseBlockPos =
      direction === 'vertical'
        ? event.clientY + scrollY
        : event.clientX + scrollX;

    // Work out the portion of the distance we are in the gap between the lookup
    // point and the edge of the popup.
    const blockOffset =
      popupDist < 0
        ? lookupBlockPos - mouseBlockPos
        : mouseBlockPos - lookupBlockPos;
    const blockRange = Math.abs(popupDist);
    const blockMargin =
      direction === 'vertical' ? lookupMarginY : lookupMarginX;

    // Check if we are in the gap (or the margin)
    if (blockOffset < -blockMargin || blockOffset > blockRange) {
      return false;
    }

    // Check the inline range
    //
    // We do this by basically drawing a triangle from the lookup point spanning
    // outwards towards the edge of the popup using the defined angle.
    //
    // e.g.
    //
    //                    +
    //                  /  \
    //                 / x  \
    //                /<-D-->\
    //               /        \
    //  +----------------------------------------------+
    //  |           <----B---->                        |
    //  |           ^                                  |
    //  |           C                                  |
    //  A
    //
    // + = Lookup point (lookup inline position)
    // x = Mouse position
    // A = Inline popup start
    // B = Max inline range (i.e. the inline range at the edge)
    // C = Max inline range start
    // D = Proportional inline range

    const lookupInlinePos = direction === 'vertical' ? lookupX : lookupY;

    const mouseInlinePos =
      direction === 'vertical'
        ? event.clientX + scrollX
        : event.clientY + scrollY;

    const ENVELOPE_SPREAD_DEGREES = 120;
    const inlineHalfRange =
      Math.tan(((ENVELOPE_SPREAD_DEGREES / 2) * Math.PI) / 180) * blockOffset;
    const inlineMargin =
      direction === 'vertical' ? lookupMarginX : lookupMarginY;
    const inlineRangeStart =
      lookupInlinePos - Math.max(inlineHalfRange, inlineMargin);
    const inlineRangeEnd =
      lookupInlinePos + Math.max(inlineHalfRange, inlineMargin);

    if (mouseInlinePos < inlineRangeStart || mouseInlinePos > inlineRangeEnd) {
      return false;
    }

    return true;
  }

  shouldThrottlePopup(event: PointerEvent) {
    if (!this.hidePopupWhenMovingAtSpeed) {
      return false;
    }

    let averageSpeed = 0;

    if (this.previousMousePosition && this.previousMouseMoveTime) {
      // If the events are backed up their times might be equal. Likewise, if
      // the events are more than a couple of animation frames apart either the
      // mouse stopped, or the system is backed up and the OS can't even
      // dispatch the events.
      //
      // In either case we should:
      //
      // - Update the previous mouse position and time so that when we get the
      //   *next* event we can accurately measure the speed.
      //
      // - Not throttle the popup since for some content we might always be
      //   backed up (YouTube with browser console open seems particularly bad)
      //   and its safer to just allow the popup in this case rather than risk
      //   permanently hiding it.
      //
      if (
        event.timeStamp === this.previousMouseMoveTime ||
        event.timeStamp - this.previousMouseMoveTime > 32
      ) {
        this.previousMousePosition = { x: event.pageX, y: event.pageY };
        this.previousMouseMoveTime = event.timeStamp;
        return false;
      }

      const distance = Math.sqrt(
        Math.pow(event.pageX - this.previousMousePosition.x, 2) +
          Math.pow(event.pageY - this.previousMousePosition.y, 2)
      );
      const speed = distance / (event.timeStamp - this.previousMouseMoveTime);

      this.mouseSpeeds.push(speed);
      this.mouseSpeedRollingSum += speed;

      if (this.mouseSpeeds.length > ContentHandler.MOUSE_SPEED_SAMPLES) {
        this.mouseSpeedRollingSum -= this.mouseSpeeds.shift()!;
      }

      averageSpeed = this.mouseSpeedRollingSum / this.mouseSpeeds.length;
    }

    this.previousMousePosition = { x: event.pageX, y: event.pageY };
    this.previousMouseMoveTime = event.timeStamp;

    return averageSpeed >= ContentHandler.MOUSE_SPEED_THRESHOLD;
  }

  onMouseDown(event: MouseEvent) {
    // Ignore mouse events on the popup window
    if (isPopupWindowHostElem(event.target)) {
      return;
    }

    // Clear the highlight since it interferes with selection.
    this.clearResult({ currentElement: event.target as Element });
  }

  onKeyDown(event: KeyboardEvent) {
    const textBoxInFocus =
      document.activeElement && isEditableNode(document.activeElement);

    // If the user pressed the hold-to-show key combination, show the popup
    // if possible.
    //
    // It's important we only do this when the popup is not visible, however,
    // since these keys may overlap with the keys we've defined for pinning the
    // popup--which only apply when the popup is visible.
    const matchedHoldToShowKeys = this.isHoldToShowKeyStroke(event);
    if (matchedHoldToShowKeys && !this.isVisible()) {
      event.preventDefault();

      // We don't do this when the there is a text box in focus because we
      // we risk interfering with the text selection when, for example, the
      // hold-to-show key is Ctrl and the user presses Ctrl+V etc.
      if (!textBoxInFocus && this.currentPagePoint && this.lastMouseTarget) {
        void this.tryToUpdatePopup({
          fromPuck: false,
          fromTouch: false,
          matchText: !!(matchedHoldToShowKeys & HoldToShowKeyType.Text),
          matchImages: !!(matchedHoldToShowKeys & HoldToShowKeyType.Images),
          screenPoint: toScreenCoords(this.currentPagePoint),
          eventElement: this.lastMouseTarget,
          dictMode: 'default',
        });
      }
      return;
    }

    // If we got shift in combination with something else, ignore.
    //
    // We need to allow shift by itself because it is used for switching
    // dictionaries. However, if the user presses, Cmd + Shift + 3, for example,
    // we should ignore the last two keystrokes.
    //
    // TODO: We should refine this somehow so that it's possible to toggle
    // dictionaries using Shift while pressing the hold-to-show keys.
    //
    // See https://github.com/birchill/10ten-ja-reader/issues/658
    if (
      event.shiftKey &&
      (event.ctrlKey || event.altKey || event.metaKey || event.key !== 'Shift')
    ) {
      this.typingMode = true;
      return;
    }

    // If we're not visible we should ignore any keystrokes.
    if (!this.isVisible()) {
      this.typingMode = true;
      return;
    }

    // If we're focussed on a text-editable node and in typing mode, don't try
    // to handle keystrokes. This is so that if the user has accidentally left
    // their mouse sitting over some Japanese text we don't interfere with
    // typing.
    //
    // The one exception to this is Google Docs. In Google Docs when the
    // document canvas is in focus it puts the focus on a contenteditable
    // element in a 1 pixel high iframe.
    //
    // Normally, whenever we see a mousemove event we will reset the
    // `typingMode` flag but becuase the iframe is only 1 pixel high, the iframe
    // will never see those mousemove events and hence `typingMode` will only
    // get cleared on the top-most document and not the iframe.
    //
    // The `keydown` events, however, will go to the iframe. If we ignore them
    // because `typingMode` is true we will end up ignoring all keyboard events
    // while the canvas is in focus.
    //
    // Instead we just allow these events through on Google docs and accept that
    // if the popup is showing it might interfere with typing.
    const isGoogleDocsIframe = () => {
      try {
        return (
          // On Firefox the iframe src is javascript:undefined which ends up
          // getting host docs.google.com, while on Chrome the iframe src is
          // about:blank which has an empty host.
          //
          // We wrap the whole thing in try/catch because I'm paranoid about
          // cross-origin things throwing security exceptions.
          (document.location.host === 'docs.google.com' ||
            window.top?.location.host === 'docs.google.com') &&
          window.frameElement
        );
      } catch {
        return false;
      }
    };

    if (textBoxInFocus && this.typingMode && !isGoogleDocsIframe()) {
      return;
    }

    if (this.handleKey(event)) {
      // We handled the key stroke so we should break out of typing mode.
      this.typingMode = false;

      event.stopPropagation();
      event.preventDefault();
    } else if (textBoxInFocus) {
      // If we are focussed on a textbox and the keystroke wasn't one we handle
      // one, enter typing mode and hide the pop-up.
      this.clearResult({ currentElement: this.lastMouseTarget });
      this.typingMode = true;
    }
  }

  onKeyUp(event: KeyboardEvent) {
    // If we are showing a popup that required certain hold keys, check if they
    // are now no longer held, and, if they are not, trigger an update of the
    // popup where we mark it as interactive
    if (
      this.popupState?.display.mode === 'ghost' &&
      this.popupState.display.trigger === 'keys' &&
      !(this.getActiveHoldToShowKeys(event) & this.popupState.display.keyType)
    ) {
      this.commitPopup();
    }

    const pinPopup = normalizeKeys(this.config.keys.pinPopup);
    // On Chrome, if we auto-fill a text box, the event.key member can be
    // undefined.
    const key = event.key ? normalizeKey(event.key) : '';
    if (pinPopup.includes(key)) {
      if (this.pinToggleState === 'keydown' && this.togglePin()) {
        event.preventDefault();
      }
      this.pinToggleState = 'idle';
    }

    if (!this.kanjiLookupMode) {
      return;
    }

    if (event.key === 'Shift') {
      this.kanjiLookupMode = false;
      event.preventDefault();
    }
  }

  handleKey(event: KeyboardEvent): boolean {
    // Make an upper-case version of the list of keys so that we can do
    // a case-insensitive comparison. This is so that the keys continue to work
    // even when the user has Caps Lock on.
    const { keys } = this.config;
    const [
      nextDictionary,
      toggleDefinition,
      expandPopup,
      closePopup,
      pinPopup,
      movePopupUp,
      movePopupDown,
      startCopy,
    ] = [
      normalizeKeys(keys.nextDictionary),
      normalizeKeys(keys.toggleDefinition),
      normalizeKeys(keys.expandPopup),
      normalizeKeys(keys.closePopup),
      normalizeKeys(keys.pinPopup),
      normalizeKeys(keys.movePopupUp),
      normalizeKeys(keys.movePopupDown),
      normalizeKeys(keys.startCopy),
    ];

    const key = normalizeKey(event.key);

    if (nextDictionary.includes(key)) {
      // If we are in kanji lookup mode, ignore 'Shift' keydown events since it
      // is also the key we use to trigger lookup mode.
      if (key === 'SHIFT' && this.kanjiLookupMode) {
        return true;
      }
      this.showNextDictionary();
    } else if (toggleDefinition.includes(key)) {
      try {
        // We don't wait on the following because we're only really interested
        // in synchronous failures which occur in some browsers when the content
        // script is stale.
        void browser.runtime.sendMessage({ type: 'toggleDefinition' });
      } catch {
        console.warn(
          '[10ten-ja-reader] Failed to call toggleDefinition. The page might need to be refreshed.'
        );
        return false;
      }
      this.toggleDefinition();
    } else if (movePopupDown.includes(key)) {
      this.movePopup('down');
    } else if (movePopupUp.includes(key)) {
      this.movePopup('up');
    } else if (
      // It's important we _don't_ enter copy mode when the Ctrl key is being
      // pressed since otherwise if the user simply wants to copy the selected
      // text by pressing Ctrl+C they will end up entering copy mode.
      !hasModifiers(event) &&
      startCopy.includes(key)
    ) {
      if (
        this.copyState.kind === 'inactive' ||
        this.copyState.kind === 'finished'
      ) {
        this.enterCopyMode({ trigger: 'keyboard' });
      } else {
        this.nextCopyEntry();
      }
    } else if (this.copyState.kind !== 'inactive' && key === 'ESC') {
      this.exitCopyMode();
    } else if (expandPopup.includes(key)) {
      this.expandPopup();
    }
    // This needs to come _after_ the above check so that if the user has
    // configured Escape to close the popup but they are in copy mode, we first
    // escape copy mode (and if they press it a second time we close the popup).
    else if (closePopup.includes(key)) {
      this.clearResult();
    } else if (
      pinPopup.includes(key) &&
      // We don't want to detect a pin keystroke if we are still in the ghost
      // state since otherwise when the hold-to-show keys and pin keys overlap
      // we'll end up going straight into the pin state if the user happens
      // to be still when they release the hold-to-show keys.
      this.popupState?.display.mode !== 'ghost' &&
      // Likewise if we got a mouse move since the first keydown event occurred
      // we should ignore subsequent keydown events.
      this.pinToggleState !== 'ignore'
    ) {
      this.pinToggleState = 'keydown';
    } else if (this.isHoldToShowKeyStroke(event)) {
      return true;
    } else if (
      this.copyState.kind !== 'inactive' &&
      this.copyState.kind !== 'finished'
    ) {
      let copyType: CopyType | undefined;
      for (const copyKey of CopyKeys) {
        if (key === copyKey.key.toUpperCase()) {
          copyType = copyKey.type;
          break;
        }
      }

      if (typeof copyType === 'undefined') {
        // Unrecognized key
        return false;
      }

      this.copyCurrentEntry(copyType);
    } else {
      return false;
    }

    return true;
  }

  onFocusIn(event: FocusEvent) {
    if (this.textHighlighter.isUpdatingFocus()) {
      return;
    }

    // If we focussed on a text box, assume we want to type in it and ignore
    // keystrokes until we get another mousemove.
    this.typingMode = !!event.target && isEditableNode(event.target as Node);

    // If we entered typing mode clear the highlight.
    if (this.typingMode) {
      this.clearResult({ currentElement: this.lastMouseTarget });
    }
  }

  // Test if an incoming keyboard event matches the hold-to-show key sequence.
  isHoldToShowKeyStroke(event: KeyboardEvent): HoldToShowKeyType {
    // Check if it is a modifier at all
    if (!['Alt', 'AltGraph', 'Control'].includes(event.key)) {
      return HoldToShowKeyType.None;
    }

    const definedKeys =
      (this.config.holdToShowKeys.length ? HoldToShowKeyType.Text : 0) |
      (this.config.holdToShowImageKeys.length ? HoldToShowKeyType.Images : 0);

    return definedKeys & this.getActiveHoldToShowKeys(event);
  }

  // Test if hold-to-show keys are set for a given a UI event
  getActiveHoldToShowKeys(
    event: PointerEvent | KeyboardEvent
  ): HoldToShowKeyType {
    const areKeysDownForSetting = (
      setting: 'holdToShowKeys' | 'holdToShowImageKeys'
    ) => {
      if (
        typeof this.config[setting] === 'undefined' ||
        !Array.isArray(this.config[setting]) ||
        !this.config[setting].length
      ) {
        return true;
      }

      // Check if all the configured hold-to-show keys are pressed down
      const hasAltGraph = event.getModifierState('AltGraph');
      if (
        this.config[setting].includes('Alt') &&
        !event.altKey &&
        !hasAltGraph
      ) {
        return false;
      }
      if (this.config[setting].includes('Ctrl') && !event.ctrlKey) {
        return false;
      }

      return true;
    };

    return (
      (areKeysDownForSetting('holdToShowKeys') ? HoldToShowKeyType.Text : 0) |
      (areKeysDownForSetting('holdToShowImageKeys')
        ? HoldToShowKeyType.Images
        : 0)
    );
  }

  hasPinKeysPressed(event: PointerEvent): boolean {
    const pinPopupKeys = this.config.keys.pinPopup;
    const hasAltGraph = event.getModifierState('AltGraph');
    return (
      (pinPopupKeys.includes('Ctrl') && event.ctrlKey) ||
      (pinPopupKeys.includes('Alt') && (event.altKey || hasAltGraph))
    );
  }

  isVisible(): boolean {
    return this.isTopMostWindow() ? isPopupVisible() : !!this.popupState;
  }

  onFullScreenChange() {
    if (this.popupState?.display.mode === 'pinned') {
      this.unpinPopup();
    }

    // If entering / leaving fullscreen caused a change in who is the topmost
    // window we might have some setup / clean up to do.
    if (this.isTopMostWindow()) {
      this.applyPuckConfig();
    } else {
      removePopup();
      this.clearResult();
      this.tearDownPuck();
    }
  }

  onInterFrameMessage(event: MessageEvent) {
    // NOTE: Please do not add additional messages here.
    //
    // We want to avoid using postMessage at all costs. Please see the rationale
    // for this one exception here:
    //
    // https://github.com/birchill/10ten-ja-reader/issues/747#issuecomment-918774588
    //
    const PuckMovedMessageSchema = s.type({
      type: s.literal('10ten(ja):puckMoved'),
      clientX: s.number(),
      clientY: s.number(),
    });
    if (!s.is(event.data, PuckMovedMessageSchema)) {
      return;
    }

    // Make sure no-one else sees this message since some apps will get confused
    // if they see unrecognized messages.
    event.stopImmediatePropagation();
    event.preventDefault();

    const { clientX, clientY } = event.data;
    const pointerEvent = new PointerEvent('pointermove', {
      // Make sure the event bubbles up to the listener on the window
      bubbles: true,
      clientX,
      clientY,
      pointerType: 'mouse',
    });
    (pointerEvent as PuckPointerEvent).fromPuck = true;

    const documentBody = window.self.document.body;
    if (!documentBody) {
      // Hasn't loaded yet
      return;
    }

    documentBody.dispatchEvent(pointerEvent);
  }

  async onBackgroundMessage(request: unknown): Promise<string> {
    s.assert(request, BackgroundMessageSchema);

    // Most messages are targeted at specific frames and should only arrive
    // there. However, Safari doesn't support sending to specific frames so we
    // also explicitly indicate the target within each message so we can ignore
    // those not intended for us.
    if (request.frame === 'top' && !this.isTopMostWindow()) {
      return 'ok';
    }
    if (request.frame === 'children' && this.isTopMostWindow()) {
      return 'ok';
    }
    if (
      typeof request.frame === 'number' &&
      this.getFrameId() !== request.frame
    ) {
      return 'ok';
    }

    switch (request.type) {
      case 'popupShown':
        {
          // Check if this request has translated the popup geometry for us
          //
          // If not, we should leave `pos` as undefined so we know not to use
          // it.
          let pos: PopupState['pos'];
          const { pos: requestPos } = request.state;
          if (requestPos && this.getFrameId() === requestPos.frameId) {
            const { scrollX, scrollY } = getScrollOffset();
            const { x, y, lookupPoint } = requestPos;
            pos = {
              ...requestPos,
              x: x + scrollX,
              y: y + scrollY,
              lookupPoint: lookupPoint
                ? {
                    x: lookupPoint.x + scrollX,
                    y: lookupPoint.y + scrollY,
                    marginX: lookupPoint.marginX,
                    marginY: lookupPoint.marginY,
                  }
                : undefined,
            };
          }

          // We don't need to worry about clearing any timeout that may have
          // been set in `this.popupState.ghost.timeout` because that timeout
          // is cleared by the top-most window (which we are not).
          this.popupState = { ...request.state, pos };
        }
        break;

      case 'popupHidden':
        this.currentTextRange = undefined;
        this.currentPagePoint = undefined;
        this.copyState = { kind: 'inactive' };
        this.isPopupExpanded = false;
        this.popupState = undefined;
        break;

      case 'isPopupShowing':
        if (this.isVisible() && this.popupState) {
          void browser.runtime.sendMessage({
            type: 'frame:popupShown',
            frameId: request.frameId,
            state: this.getTranslatedPopupState(
              { frameId: request.frameId },
              this.popupState
            ),
          });
        }
        break;

      case 'highlightText':
        this.highlightText(request.length);
        break;

      case 'clearTextHighlight':
        this.clearTextHighlight();
        break;

      case 'lookup':
        {
          const iframe = findIframeElement({
            frameId: request.source.frameId,
            initialSrc: request.source.initialSrc,
            currentSrc: request.source.currentSrc,
            dimensions: request.source.dimensions,
          });

          let iframeOriginPoint;
          if (!iframe) {
            console.warn("[10ten-ja-reader] Couldn't find iframe element");
            // Just use the top-left corner since that's probably better than
            // not showing the popup at all.
            iframeOriginPoint = { x: 0, y: 0 };
          } else {
            iframeOriginPoint = getIframeOrigin(iframe);
          }

          // Translate the point from the iframe's coordinate system to ours.
          const { point } = request;
          this.currentPagePoint = toPageCoords({
            x: point.x + iframeOriginPoint.x,
            y: point.y + iframeOriginPoint.y,
          });

          // Similarly translate any text box sizes.
          let targetProps = request.targetProps as TargetProps;
          if (targetProps.textBoxSizes) {
            const scrollOffset = getScrollOffset();
            targetProps = JSON.parse(JSON.stringify(targetProps));
            const { textBoxSizes } = targetProps;
            for (const size of textBoxSizeLengths) {
              const { left, top, width, height } = textBoxSizes![size];

              // We pass sizes around in screen coordinates but store them in
              // page coordinates.
              textBoxSizes![size] = toPageCoords(
                {
                  left: left + iframeOriginPoint.x,
                  top: top + iframeOriginPoint.y,
                  width,
                  height,
                },
                scrollOffset
              );
            }
          }

          // We are doing a lookup based on an iframe's contents so we should
          // clear any mouse target we previously stored.
          this.lastMouseTarget = null;

          const meta = request.meta as SelectionMeta | undefined;
          void this.lookupText({
            ...request,
            meta,
            targetProps,
            source: request.source,
          });
        }
        break;

      case 'pinPopup':
        this.pinPopup();
        break;

      case 'unpinPopup':
        this.unpinPopup();
        break;

      case 'commitPopup':
        this.commitPopup();
        break;

      case 'clearResult':
        this.clearResult();
        break;

      case 'nextDictionary':
        this.showNextDictionary();
        break;

      case 'toggleDefinition':
        this.toggleDefinition();
        break;

      case 'expandPopup':
        this.expandPopup();
        break;

      case 'movePopup':
        this.movePopup(request.direction);
        break;

      case 'enterCopyMode':
        this.enterCopyMode({ trigger: 'keyboard' });
        break;

      case 'exitCopyMode':
        this.exitCopyMode();
        break;

      case 'nextCopyEntry':
        this.nextCopyEntry();
        break;

      case 'copyCurrentEntry':
        this.copyCurrentEntry(request.copyType);
        break;
    }

    return 'ok';
  }

  showNextDictionary() {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:nextDictionary' });
      return;
    }

    if (this.currentPagePoint) {
      this.showDictionary('next');
    }
  }

  toggleDefinition() {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:toggleDefinition' });
      return;
    }

    this.config.readingOnly = !this.config.readingOnly;
    this.updatePopup();
  }

  expandPopup() {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:expandPopup' });
      return;
    }

    if (this.isPopupExpanded) {
      return;
    }

    this.isPopupExpanded = true;
    this.updatePopup({ allowOverlap: true, fixPosition: true });
  }

  movePopup(direction: 'up' | 'down') {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:movePopup', direction });
      return;
    }

    if (direction === 'down') {
      this.popupPositionMode =
        (this.popupPositionMode + 1) % (PopupPositionMode.End + 1);
    } else {
      this.popupPositionMode = mod(
        this.popupPositionMode - 1,
        PopupPositionMode.End + 1
      );
    }
    this.updatePopup();
  }

  enterCopyMode({
    trigger,
    index = 0,
  }: {
    trigger: 'keyboard' | 'touch' | 'mouse';
    index?: number;
  }) {
    // In the iframe case, we mirror the copyMode state in both iframe and
    // topmost window because:
    //
    // - The topmost window needs to know the copyMode state so that it can
    //   render the popup correctly, but
    // - The iframe needs to know the copyMode state so that it can determine
    //   how to handle copyMode-specific keystrokes.
    //
    this.copyState = { kind: 'active', index, mode: trigger };

    if (!this.isTopMostWindow()) {
      console.assert(
        trigger === 'keyboard',
        "[10ten-ja-reader] We probably should't be receiving touch or mouse events in the iframe"
      );
      void browser.runtime.sendMessage({ type: 'top:enterCopyMode' });
      return;
    }

    this.updatePopup({ allowOverlap: true, fixPosition: true });
  }

  exitCopyMode() {
    // Use the existing copyState to determine if we need to maintain the popup
    // size and position.
    const fixPopup = this.shouldFixPopupWhenExitingCopyMode();

    // As with enterCopyMode, we mirror the copyMode state in both iframe and
    // topmost window.
    this.copyState = { kind: 'inactive' };

    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:exitCopyMode' });
      return;
    }

    this.updatePopup({ fixPosition: fixPopup, fixMinHeight: fixPopup });
  }

  private shouldFixPopupWhenExitingCopyMode() {
    return (
      getCopyMode(this.copyState) === 'mouse' &&
      // If the popup is pinned, there's no need to fix the height
      this.popupState?.display.mode !== 'pinned'
    );
  }

  nextCopyEntry() {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:nextCopyEntry' });
      return;
    }

    if (this.copyState.kind === 'active' || this.copyState.kind === 'error') {
      this.copyState = {
        kind: 'active',
        index: this.copyState.index + 1,
        mode: this.copyState.mode,
      };
    }
    this.updatePopup({ fixPosition: true });
  }

  copyCurrentEntry(copyType: CopyType) {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({
        type: 'top:copyCurrentEntry',
        copyType,
      });
      return;
    }

    const copyEntry = this.getCopyEntry();
    if (!copyEntry) {
      return;
    }

    const textToCopy = getTextToCopy({
      entry: copyEntry,
      copyType,
      getMessage: browser.i18n.getMessage.bind(browser.i18n),
      includeAllSenses: this.config.copySenses !== 'first',
      includePartOfSpeech: this.config.copyPos !== 'none',
      includeLessCommonHeadwords: this.config.copyHeadwords !== 'common',
      kanjiReferences: this.config.kanjiReferences,
      showKanjiComponents: this.config.showKanjiComponents,
    });

    void this.copyString(textToCopy!, copyType);
  }

  private getCopyEntry(): CopyEntry | null {
    if (this.copyState.kind !== 'active') {
      console.error('[10ten-ja-reader] Expected to be in copy mode');
      return null;
    }

    if (!this.currentSearchResult) {
      return null;
    }

    const copyEntry = getCopyEntryFromResult({
      result: this.currentSearchResult,
      series: this.currentDict,
      index: this.copyState.index,
    });
    if (!copyEntry) {
      const fixPopup = this.shouldFixPopupWhenExitingCopyMode();
      this.copyState = { kind: 'inactive' };
      this.updatePopup({ fixPosition: fixPopup, fixMinHeight: fixPopup });
    }

    return copyEntry;
  }

  private async copyString(message: string, copyType: CopyType) {
    if (this.copyState.kind === 'inactive') {
      return;
    }

    const fixPopup = this.shouldFixPopupWhenExitingCopyMode();
    const { index, mode } = this.copyState;
    try {
      await copyText(message);
      this.copyState = { kind: 'finished', type: copyType, index, mode };
    } catch (e) {
      console.error(e);
      this.copyState = { kind: 'error', index, mode };
    }

    this.updatePopup({ fixPosition: fixPopup, fixMinHeight: fixPopup });

    // Reset the copy state so that it doesn't re-appear next time we re-render
    // the popup.
    this.copyState = { kind: 'inactive' };
  }

  highlightText(length: number) {
    if (!this.currentTextRange?.length) {
      return;
    }

    this.textHighlighter.highlight({
      length,
      textRange: this.currentTextRange,
      style: this.config.highlightStyle,
    });

    this.puck?.highlightMatch();
  }

  clearTextHighlight(currentElement: Element | null = null) {
    this.textHighlighter.clearHighlight({ currentElement });
    this.puck?.clearHighlight();
  }

  // The currentElement here is _only_ used to avoid resetting the scroll
  // position when we clear the text selection of a text box.
  //
  // That is, if we go to clear the text selection of a text box but we are
  // still interacting with that element, then we take extra steps to ensure
  // the scroll position does not change.
  clearResult({
    currentElement = null,
  }: { currentElement?: Element | null } = {}) {
    this.currentTextRange = undefined;
    this.currentPagePoint = undefined;
    this.lastMouseTarget = null;
    this.copyState = { kind: 'inactive' };

    clearPopupTimeout(this.popupState);
    this.popupState = undefined;

    if (this.isTopMostWindow() && this.currentLookupParams?.source) {
      const {
        source: { frameId },
      } = this.currentLookupParams;
      void browser.runtime.sendMessage({
        type: 'frame:clearTextHighlight',
        frameId,
      });
      this.puck?.clearHighlight();
    } else {
      this.clearTextHighlight(currentElement);
    }

    if (this.isTopMostWindow()) {
      this.hidePopup();
    } else {
      void browser.runtime.sendMessage({ type: 'top:clearResult' });
    }

    // Start tracking touch taps again now that the window is hidden.
    this.touchClickTracker.stopIgnoringClicks();
  }

  async tryToUpdatePopup({
    fromPuck,
    fromTouch,
    matchText,
    matchImages,
    screenPoint,
    eventElement,
    dictMode,
  }: {
    fromPuck: boolean;
    fromTouch: boolean;
    matchText: boolean;
    matchImages: boolean;
    screenPoint: Point;
    eventElement: Element;
    dictMode: 'default' | 'kanji';
  }) {
    const textAtPoint = getTextAtPoint({
      matchCurrency: !!this.config.fx,
      matchText,
      matchImages,
      point: screenPoint,
      maxLength: ContentHandler.MAX_LENGTH,
    });

    // We might have failed to find a match because we didn't have the
    // necessary keys held down.
    //
    // In that case, we still want to store the current point so that if those
    // keys are pressed later, we can show the pop-up immediately.
    if (!textAtPoint && (!matchText || !matchImages)) {
      this.currentPagePoint = toPageCoords(screenPoint);
    }

    // Check if the text range was the same as the last time.
    //
    // The following is not strictly correct since if dictMode was 'kanji'
    // but is now 'default' then technically we shouldn't return early
    // since the result will likely differ.
    //
    // In practice, however, locking the result to the previously shown
    // dictionary in this case is not a problem. On the contrary it makes
    // toggling dictionaries a little less sensitive to minor mouse movements
    // and hence easier to work with.
    if (
      // We require that at least one of the text ranges was set (or for there
      // to be no text discovered at all), however, since otherwise for the case
      // of a non-text element (e.g. an <img> with a title attribute) where
      // textAtPoint.textRange is null but textAtPoint.text is set, we'll end up
      // returning early and not displaying the popup.
      (this.currentTextRange || !textAtPoint || textAtPoint.textRange) &&
      textRangesEqual(this.currentTextRange, textAtPoint?.textRange) &&
      dictMode === 'default'
    ) {
      return;
    }

    // If we got no result, clear the result.
    if (!textAtPoint) {
      this.clearResult({ currentElement: eventElement });
      return;
    }

    this.currentPagePoint = toPageCoords(screenPoint);
    this.currentTextRange = textAtPoint?.textRange || undefined;

    const pageTargetProps = getPageTargetProps({
      fromPuck,
      fromTouch,
      target: eventElement,
      textRange: textAtPoint?.textRange || undefined,
    });

    const lookupParams = {
      dictMode,
      meta: textAtPoint.meta,
      source: null,
      text: textAtPoint.text,
      targetProps: pageTargetProps,
      wordLookup: !!textAtPoint.textRange,
    };

    if (this.isTopMostWindow()) {
      void this.lookupText(lookupParams);
    } else {
      void browser.runtime.sendMessage({
        ...lookupParams,
        type: 'top:lookup',
        // We use screen coordinates for values we pass between frames
        point: screenPoint,
        targetProps: {
          ...pageTargetProps,
          textBoxSizes: selectionSizesToScreenCoords(
            pageTargetProps.textBoxSizes
          ),
        },
        source: {
          // The background page will fill in our frame ID for us
          src: document.location.href,
          dimensions: getWindowDimensions(),
        },
      });
    }
  }

  // ------------------------------------------------------------------------
  //
  // (Mostly) Top-most window concerns
  //
  // ------------------------------------------------------------------------

  async lookupText({
    dictMode,
    meta,
    source,
    text,
    targetProps,
    wordLookup,
  }: {
    dictMode: 'default' | 'kanji';
    meta?: SelectionMeta;
    source: IframeSourceParams | null;
    targetProps: TargetProps;
    text: string;
    wordLookup: boolean;
  }) {
    this.currentLookupParams = { text, meta, wordLookup, source };

    // Presumably the text or dictionary has changed so break out of copy mode
    this.copyState = { kind: 'inactive' };

    // Likewise reset the expanded state
    this.isPopupExpanded = false;

    const queryResult = await query(text, {
      includeRomaji: this.config.showRomaji,
      metaMatchLen: meta?.matchLen,
      wordLookup,
      updateQueryResult: (queryResult: QueryResult | null) => {
        void this.applyQueryResult({
          dictMode,
          meta,
          queryResult,
          targetProps,
          text,
          wordLookup,
        });
      },
    });

    void this.applyQueryResult({
      dictMode,
      meta,
      queryResult,
      targetProps,
      text,
      wordLookup,
    });
  }

  async applyQueryResult({
    dictMode,
    meta,
    queryResult,
    targetProps,
    text,
    wordLookup,
  }: {
    dictMode: 'default' | 'kanji';
    meta?: SelectionMeta;
    queryResult: QueryResult | null;
    targetProps: TargetProps;
    text: string;
    wordLookup: boolean;
  }) {
    const lookupParams = { text, meta, wordLookup };

    // Check if we have triggered a new query or been disabled while running
    // the previous query.
    if (
      !this.currentLookupParams ||
      JSON.stringify(lookupParams) !==
        JSON.stringify(stripFields(this.currentLookupParams, ['source']))
    ) {
      return;
    }

    if (!queryResult && !meta) {
      this.clearResult({ currentElement: this.lastMouseTarget });
      return;
    }

    // Determine the dictionary to show
    let dict: MajorDataSeries = 'words';

    if (queryResult) {
      switch (dictMode) {
        case 'default':
          if (!showWordsTab(queryResult, !!meta)) {
            dict = queryResult.names ? 'names' : 'kanji';
          }
          break;

        case 'kanji':
          if (!queryResult.kanji) {
            queryResult = null;
          } else {
            dict = 'kanji';
          }
          break;
      }

      this.currentDict = dict;
    }

    this.currentSearchResult = queryResult || undefined;
    this.currentTargetProps = targetProps;

    this.highlightTextForCurrentResult();
    this.showPopup();
  }

  showDictionary(
    dictToShow: 'next' | 'prev' | MajorDataSeries,
    options: { fixPopupPosition?: boolean } = {}
  ) {
    if (!this.currentSearchResult) {
      return;
    }

    let dict: MajorDataSeries;
    const cycleOrder: Array<MajorDataSeries> = ['words', 'kanji', 'names'];

    if (dictToShow === 'next') {
      dict = this.currentDict;

      let next = (cycleOrder.indexOf(this.currentDict) + 1) % cycleOrder.length;
      while (cycleOrder[next] !== this.currentDict) {
        const nextDict = cycleOrder[next];
        if (
          this.currentSearchResult[nextDict] ||
          (nextDict === 'words' &&
            showWordsTab(
              this.currentSearchResult,
              !!this.currentLookupParams?.meta
            ))
        ) {
          dict = nextDict;
          break;
        }
        next = ++next % cycleOrder.length;
      }
    } else if (dictToShow === 'prev') {
      dict = this.currentDict;

      let prev = mod(
        cycleOrder.indexOf(this.currentDict) - 1,
        cycleOrder.length
      );
      while (cycleOrder[prev] !== this.currentDict) {
        const prevDict = cycleOrder[prev];
        if (
          this.currentSearchResult[prevDict] ||
          (prevDict === 'words' && !!this.currentLookupParams?.meta)
        ) {
          dict = prevDict;
          break;
        }
        prev = mod(--prev, cycleOrder.length);
      }
    } else {
      dict = dictToShow;
    }

    if (dict === this.currentDict) {
      return;
    }

    this.currentDict = dict;

    // Exit copy state if we are changing tabs
    this.copyState = { kind: 'inactive' };

    // Reset expanded state since we are changing tabs
    this.isPopupExpanded = false;

    this.highlightTextForCurrentResult();
    this.updatePopup({
      allowOverlap: options?.fixPopupPosition,
      fixPosition: options?.fixPopupPosition,
    });
  }

  highlightTextForCurrentResult() {
    const highlightLength = this.getHighlightLengthForCurrentResult();

    // Check we have something to highlight
    if (highlightLength < 1) {
      return;
    }

    if (this.currentLookupParams?.source) {
      const {
        source: { frameId },
      } = this.currentLookupParams;
      void browser.runtime.sendMessage({
        type: 'frame:highlightText',
        frameId,
        length: highlightLength,
      });
      this.puck?.highlightMatch();
      return;
    }

    this.highlightText(highlightLength);
  }

  getHighlightLengthForCurrentResult(): number {
    if (this.config.noTextHighlight) {
      return 0;
    }

    const searchResult = this.currentSearchResult?.[this.currentDict];

    return Math.max(
      searchResult?.matchLen || 0,
      this.currentLookupParams?.meta?.matchLen || 0
    );
  }

  showPopup(
    options: {
      allowOverlap?: boolean;
      displayMode?: DisplayMode;
      fixPosition?: boolean;
      fixMinHeight?: boolean;
    } = {}
  ) {
    if (!this.isTopMostWindow()) {
      console.warn('[10ten-ja-reader] Called showPopup from iframe.');
      return;
    }

    if (!this.currentSearchResult && !this.currentLookupParams?.meta) {
      this.clearResult({ currentElement: this.lastMouseTarget });
      return;
    }

    const allowOverlap = options.allowOverlap || false;
    const displayMode =
      options.displayMode || this.getInitialDisplayMode('ghost');

    // Precalculate the selection sizes
    const { textBoxSizes: pageTextBoxSizes } = this.currentTargetProps || {};
    const screenTextBoxSizes = selectionSizesToScreenCoords(pageTextBoxSizes);

    const popupOptions: ShowPopupOptions = {
      allowOverlap: options.allowOverlap,
      accentDisplay: this.config.accentDisplay,
      bunproDisplay: this.config.bunproDisplay,
      closeShortcuts: this.config.keys.closePopup,
      copy: {
        includeAllSenses: this.config.copySenses !== 'first',
        includePartOfSpeech: this.config.copyPos !== 'none',
        includeLessCommonHeadwords: this.config.copyHeadwords !== 'common',
      },
      copyNextKey: this.config.keys.startCopy[0] || '',
      copyState: this.copyState,
      dictLang: this.config.dictLang,
      dictToShow: this.currentDict,
      displayMode,
      fixedPosition: options?.fixPosition ? this.getFixedPosition() : undefined,
      fixMinHeight: options.fixMinHeight,
      fontFace: this.config.fontFace,
      fontSize: this.config.fontSize,
      fxData: this.config.fx,
      getCursorClearanceAndPos: this.getCursorClearanceAndPos.bind(
        this,
        screenTextBoxSizes
      ),
      expandShortcuts: this.config.keys.expandPopup,
      interactive: this.config.popupInteractive,
      isExpanded:
        this.isPopupExpanded ||
        this.config.autoExpand.includes(
          this.currentDict as AutoExpandableEntry
        ) ||
        // When selecting items by keyboard, expand the content so the user can
        // see what else is available to select, but not for kanji since it
        // would make the window massive.
        (this.copyState.kind === 'active' &&
          this.copyState.mode === 'keyboard' &&
          this.currentDict !== 'kanji'),
      isVerticalText: !!this.currentTargetProps?.isVerticalText,
      kanjiReferences: this.config.kanjiReferences,
      meta: this.currentLookupParams?.meta,
      onCancelCopy: () => this.exitCopyMode(),
      onExpandPopup: () => this.expandPopup(),
      onStartCopy: (index: number, trigger: 'touch' | 'mouse') =>
        this.enterCopyMode({ trigger, index }),
      onCopy: (copyType: CopyType) => this.copyCurrentEntry(copyType),
      onClosePopup: () => {
        this.clearResult({ currentElement: this.lastMouseTarget });
      },
      onShowSettings: () => {
        browser.runtime.sendMessage({ type: 'options' }).catch(() => {
          // Ignore
        });
      },
      onSwitchDictionary: (dict: MajorDataSeries | 'next' | 'prev') => {
        this.showDictionary(dict, { fixPopupPosition: true });
      },
      onTogglePin: () => {
        if (displayMode === 'pinned') {
          this.unpinPopup();
        } else {
          this.pinPopup();
        }
      },
      pinShortcuts: this.config.keys.pinPopup,
      pointerType: this.currentTargetProps?.fromPuck ? 'puck' : 'cursor',
      popupStyle: this.config.popupStyle,
      posDisplay: this.config.posDisplay,
      positionMode: this.popupPositionMode,
      preferredUnits: this.config.preferredUnits,
      previousHeight: this.popupState?.pos?.height,
      safeArea: this.safeAreaProvider.getSafeArea(),
      showDefinitions: !this.config.readingOnly,
      showKanjiComponents: this.config.showKanjiComponents,
      showPriority: this.config.showPriority,
      switchDictionaryKeys: this.config.keys.nextDictionary,
      tabDisplay: this.config.tabDisplay,
      waniKaniVocabDisplay: this.config.waniKaniVocabDisplay,
    };

    const showPopupResult = showPopup(this.currentSearchResult, popupOptions);
    if (!showPopupResult) {
      this.clearResult({ currentElement: this.lastMouseTarget });
      return;
    }
    const { size: popupSize, pos: popupPos } = showPopupResult;

    // Inform the touch click tracker to ignore taps since the popup is now
    // showing.
    //
    // We can't simply check if the popup is visible when we get the touch click
    // callback since by that point we will already have hidden it.
    this.touchClickTracker.startIgnoringClicks();

    // Store the popup's display mode so that:
    //
    // (a) we can fix the popup's position when changing tabs, and
    // (b) we can detect if future mouse events lie between the popup and
    //     the lookup point (and _not_ close or update the popup in that case)
    // (c) we know how to handle keyboard events based on whether or not the
    //     popup is showing

    clearPopupTimeout(this.popupState);

    this.popupState = {
      pos: {
        frameId: this.getFrameId() || 0,
        x: popupPos.x,
        y: popupPos.y,
        width: popupSize.width,
        height: popupSize.height,
        direction: popupPos.direction,
        side: popupPos.side,
        allowOverlap,
        lookupPoint: this.getPopupLookupPoint({
          currentPagePoint: this.currentPagePoint,
          firstCharBbox: screenTextBoxSizes?.[1],
        }),
      },
      contentType: this.currentTargetProps?.contentType || 'text',
      display: this.getNextDisplay(displayMode),
    };

    //
    // Tell child iframes
    //
    let childState = this.popupState!;
    if (this.currentLookupParams?.source) {
      childState = this.getTranslatedPopupState(
        this.currentLookupParams.source,
        this.popupState
      );
    }

    void browser.runtime.sendMessage({
      type: 'children:popupShown',
      state: childState,
    });
  }

  getCursorClearanceAndPos(screenTextBoxSizes: SelectionSizes | undefined) {
    const cursorPos = this.currentPagePoint
      ? toScreenCoords(this.currentPagePoint)
      : undefined;
    let cursorClearance: MarginBox;
    if (this.currentTargetProps?.fromPuck && this.puck) {
      const { top, bottom, left, right } = this.puck.getPuckClearance();

      // Although we can't tell whether the left or right thumb is in use
      // (so we don't make corresponding adjustments to left/right), we can at
      // least be reasonably sure that the thumb extends downwards!
      const extraMarginToClearThumb =
        this.puck.getTargetOrientation() === 'above' ? 100 : 0;
      cursorClearance = {
        top,
        right,
        bottom: bottom + extraMarginToClearThumb,
        left,
      };
    } else {
      const tooltipClearance = this.currentTargetProps?.hasTitle ? 20 : 0;
      cursorClearance = { top: 0, right: 0, bottom: tooltipClearance, left: 0 };
    }

    // Add the first part of the matched text to the cursor clearance.
    //
    // We don't want to add _all_ of it since we might have a selection that
    // wraps lines and that would produce a massive area that would be too hard
    // to avoid.
    if (screenTextBoxSizes && cursorPos) {
      const bbox = getBestFitSize({
        sizes: screenTextBoxSizes,
        length: this.getHighlightLengthForCurrentResult(),
      });
      if (bbox) {
        const cursorClearanceAsRect = addMarginToPoint(
          cursorClearance,
          cursorPos
        );

        // Adjust the cursorPos to use the middle of the first character of
        // the selected text.
        //
        // This should cause the popup to be better aligned with the selected
        // text which, apart from appearing a little bit neater, also makes
        // mousing over the popup easier since it should be closer.
        //
        // (It's important we do this _after_ calling addMarginToPoint above
        // since, when we are using the puck, the original value of
        // `cursorClearance` is relative to this.currentPoint, i.e. the
        // original value of cursorPos, so we need to supply that value when
        // converting to a rect.)
        const firstCharBbox = screenTextBoxSizes[1];
        cursorPos.x = Math.max(0, firstCharBbox.left + firstCharBbox.width / 2);
        cursorPos.y = Math.max(0, firstCharBbox.top + firstCharBbox.height / 2);

        const expandedClearance = union(bbox, cursorClearanceAsRect);
        cursorClearance = getMarginAroundPoint(cursorPos, expandedClearance);
      }
    }

    return { cursorClearance, cursorPos };
  }

  getInitialDisplayMode(interactive: 'ghost' | 'hover'): DisplayMode {
    if (
      this.currentTargetProps?.fromPuck ||
      this.currentTargetProps?.fromTouch
    ) {
      return 'touch';
    } else if (this.config.popupInteractive) {
      return interactive;
    } else {
      return 'static';
    }
  }

  getNextDisplay(prevDisplayMode: DisplayMode): PopupState['display'] {
    let display: PopupState['display'];

    if (prevDisplayMode === 'ghost') {
      if (
        this.config.holdToShowKeys.length &&
        this.currentTargetProps?.contentType === 'text'
      ) {
        display = {
          mode: 'ghost',
          trigger: 'keys',
          keyType: HoldToShowKeyType.Text,
        };
      } else if (
        this.config.holdToShowImageKeys.length &&
        this.currentTargetProps?.contentType === 'image'
      ) {
        display = {
          mode: 'ghost',
          trigger: 'keys',
          keyType: HoldToShowKeyType.Images,
        };
      } else {
        display = {
          mode: 'ghost',
          trigger: 'timeout',
          timeout: window.setTimeout(() => this.commitPopup(), 400),
        };
      }
    } else {
      display = { mode: prevDisplayMode };
    }

    return display;
  }

  updatePopup(
    options: {
      allowOverlap?: boolean;
      fixPosition?: boolean;
      fixMinHeight?: boolean;
    } = {}
  ) {
    if (!this.isTopMostWindow()) {
      console.warn('[10ten-ja-reader] Called updatePopup within iframe');
      return;
    }

    const displayMode = this.popupState?.display.mode;
    this.showPopup({
      allowOverlap: options.allowOverlap ?? this.popupState?.pos?.allowOverlap,
      displayMode,
      fixPosition: options.fixPosition,
      fixMinHeight: options.fixMinHeight,
    });
  }

  pinPopup() {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:pinPopup' });
      return;
    }

    // If the popup is interactive, then we shouldn't move it when pinning it
    // but if, for example, the user has turned off popup interactivity and so
    // the popup is rendered with the narrow tab bar, when we go to pin it
    // we'll expand the tab bar so we should re-position it as necessary since
    // it might take more space.
    this.showPopup({
      allowOverlap: this.popupState?.pos?.allowOverlap,
      displayMode: 'pinned',
      fixPosition: this.config.popupInteractive,
    });
  }

  unpinPopup() {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:unpinPopup' });
      return;
    }

    this.showPopup({
      allowOverlap: this.popupState?.pos?.allowOverlap,
      displayMode: this.getInitialDisplayMode('hover'),
      fixPosition: this.config.popupInteractive,
    });

    // Typically when you unpin the popup you want it to disappear immediately
    // (unless the mouse is currently over it or still over the original text).
    //
    // To try to make that happen we dispatch another mouse event with the last
    // mouse position.
    //
    // Unfortunately this won't necessarily help if the user has since moused
    // over an iframe since our last recorded mouse position and target element
    // will be based on the last mousemove event we received in _this_ frame.
    if (this.lastMouseTarget) {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        screenX: this.lastMouseMoveScreenPoint.x,
        screenY: this.lastMouseMoveScreenPoint.y,
        clientX: this.lastMouseMoveScreenPoint.x,
        clientY: this.lastMouseMoveScreenPoint.y,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        button: 0,
        buttons: 0,
      });
      this.lastMouseTarget.dispatchEvent(mouseMoveEvent);
    }
  }

  togglePin() {
    if (!this.popupState) {
      return false;
    }

    if (this.popupState.display.mode === 'pinned') {
      this.unpinPopup();
    } else {
      this.pinPopup();
    }

    return true;
  }

  commitPopup() {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:commitPopup' });
      return;
    }

    if (this.popupState?.display.mode !== 'ghost') {
      return;
    }

    this.showPopup({
      allowOverlap: this.popupState?.pos?.allowOverlap,
      displayMode: 'hover',
      fixPosition: false,
    });
  }

  hidePopup() {
    const wasShowing = !!this.currentSearchResult;

    this.currentLookupParams = undefined;
    this.currentSearchResult = undefined;
    this.currentTargetProps = undefined;

    hidePopup();

    if (wasShowing && this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'children:popupHidden' });
    }
  }

  getFixedPosition(): PopupPositionConstraints | undefined {
    if (!this.popupState?.pos || this.config.tabDisplay === 'none') {
      return undefined;
    }

    const { x, y, width, direction, side } = this.popupState.pos;

    return {
      // If the tabs are on the right, the x position is the right edge of the
      // popup.
      x: this.config.tabDisplay === 'right' ? x + width : x,
      y,
      anchor: this.config.tabDisplay,
      direction,
      side,
    };
  }

  getPopupLookupPoint({
    currentPagePoint,
    firstCharBbox,
  }: {
    currentPagePoint?: Point;
    firstCharBbox?: Rect;
  }): NonNullable<PopupState['pos']>['lookupPoint'] {
    const { scrollX, scrollY } = getScrollOffset();

    if (firstCharBbox) {
      const marginX = firstCharBbox.width / 2;
      const marginY = firstCharBbox.height / 2;
      const x = firstCharBbox.left + marginX + scrollX;
      const y = firstCharBbox.top + marginY + scrollY;
      return { x, y, marginX, marginY };
    }

    return currentPagePoint
      ? {
          x: currentPagePoint.x,
          y: currentPagePoint.y,
          marginX: 10,
          marginY: 10,
        }
      : undefined;
  }

  getTranslatedPopupState(
    frameSource: WithRequired<IframeSearchParams, 'frameId'>,
    popupState: Readonly<PopupState>
  ): Readonly<PopupState> {
    const iframe = findIframeElement(frameSource);
    if (!iframe) {
      return popupState;
    }

    if (!popupState.pos) {
      return popupState;
    }

    const iframeOrigin = getIframeOrigin(iframe);
    const { scrollX, scrollY } = getScrollOffset();
    const { x, y, lookupPoint } = popupState.pos;

    return {
      ...popupState,
      pos: {
        ...popupState.pos,
        frameId: frameSource.frameId,
        x: x - iframeOrigin.x - scrollX,
        y: y - iframeOrigin.y - scrollY,
        lookupPoint: lookupPoint
          ? {
              x: lookupPoint.x - iframeOrigin.x - scrollX,
              y: lookupPoint.y - iframeOrigin.y - scrollY,
              marginX: lookupPoint.marginX,
              marginY: lookupPoint.marginY,
            }
          : undefined,
      },
    };
  }
}

export function isTouchClickEvent(
  pointerEvent: PointerEvent
): pointerEvent is TouchClickEvent {
  return !!(pointerEvent as TouchClickEvent).fromTouch;
}

export interface TouchClickEvent extends PointerEvent {
  fromTouch: true;
}

declare global {
  interface Window {
    postMessage<T = any>(
      message: T,
      targetOrigin: string,
      transfer?: Transferable[]
    ): void;
    readerScriptVer?: string;
    removeReaderScript?: () => void;
  }
}

(function () {
  // Check that we should be running at all. We can only handle HTML and SVG
  // content and if we start messing with other documents (e.g. random XML
  // documents) we can break their styling.
  const { namespaceURI } = document.documentElement;
  if (
    namespaceURI !== 'http://www.w3.org/1999/xhtml' &&
    namespaceURI !== 'http://www.w3.org/2000/svg'
  ) {
    return;
  }

  // Ensure the content script is not loaded twice or that an incompatible
  // version of the script is not used.
  //
  // This is only needed when we are injecting the script via executeScript
  // when running in "activeTab" mode.
  //
  // Furthermore, with regards to incompatible versions, as far as I can tell
  // Firefox will remove old versions of injected scripts when it reloads an
  // add-on. I'm not sure if that behavior is reliable across all browsers,
  // however, (update: it's not) so for now we try our best to ensure we have
  // the correct version of the script here.
  if (window.readerScriptVer === __VERSION__) {
    return;
  } else if (
    typeof window.readerScriptVer !== 'undefined' &&
    typeof window.removeReaderScript === 'function'
  ) {
    console.info(
      '[10ten-ja-reader] Found incompatible version of script. Removing.'
    );
    try {
      window.removeReaderScript();
    } catch (e) {
      console.error(e);
    }
  }

  let contentHandler: ContentHandler | null = null;

  // Port to the background page.
  //
  // This is only used when we are running in "activeTab" mode. It serves to:
  //
  // - Provide an extra means to ensure the tab is removed from the list of
  //   enabled tabs when the tab is destroyed (in case we fail to get a pagehide
  //   event), and
  //
  // - Ensure the background page is kept alive so long as we have an enabled
  //   tab when the background page is running as an event page.
  //
  let port: Runtime.Port | undefined;

  window.readerScriptVer = __VERSION__;
  window.removeReaderScript = () => {
    disable();
    browser.runtime.onMessage.removeListener(onMessage);
  };

  // Track if we are the top-most window or not.
  //
  // Normally we detect the top-most window by comparing window.top ===
  // window.self but in some cases the actual top-most window does not have the
  // content script injected and hence we have a concept of the effective
  // top-most window.
  //
  // This only happens in Firefox and only really with the Live TL extension
  // where the top-most window in some cases is a moz-extension:// URL and hence
  // does not have the content script injected. Instead a child iframe (a
  // regular YouTube page) has the content script injected and should be treated
  // as the top-most window for the purposes of showing the popup.
  let isEffectiveTopMostWindow = false;
  function isTopMostWindow() {
    return isEffectiveTopMostWindow || window.self === window.top;
  }

  browser.runtime.onMessage.addListener(onMessage);

  // Check if we should be enabled or not.
  //
  // We don't need to do this in activeTab mode since the background page will
  // send us an 'enable' message after injecting the script.
  //
  // However, when the content script is injected using content_scripts the
  // background script might not have been initialized yet in which case this
  // will fail. However, presumably once the background script has initialized
  // it will call us if we need to be enabled.
  if (!__ACTIVE_TAB_ONLY__) {
    browser.runtime.sendMessage({ type: 'enable?' }).catch(() => {
      // Ignore
    });
  }

  // Poll the background page until it finishes updating
  void (async function checkIfUpdating() {
    try {
      const isDbUpdating = await browser.runtime.sendMessage({
        type: 'isDbUpdating',
      });
      if (isDbUpdating) {
        // Wait 20s between checks
        setTimeout(checkIfUpdating, 20_000);
      }
    } catch {
      // Ignore, probably we're out of date with the background
    }
  })();

  async function onMessage(request: unknown): Promise<string> {
    s.assert(request, BackgroundMessageSchema);

    // As with onBackgroundMessage we need to ensure that we are the
    // intended recipient for these messages because Safari.

    switch (request.type) {
      case 'enable':
        console.assert(
          typeof request.config === 'object',
          'No config object provided with enable message'
        );
        console.assert(request.frame === '*');

        enable({
          tabId: request.id,
          config: request.config as ContentConfigParams,
        });
        break;

      case 'disable':
        console.assert(request.frame === '*');
        disable();
        break;

      case 'dbUpdated':
        contentHandler?.onDbUpdated();
        break;

      case 'isTopMost':
        if (contentHandler?.getFrameId() === request.frame) {
          isEffectiveTopMostWindow = true;
          contentHandler?.setEffectiveTopMostWindow();
        }
        break;
    }

    return 'ok';
  }

  function enable({
    tabId,
    config,
  }: {
    tabId?: number;
    config: ContentConfigParams;
  }) {
    if (contentHandler) {
      contentHandler.setConfig(config);
      if (isEffectiveTopMostWindow) {
        contentHandler.setEffectiveTopMostWindow();
      }
    } else {
      // When the extension is upgraded, we can still have the old popup window
      // or puck hanging around so make sure to clear it.
      removePopup();
      removePuck();
      removeSafeAreaProvider();
      removeGdocsStyles();

      contentHandler = new ContentHandler(config);
    }

    // If we are running in "activeTab" mode we will get passed our tab ID
    // so we can set up a Port which will allow the background script to
    // know when we disappear so it can update the browser action status.
    //
    // We only need to do that if we're the root-most frame, however.
    if (typeof tabId !== 'undefined' && isTopMostWindow() && !port) {
      try {
        port = browser.runtime.connect(undefined, { name: `tab-${tabId}` });
      } catch (e) {
        console.error(e);
      }
    }

    browser.runtime
      .sendMessage<unknown, { frameId: number } | undefined>({
        type: 'enabled',
        src: document.location.href,
      })
      .then((resp) => {
        if (!resp) {
          return;
        }

        const { frameId } = resp;
        if (contentHandler) {
          contentHandler.setFrameId(frameId);
        }
        if (window.frameElement instanceof HTMLElement) {
          window.frameElement.dataset.frameId = frameId.toString();
        }
      })
      .catch((e) => {
        console.warn(e);
      });

    // Let the background know the current state of hover devices since this
    // might be its first chance to access the DOM.
    void browser.runtime.sendMessage({
      type: 'canHoverChanged',
      value: contentHandler.canHover,
    });

    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);
  }

  function disable() {
    if (contentHandler) {
      contentHandler.detach();
      contentHandler = null;
    }

    if (port) {
      port.disconnect();
      port = undefined;
    }

    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('pagehide', onPageHide);
  }

  function onPageShow() {
    void browser.runtime.sendMessage({ type: 'enable?' });
  }

  function onPageHide() {
    void browser.runtime.sendMessage({ type: 'disabled' });
  }
})();
