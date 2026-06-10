export function isFirefox(): boolean {
  return navigator.userAgent.indexOf('Firefox/') !== -1;
}

export function isFenix(): boolean {
  return isFirefox() && navigator.userAgent.indexOf('Android') !== -1;
}

export function isChromium(): boolean {
  return (
    navigator.userAgent.indexOf('Chrome/') !== -1 ||
    navigator.userAgent.indexOf('Chromium/') !== -1
  );
}

export function isEdge(): boolean {
  return navigator.userAgent.indexOf('Edg/') !== -1;
}

export function isSafari(): boolean {
  return navigator.userAgent.indexOf('Safari/') !== -1 && !isChromium();
}

export function isMac(): boolean {
  return /^Mac/i.test(navigator.platform);
}

export function isIOS(): boolean {
  return (
    [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod',
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}

/** @public */
export function isThunderbird(): boolean {
  return navigator.userAgent.indexOf('Thunderbird/') !== -1;
}

/**
 * Return the major Firefox version parsed from navigator.userAgent, or 0
 * if Firefox is not detected or the version can't be parsed.
 */
export function getFirefoxMajorVersion(): number {
  const match = navigator.userAgent.match(/\bFirefox\/(\d+)/);
  return match ? Number(match[1]) : 0;
}
