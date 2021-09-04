export function isTouchDevice(): boolean {
  if (window.PointerEvent && 'maxTouchPoints' in navigator) {
    return navigator.maxTouchPoints > 0;
  }

  if (window.matchMedia && window.matchMedia('(any-pointer:coarse)').matches) {
    return true;
  }

  // The following will give a false positive in Chrome desktop but hopefully
  // one of the above checks will cover us there.
  return 'TouchEvent' in window;
}

export function probablyHasPhysicalKeyboard(): boolean {
  // Unfortunately, there's no good media query for this yet.
  //
  //   https://github.com/w3c/csswg-drafts/issues/3871
  //
  // One approach we _could_ try is to see if we are a mobile touchscreen
  // device, and if we're NOT, assume we have a keyboard.
  //
  // Browsers pretend they don't support touch events for touchscreen desktops
  // when you use certain legacy touch event handlers to feature detect. See:
  //
  //   https://groups.google.com/a/chromium.org/forum/#!msg/blink-dev/KV6kqDJpYiE/YFM28ZNBBAAJ
  //   https://bugzilla.mozilla.org/show_bug.cgi?id=1412485
  //   https://github.com/w3c/touch-events/issues/64
  //
  // (But note there are browser-specific differences such as Firefox reporting
  // false for 'TouchEvent' in window on non-touch devices while Chrome reports
  // true.)
  //
  // So we could exploit that to filter out touchscreen mobile devices. However,
  // that's not going to work properly for feature phones like KaiOS that are
  // mobile but don't have a proper keyboard.
  //
  // Instead, we test for a mouse-like device, and if we have one, assume we also
  // have a keyboard. It's not right, but it should work for most devices until
  // the CSSWG gets around to speccing something for this.
  //
  // This approach also happens to work when we enable touch simulation (and
  // reload) in Firefox DevTools.
  //
  // For Chrome/Edge we could possibly check for navigator.keyboard but other
  // browsers are unlikely to implement this API because it's a fingerprinting
  // nightmare and as it stands the spec does not define what we should expect
  // the value of this property to be for a device without a physical keyboard.
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

// Detect if the primary input means is capable of hovering. If it is NOT
// we show the puck by default.
//
// e.g. if we're on a laptop device that has a touchpad or mouse we generally
// _don't_ want to show the puck unless the user explicitly enables it.
// For a smartphone or tablet, however, we want to show the puck by default.
export function getHoverCapabilityMql(): MediaQueryList {
  return window.matchMedia('(hover: hover)');
}
