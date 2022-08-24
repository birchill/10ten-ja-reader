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
import Browser, { browser } from 'webextension-polyfill-ts';

import { BackgroundMessageSchema } from '../background/background-message';
import { ContentConfig } from '../common/content-config';
import { CopyKeys, CopyType } from '../common/copy-keys';
import { isTouchDevice } from '../utils/device';
import { isEditableNode } from '../utils/dom-utils';
import {
  addMarginToPoint,
  getMarginAroundPoint,
  MarginBox,
  Point,
  union,
} from '../utils/geometry';
import { mod } from '../utils/mod';
import { stripFields } from '../utils/strip-fields';

import { copyText } from './clipboard';
import { CopyEntry, getTextToCopy } from './copy-text';
import { injectGdocsStyles, removeGdocsStyles } from './gdocs-canvas';
import { getCopyEntryFromResult } from './get-copy-entry';
import { getTextAtPoint } from './get-text';
import {
  findIframeElement,
  getIframeOrigin,
  getWindowDimensions,
} from './iframes';
import { SelectionMeta } from './meta';
import {
  getPopupDimensions,
  hidePopup,
  isPopupVisible,
  isPopupWindowHostElem,
  PopupOptions,
  removePopup,
  renderPopup,
  setPopupStyle,
  showOverlay,
} from './popup/popup';
import { getPopupPosition, PopupPositionMode } from './popup-position';
import { CopyState } from './popup/copy-state';
import {
  isPuckMouseEvent,
  LookupPuck,
  PuckMouseEvent,
  removePuck,
} from './puck';
import { query, QueryResult } from './query';
import { removeSafeAreaProvider, SafeAreaProvider } from './safe-area-provider';
import { isForeignObjectElement, isSvgDoc, isSvgSvgElement } from './svg';
import {
  getBestFitSize,
  getTargetProps,
  TargetProps,
  textBoxSizeLengths,
} from './target-props';
import { TextHighlighter } from './text-highlighter';
import { TextRange, textRangesEqual } from './text-range';
import { hasReasonableTimerResolution } from './timer-precision';
import { TouchClickTracker } from './touch-click-tracker';

const enum HoldToShowKeyType {
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
  private currentPoint: Point | undefined;

  // We keep track of the last element that was the target of a mouse move so
  // that we can popup the window later using its properties.
  private lastMouseTarget: Element | null = null;

  // Used by iframes to track when the topmost window is showing the popup so
  // we know if we should handle keyboard keys or not.
  //
  // (You might think we could just forward them on unconditionally but
  // when the popup is showing, if we successfully handled a keyboard event we
  // mark it as handled by calling event.preventDefault(). However, we
  // definitely don't want to do that if the popup is not showing.)
  private isPopupShowing = false;

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
        source: number | null;
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

  // Consulted in order to determine safe area
  private safeAreaProvider: SafeAreaProvider = new SafeAreaProvider();

  // Consulted in order to determine popup positioning
  private puck: LookupPuck | null = null;

  constructor(config: ContentConfig) {
    this.config = config;
    this.textHighlighter = new TextHighlighter();

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onFocusIn = this.onFocusIn.bind(this);
    this.onInterFrameMessage = this.onInterFrameMessage.bind(this);
    this.onBackgroundMessage = this.onBackgroundMessage.bind(this);

    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('keydown', this.onKeyDown, { capture: true });
    window.addEventListener('keyup', this.onKeyUp, { capture: true });
    window.addEventListener('focusin', this.onFocusIn);
    window.addEventListener('message', this.onInterFrameMessage, {
      capture: true,
    });
    browser.runtime.onMessage.addListener(this.onBackgroundMessage);

    this.touchClickTracker.onTouchClick = (event: MouseEvent) => {
      // Ignore clicks on interactive elements
      if (
        event.target instanceof HTMLAnchorElement ||
        event.target instanceof HTMLButtonElement
      ) {
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
      // (c) we use `getModifierState` etc. on `MouseEvent` elsewhere so we
      //     actually need to generate a `MouseEvent` object rather than just a
      //     property bag.
      const mouseMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        screenX: event.screenX,
        screenY: event.screenY,
        clientX: event.clientX,
        clientY: event.clientY,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        button: 0,
        buttons: 0,
        relatedTarget: event.relatedTarget,
      });
      (event.target || document.body).dispatchEvent(mouseMoveEvent);
    };

    void hasReasonableTimerResolution().then((isReasonable) => {
      if (isReasonable) {
        this.hidePopupWhenMovingAtSpeed = true;
      }
    });

    this.setUpSafeAreaProvider();

    // If we are an iframe, check if the popup is currently showing
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:isPopupShowing' });
    }

    this.applyPuckConfig();

    if (document.location.host === 'docs.google.com') {
      injectGdocsStyles();
    }
  }

  setUpSafeAreaProvider() {
    this.safeAreaProvider.render();
    this.safeAreaProvider.enable();
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
      this.puck = new LookupPuck(this.safeAreaProvider, () => {
        this.clearResult();
      });
    }

    this.puck.render({
      icon: this.config.toolbarIcon,
      theme: this.config.popupStyle,
    });
    this.puck.setEnabledState('active');
  }

  tearDownPuck() {
    this.puck?.unmount();
    this.puck = null;

    removePuck();
  }

  setConfig(config: Readonly<ContentConfig>) {
    // Update the style of the popup/puck
    if (this.config && config.popupStyle !== this.config.popupStyle) {
      setPopupStyle(config.popupStyle);
      this.puck?.setTheme(config.popupStyle);
    }

    if (this.config && config.toolbarIcon !== this.config.toolbarIcon) {
      this.puck?.setIcon(config.toolbarIcon);
    }

    const puckConfigChanged = config.showPuck !== this.config?.showPuck;

    // TODO: We should update the tab display if that value changes but we
    // actually need to regenerate the popup in that case since we only generate
    // the HTML for the tabs when tabDisplay is not 'none'.

    // TODO: We should probably check which keys have changed and regenerate
    // the pop-up if needed but currently you need to change tabs to tweak
    // the config so the popup probably won't be showing anyway.
    this.config = { ...config };

    if (puckConfigChanged) {
      this.applyPuckConfig();
    }
  }

  detach() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('keydown', this.onKeyDown, { capture: true });
    window.removeEventListener('keyup', this.onKeyUp, { capture: true });
    window.removeEventListener('focusin', this.onFocusIn);
    window.removeEventListener('message', this.onInterFrameMessage, {
      capture: true,
    });
    browser.runtime.onMessage.removeListener(this.onBackgroundMessage);

    this.clearResult();
    this.tearDownPuck();

    this.textHighlighter.detach();
    this.copyState = { kind: 'inactive' };
    this.safeAreaProvider?.unmount();
    this.touchClickTracker.destroy();

    removePopup();
    removeSafeAreaProvider();
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
    return this.frameId ?? typeof browser.runtime.getFrameId === 'function'
      ? browser.runtime.getFrameId(window)
      : undefined;
  }

  setFrameId(frameId: number) {
    this.frameId = frameId;
  }

  onMouseMove(event: MouseEvent) {
    this.typingMode = false;

    // Ignore mouse events while buttons are being pressed.
    if (event.buttons) {
      return;
    }

    // We don't know how to deal with anything that's not an element
    if (!(event.target instanceof Element)) {
      return;
    }

    // Ignore mouse events on the popup window
    if (isPopupWindowHostElem(event.target)) {
      return;
    }

    // Safari has an odd bug where it dispatches extra mousemove events
    // when you press any modifier key (e.g. Shift).
    //
    // It goes something like this:
    //
    // * Press Shift down
    // -> mousemove with shiftKey = true
    // -> keydown with shiftKey = true
    // * Release Shift key
    // -> mousemove with shiftKey = false
    // -> keyup with shiftKey = false
    //
    // We really need to ignore the first mousemove event since otherwise it
    // will completely mess up tab switching when we have the "Shift to show
    // kanji only" setting in effect.
    //
    // For now the best way we know of doing that is to just check if the
    // position has in fact changed.
    if (
      (event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) &&
      this.currentPoint?.x === event.clientX &&
      this.currentPoint?.y === event.clientY
    ) {
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
    // events.
    const contentsToMatch =
      this.getActiveHoldToShowKeys(event) |
      (isPuckMouseEvent(event) ? HoldToShowKeyType.All : 0);
    if (!contentsToMatch) {
      this.clearResult({ currentElement: event.target });

      // We still want to set the current position and element information so
      // that if the user presses the hold-to-show keys later we can show the
      // popup immediately.
      this.currentPoint = { x: event.clientX, y: event.clientY };
      this.lastMouseTarget = event.target;
      return;
    }

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

    const matchText = !!(contentsToMatch & HoldToShowKeyType.Text);
    const matchImages = !!(contentsToMatch & HoldToShowKeyType.Images);

    void this.tryToUpdatePopup({
      fromPuck: isPuckMouseEvent(event),
      matchText,
      matchImages,
      point: { x: event.clientX, y: event.clientY },
      eventElement: event.target,
      dictMode,
    });
  }

  shouldThrottlePopup(event: MouseEvent) {
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
    // We don't do this when the there is a text box in focus because we
    // we risk interfering with the text selection when, for example, the
    // hold-to-show key is Ctrl and the user presses Ctrl+V etc.
    const matchedHoldToShowKeys = this.isHoldToShowKeyStroke(event);
    if (matchedHoldToShowKeys) {
      event.preventDefault();

      if (!textBoxInFocus && this.currentPoint && this.lastMouseTarget) {
        void this.tryToUpdatePopup({
          fromPuck: false,
          matchText: !!(matchedHoldToShowKeys & HoldToShowKeyType.Text),
          matchImages: !!(matchedHoldToShowKeys & HoldToShowKeyType.Images),
          point: this.currentPoint,
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

    if (this.handleKey(event.key, event.ctrlKey)) {
      // We handled the key stroke so we should break out of typing mode.
      this.typingMode = false;

      event.stopPropagation();
      event.preventDefault();
    } else if (textBoxInFocus) {
      // If we are focussed on a textbox and the keystroke wasn't one we handle
      // one, enter typing mode and hide the pop-up.
      this.clearResult({
        currentElement: this.lastMouseTarget,
      });
      this.typingMode = true;
    }
  }

  onKeyUp(event: KeyboardEvent) {
    if (!this.kanjiLookupMode) {
      return;
    }

    if (event.key === 'Shift') {
      this.kanjiLookupMode = false;
      event.preventDefault();
    }
  }

  handleKey(key: string, ctrlKeyPressed: boolean): boolean {
    // Make an upper-case version of the list of keys so that we can do
    // a case-insensitive comparison. This is so that the keys continue to work
    // even when the user has Caps Lock on.
    const toUpper = (keys: string[]): string[] =>
      keys.map((key) => key.toUpperCase());
    const { keys } = this.config;
    const [
      nextDictionary,
      toggleDefinition,
      movePopupUp,
      movePopupDown,
      startCopy,
    ] = [
      toUpper(keys.nextDictionary),
      toUpper(keys.toggleDefinition),
      toUpper(keys.movePopupUp),
      toUpper(keys.movePopupDown),
      toUpper(keys.startCopy),
    ];

    const upperKey = key.toUpperCase();

    if (nextDictionary.includes(upperKey)) {
      // If we are in kanji lookup mode, ignore 'Shift' keydown events since it
      // is also the key we use to trigger lookup mode.
      if (key === 'Shift' && this.kanjiLookupMode) {
        return true;
      }
      this.showNextDictionary();
    } else if (toggleDefinition.includes(upperKey)) {
      try {
        // We don't wait on the following because we're only really interested
        // in synchronous failures which occur in some browsers when the content
        // script is stale.
        void browser.runtime.sendMessage({ type: 'toggleDefinition' });
      } catch {
        console.log(
          '[10ten-ja-reader] Failed to call toggleDefinition. The page might need to be refreshed.'
        );
        return false;
      }
      this.toggleDefinition();
    } else if (movePopupDown.includes(upperKey)) {
      this.movePopup('down');
    } else if (movePopupUp.includes(upperKey)) {
      this.movePopup('up');
    } else if (
      // It's important we _don't_ enter copy mode when the Ctrl key is being
      // pressed since otherwise if the user simply wants to copy the selected
      // text by pressing Ctrl+C they will end up entering copy mode.
      !ctrlKeyPressed &&
      startCopy.includes(upperKey)
    ) {
      if (
        this.copyState.kind === 'inactive' ||
        this.copyState.kind === 'finished'
      ) {
        this.enterCopyMode({ mode: 'keyboard' });
      } else {
        this.nextCopyEntry();
      }
    } else if (this.copyState.kind !== 'inactive' && key === 'Escape') {
      this.exitCopyMode();
    } else if (
      this.copyState.kind !== 'inactive' &&
      this.copyState.kind !== 'finished'
    ) {
      let copyType: CopyType | undefined;
      for (const copyKey of CopyKeys) {
        if (upperKey === copyKey.key.toUpperCase()) {
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
      return 0;
    }

    const definedKeys =
      (this.config.holdToShowKeys.length ? HoldToShowKeyType.Text : 0) |
      (this.config.holdToShowImageKeys.length ? HoldToShowKeyType.Images : 0);

    return definedKeys & this.getActiveHoldToShowKeys(event);
  }

  // Test if hold-to-show keys are set for a given a UI event
  getActiveHoldToShowKeys(
    event: MouseEvent | KeyboardEvent
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
      const isAltGraph = event.getModifierState('AltGraph');
      if (
        this.config[setting].includes('Alt') &&
        !event.altKey &&
        !isAltGraph
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

  isVisible(): boolean {
    return this.isTopMostWindow() ? isPopupVisible() : this.isPopupShowing;
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
    const mouseEvent = new MouseEvent('mousemove', {
      // Make sure the event bubbles up to the listener on the window
      bubbles: true,
      clientX,
      clientY,
    });
    (mouseEvent as PuckMouseEvent).fromPuck = true;

    const documentBody = window.self.document.body;
    if (!documentBody) {
      // Hasn't loaded yet
      return;
    }

    documentBody.dispatchEvent(mouseEvent);
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
        this.isPopupShowing = true;
        break;

      case 'popupHidden':
        this.currentTextRange = undefined;
        this.currentPoint = undefined;
        this.copyState = { kind: 'inactive' };
        this.isPopupShowing = false;
        break;

      case 'isPopupShowing':
        if (this.isVisible()) {
          void browser.runtime.sendMessage({
            type: 'frame:popupShown',
            frameId: request.frameId,
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
            console.warn("Couldn't find iframe element");
            // Just use the top-left corner since that's probably better than
            // not showing the popup at all.
            iframeOriginPoint = { x: 0, y: 0 };
          } else {
            iframeOriginPoint = getIframeOrigin(iframe);
          }

          // Translate the point from the iframe's coordinate system to ours.
          const { point } = request;
          this.currentPoint = {
            x: point.x + iframeOriginPoint.x,
            y: point.y + iframeOriginPoint.y,
          };

          // Similarly translate any text box sizes.
          let targetProps = request.targetProps as TargetProps;
          if (targetProps.textBoxSizes) {
            targetProps = JSON.parse(JSON.stringify(targetProps));
            const { textBoxSizes } = targetProps;
            for (const size of textBoxSizeLengths) {
              const { left, top, width, height } = textBoxSizes![size];
              textBoxSizes![size] = {
                left: left + iframeOriginPoint.x,
                top: top + iframeOriginPoint.y,
                width,
                height,
              };
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
            source: request.source.frameId,
          });
        }
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

      case 'movePopup':
        this.movePopup(request.direction);
        break;

      case 'enterCopyMode':
        this.enterCopyMode({ mode: 'keyboard' });
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

    if (this.currentPoint) {
      this.showDictionary('next');
    }
  }

  toggleDefinition() {
    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:toggleDefinition' });
      return;
    }

    this.config.readingOnly = !this.config.readingOnly;
    this.showPopup();
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
    this.showPopup();
  }

  enterCopyMode({
    mode,
    index = 0,
  }: {
    mode: 'overlay' | 'keyboard';
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
    this.copyState = { kind: 'active', index, mode };

    if (!this.isTopMostWindow()) {
      console.assert(
        mode === 'keyboard',
        "We probably should't be receiving touch events in the iframe"
      );
      void browser.runtime.sendMessage({ type: 'top:enterCopyMode' });
      return;
    }

    this.showPopup();
  }

  exitCopyMode() {
    // As with enterCopyMode, we mirror the copyMode state in both iframe and
    // topmost window.
    this.copyState = { kind: 'inactive' };

    if (!this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'top:exitCopyMode' });
      return;
    }

    this.showPopup();
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
    this.showPopup();
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
      kanjiReferences: this.config.kanjiReferences,
      showKanjiComponents: this.config.showKanjiComponents,
    });

    void this.copyString(textToCopy!, copyType);
  }

  private getCopyEntry(): CopyEntry | null {
    if (this.copyState.kind !== 'active') {
      console.error('Expected to be in copy mode');
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
      this.copyState = { kind: 'inactive' };
      this.showPopup();
    }

    return copyEntry;
  }

  private async copyString(message: string, copyType: CopyType) {
    if (this.copyState.kind === 'inactive') {
      return;
    }

    const { index, mode } = this.copyState;
    try {
      await copyText(message);
      this.copyState = { kind: 'finished', type: copyType, index, mode };
    } catch (e) {
      console.error(e);
      this.copyState = { kind: 'error', index, mode };
    }

    this.showPopup();

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
  }: {
    currentElement?: Element | null;
  } = {}) {
    this.currentTextRange = undefined;
    this.currentPoint = undefined;
    this.lastMouseTarget = null;
    this.copyState = { kind: 'inactive' };

    if (
      this.isTopMostWindow() &&
      typeof this.currentLookupParams?.source === 'number'
    ) {
      const { source } = this.currentLookupParams;
      void browser.runtime.sendMessage({
        type: 'frame:clearTextHighlight',
        frameId: source,
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
    matchText,
    matchImages,
    point,
    eventElement,
    dictMode,
  }: {
    fromPuck: boolean;
    matchText: boolean;
    matchImages: boolean;
    point: Point;
    eventElement: Element;
    dictMode: 'default' | 'kanji';
  }) {
    const textAtPoint = getTextAtPoint({
      matchCurrency: !!this.config.fx,
      matchText,
      matchImages,
      point,
      maxLength: ContentHandler.MAX_LENGTH,
    });

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
      // We might have failed to find a match because we didn't have the
      // necessary keys held down.
      //
      // In that case, we still want to store the current point so that if those
      // keys are pressed later, we can show the pop-up immediately.
      if (!textAtPoint && (!matchText || !matchImages)) {
        this.currentPoint = point;
      }
      return;
    }

    if (!textAtPoint) {
      this.clearResult({ currentElement: eventElement });
      return;
    }

    this.currentPoint = point;
    this.currentTextRange = textAtPoint?.textRange || undefined;

    const lookupParams = {
      dictMode,
      meta: textAtPoint.meta,
      source: null,
      text: textAtPoint.text,
      targetProps: getTargetProps({
        fromPuck,
        target: eventElement,
        textRange: textAtPoint?.textRange || undefined,
      }),
      wordLookup: !!textAtPoint.textRange,
    };

    if (this.isTopMostWindow()) {
      void this.lookupText(lookupParams);
    } else {
      void browser.runtime.sendMessage({
        ...lookupParams,
        type: 'top:lookup',
        point,
        source: {
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
    source: number | null;
    targetProps: TargetProps;
    text: string;
    wordLookup: boolean;
  }) {
    this.currentLookupParams = { text, meta, wordLookup, source };

    // Presumably the text or dictionary has changed so break out of copy mode
    this.copyState = { kind: 'inactive' };

    const queryResult = await query(text, {
      includeRomaji: this.config.showRomaji,
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
          if (!queryResult.words) {
            // Prefer the names dictionary if we have a names result of more
            // than one character or if we have no kanji results.
            //
            // Otherwise, follow the usual fallback order words -> kanji ->
            // names.
            dict =
              (queryResult.names && queryResult.names.matchLen > 1) ||
              !queryResult.kanji
                ? 'names'
                : 'kanji';
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

  showDictionary(dictToShow: 'next' | MajorDataSeries) {
    if (!this.currentSearchResult) {
      return;
    }

    let dict: MajorDataSeries;

    if (dictToShow == 'next') {
      dict = this.currentDict;

      const cycleOrder: Array<MajorDataSeries> = ['words', 'kanji', 'names'];
      let next = (cycleOrder.indexOf(this.currentDict) + 1) % cycleOrder.length;
      while (cycleOrder[next] !== this.currentDict) {
        const nextDict = cycleOrder[next];
        if (this.currentSearchResult[nextDict]) {
          dict = nextDict;
          break;
        }
        next = ++next % cycleOrder.length;
      }
    } else {
      dict = dictToShow;
    }

    if (dict === this.currentDict) {
      return;
    }

    // The user has successfully switched dictionaries. If this is the first
    // time that's happened, store the result so we don't pester the user
    // with prompts about how to change dictionaries.
    if (!this.config.hasSwitchedDictionary) {
      try {
        // As elsewhere, we don't wait on the promise here since we're only
        // interested in catching synchronous errors which occur in some
        // browsers when the content script is old.
        void browser.runtime.sendMessage({ type: 'switchedDictionary' });
      } catch {
        console.log(
          '[10ten-ja-reader] Failed to call switchedDictionary. The page might need to be refreshed.'
        );
      }
      // Make sure this applies immediately
      this.config.hasSwitchedDictionary = true;
    }

    this.currentDict = dict;

    this.highlightTextForCurrentResult();
    this.showPopup();
  }

  highlightTextForCurrentResult() {
    const highlightLength = this.getHighlightLengthForCurrentResult();

    // Check we have something to highlight
    if (highlightLength < 1) {
      return;
    }

    if (typeof this.currentLookupParams?.source === 'number') {
      const { source } = this.currentLookupParams;
      void browser.runtime.sendMessage({
        type: 'frame:highlightText',
        frameId: source,
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

  showPopup() {
    if (!this.currentSearchResult && !this.currentLookupParams?.meta) {
      this.clearResult({ currentElement: this.lastMouseTarget });
      return;
    }

    const touchMode = isTouchDevice();

    const popupOptions: PopupOptions = {
      accentDisplay: this.config.accentDisplay,
      copyNextKey: this.config.keys.startCopy[0] || '',
      copyState: this.copyState,
      dictLang: this.config.dictLang,
      dictToShow: this.currentDict,
      fxData: this.config.fx,
      hasSwitchedDictionary: this.config.hasSwitchedDictionary,
      kanjiReferences: this.config.kanjiReferences,
      meta: this.currentLookupParams?.meta,
      onCancelCopy: () => this.exitCopyMode(),
      onStartCopy: (index: number) =>
        this.enterCopyMode({ mode: 'overlay', index }),
      onCopy: (copyType: CopyType) => this.copyCurrentEntry(copyType),
      onClosePopup: () => {
        this.clearResult({ currentElement: this.lastMouseTarget });
      },
      onShowSettings: () => {
        browser.runtime.sendMessage({ type: 'options' }).catch(() => {
          // Ignore
        });
      },
      onSwitchDictionary: (dict: MajorDataSeries) => {
        this.showDictionary(dict);
      },
      popupStyle: this.config.popupStyle,
      posDisplay: this.config.posDisplay,
      showDefinitions: !this.config.readingOnly,
      showKanjiComponents: this.config.showKanjiComponents,
      showPriority: this.config.showPriority,
      switchDictionaryKeys: this.config.keys.nextDictionary,
      tabDisplay: this.config.tabDisplay,
      touchMode,
    };

    const popup = renderPopup(this.currentSearchResult, popupOptions);
    if (!popup) {
      this.clearResult({ currentElement: this.lastMouseTarget });
      return;
    }

    // Inform the touch click tracker to ignore taps since the popup is now
    // showing.
    //
    // We can't simply check if the popup is visible when we get the touch click
    // callback since by that point we will already have hidden it.
    this.touchClickTracker.startIgnoringClicks();

    // Position the popup

    const safeArea = this.safeAreaProvider?.getSafeArea() || {
      top: 0,
      right: 0,
      left: 0,
      bottom: 0,
    };

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
      cursorClearance = {
        top: 0,
        right: 0,
        bottom: tooltipClearance,
        left: 0,
      };
    }

    // Add the first part of the matched text to the cursor clearance.
    //
    // We don't want to add _all_ of it since we might have a selection that
    // wraps lines and that would produce a massive area that would be too hard
    // to avoid.
    const { textBoxSizes } = this.currentTargetProps || {};
    if (textBoxSizes && this.currentPoint) {
      const bbox = getBestFitSize({
        sizes: textBoxSizes,
        length: this.getHighlightLengthForCurrentResult(),
      });
      if (bbox) {
        const cursorClearanceAsRect = addMarginToPoint(
          cursorClearance,
          this.currentPoint
        );
        const expandedClearance = union(bbox, cursorClearanceAsRect);
        cursorClearance = getMarginAroundPoint(
          this.currentPoint,
          expandedClearance
        );
      }
    }

    const popupSize = getPopupDimensions(popup);
    const {
      x: popupX,
      y: popupY,
      constrainWidth,
      constrainHeight,
    } = getPopupPosition({
      cursorClearance,
      isVerticalText: !!this.currentTargetProps?.isVerticalText,
      mousePos: this.currentPoint,
      positionMode: this.popupPositionMode,
      popupSize,
      safeArea,
      pointerType: this.currentTargetProps?.fromPuck ? 'puck' : 'cursor',
    });

    if (
      isSvgDoc(document) &&
      isSvgSvgElement(document.documentElement) &&
      isForeignObjectElement(popup.parentElement)
    ) {
      // Set the x/y attributes on the <foreignObject> wrapper after converting
      // to document space.
      const svg: SVGSVGElement = document.documentElement;
      const wrapper: SVGForeignObjectElement = popup.parentElement;
      wrapper.x.baseVal.value = popupX;
      wrapper.y.baseVal.value = popupY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const transform = svg.createSVGTransformFromMatrix(ctm.inverse());
        wrapper.transform.baseVal.initialize(transform);
      }
    } else {
      popup.style.setProperty('--left', `${popupX}px`);
      popup.style.setProperty('--top', `${popupY}px`);

      if (constrainWidth) {
        popup.style.setProperty('--max-width', `${constrainWidth}px`);
      } else {
        popup.style.removeProperty('--max-width');
      }

      // If we are showing the copy overlay, we don't constrain the height of
      // the popup since it may cause the buttons on the overlay to be clipped
      // or scrolled out of view.
      if (constrainHeight && !showOverlay(this.copyState)) {
        popup.style.setProperty('--max-height', `${constrainHeight}px`);
      } else {
        popup.style.removeProperty('--max-height');
      }
    }

    if (this.isTopMostWindow()) {
      void browser.runtime.sendMessage({ type: 'children:popupShown' });
    }
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

  // Expose the renderPopup callback so that we can test it
  _renderPopup = renderPopup;
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
    console.log(
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
  // - Ensure the background page is kept alive so long as we have an enabled
  //   tab when the background page is running as an event page.
  //
  let port: Browser.Runtime.Port | undefined;

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
          config: request.config as ContentConfig,
        });
        break;

      case 'disable':
        console.assert(request.frame === '*');
        disable();
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
    config: ContentConfig;
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
        port = browser.runtime.connect(undefined, {
          name: `tab-${tabId}`,
        });
      } catch (e) {
        console.error(e);
      }
    }

    browser.runtime
      .sendMessage({
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

export default ContentHandler;
