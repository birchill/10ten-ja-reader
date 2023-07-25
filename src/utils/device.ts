import { isIOS } from './ua-utils';

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

export function possiblyHasPhysicalKeyboard(): boolean {
  const desktopOsStrings = ['Windows', 'Win32', 'Win64', 'Mac', 'Linux'];

  return (
    // In general, if the device has a fine pointer (e.g. mouse) we assume
    // it also has a keyboard.
    window.matchMedia('(hover) and (pointer: fine)').matches ||
    // However, we've encountered at least one notebook device which returns
    // `any-pointer: coarse` and `any-hover: none` for its trackpad on Firefox.
    //
    // That seems to be a bug somewhere (at very least, a trackpad can hover)
    // in either Firefox or the OS/device driver, we shouldn't prevent users of
    // such a device from being able to configure the keyboard so we _also_
    // assume we have a keyboard when we're on an OS that we know to be
    // a desktop OS.
    (desktopOsStrings.some(
      (osString) => navigator.userAgent.indexOf(osString) !== -1
    ) &&
      // Exclude iOS, however, because the UA string there has "like Mac OS X"
      !isIOS())
  );
}

// Detect if the primary input means is capable of hovering. If it is NOT
// we show the puck by default.
//
// e.g. if we're on a laptop device that has a touchpad or mouse we generally
// _don't_ want to show the puck unless the user explicitly enables it.
// For a smartphone or tablet, however, we want to show the puck by default.
export function getHoverCapabilityMql(): MediaQueryList | undefined {
  // The undefined case here is just for the sake of our unit tests.
  return window.matchMedia ? window.matchMedia('(hover: hover)') : undefined;
}

export function getMouseCapabilityMql(): MediaQueryList | undefined {
  return window.matchMedia
    ? window.matchMedia('(hover: hover) and (pointer: fine)')
    : undefined;
}
