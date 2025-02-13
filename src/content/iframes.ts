import browser from 'webextension-polyfill';

import { Point } from '../utils/geometry';
import { WithRequired } from '../utils/type-helpers';

export type IframeSearchParams = {
  frameId?: number;
  initialSrc?: string;
  currentSrc?: string;
  dimensions?: { width: number; height: number };
};

// As with IframeSearchParams but will a few members marked not optional
export type IframeSourceParams = WithRequired<
  IframeSearchParams,
  'frameId' | 'currentSrc' | 'dimensions'
>;

export function findIframeElement(
  params: IframeSearchParams
): HTMLIFrameElement | HTMLFrameElement | undefined {
  // First collect together all the iframes we can.
  const iframes = getIframes(document);
  if (!iframes.length) {
    return undefined;
  }
  if (iframes.length === 1) {
    return iframes[0];
  }

  // Look for an iframe that matches on frameId
  if (typeof params.frameId === 'number') {
    // Use the getFrameId API if available
    //
    // If it is available, we treat this as definitive since, at least in
    // Firefox, it should work for cross-origin iframes, unlike when using the
    // data attribute.
    if (typeof browser.runtime.getFrameId === 'function') {
      return iframes.find(
        (iframe) => browser.runtime.getFrameId(iframe) === params.frameId
      );
    }

    // Otherwise look for a frameId stored in a data attribute
    const frameIdMatch = iframes.find(
      (f) => f.dataset.frameId === String(params.frameId)
    );
    if (frameIdMatch) {
      return frameIdMatch;
    }
  }

  // Then try to narrow the list by matches on initialSrc or currentSrc
  let candidates = iframes.filter(
    (f) => f.src && (f.src === params.initialSrc || f.src === params.currentSrc)
  );
  if (!candidates.length) {
    candidates = iframes;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  // We have multiple candidates, so try to sort by those with the closest
  // dimensions.
  if (params.dimensions) {
    candidates.sort((a, b) => {
      const aDimensions = getIframeDimensions(a);
      const aDiff =
        Math.abs(params.dimensions!.width - aDimensions.width) +
        Math.abs(params.dimensions!.height - aDimensions.height);

      const bDimensions = getIframeDimensions(b);
      const bDiff =
        Math.abs(params.dimensions!.width - bDimensions.width) +
        Math.abs(params.dimensions!.height - bDimensions.height);

      return aDiff - bDiff;
    });
  }

  return candidates[0];
}

function getIframes(
  doc: Document
): Array<HTMLIFrameElement | HTMLFrameElement> {
  const iframes = [
    ...doc.getElementsByTagName('iframe'),
    ...doc.getElementsByTagName('frame'),
  ];

  // For same-origin iframes, fetch their child iframe elements recursively.
  for (const iframe of iframes) {
    // If we try to access iframe.contentDocument and it's cross-origin,
    // Safari will print an error to the console. In fact, even if we just use
    // `typeof iframe.contentDocument` it will print the same message.
    //
    // Inspecting the contentWindow doesn't seem to provide any clues either.
    //
    // However, if we try to access `iframe.contentWindow.frameElement` it
    // will throw a SecurityError which we can detect and it won't print
    // anything to the console.
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      iframe.contentWindow?.frameElement;
    } catch {
      continue;
    }

    if (iframe.contentDocument) {
      iframes.push(...getIframes(iframe.contentDocument));
    }
  }

  return iframes;
}

function getIframeDimensions(elem: HTMLIFrameElement | HTMLFrameElement): {
  width: number;
  height: number;
} {
  // In order to get dimensions that will correspond with the innerHeight /
  // innerWidth that the iframe sees on its document element we should use the
  // offsetWidth / offsetHeight and subtract and borders and padding.
  const cs = getComputedStyle(elem);
  const width =
    elem.offsetWidth -
    parseFloat(cs.paddingLeft) -
    parseFloat(cs.paddingRight) -
    parseFloat(cs.borderLeftWidth) -
    parseFloat(cs.borderRightWidth);
  const height =
    elem.offsetHeight -
    parseFloat(cs.paddingTop) -
    parseFloat(cs.paddingBottom) -
    parseFloat(cs.borderTopWidth) -
    parseFloat(cs.borderBottomWidth);

  return { width, height };
}

let cachedOrigin:
  | {
      iframe: HTMLIFrameElement | HTMLFrameElement;
      origin: Point;
      resizeObserver: ResizeObserver;
    }
  | undefined;

export function getIframeOrigin(
  iframeElement: HTMLIFrameElement | HTMLFrameElement
): Point {
  if (cachedOrigin?.iframe === iframeElement) {
    return cachedOrigin.origin;
  } else if (cachedOrigin) {
    cachedOrigin.resizeObserver.disconnect();
    cachedOrigin = undefined;
  }

  const resizeObserver = new ResizeObserver(() => {
    cachedOrigin = undefined;
    resizeObserver.disconnect();
  });

  let x = 0;
  let y = 0;

  let currentIframe: HTMLIFrameElement | HTMLFrameElement | null =
    iframeElement;
  let iterationCount = 0;
  while (currentIframe && iterationCount < 20) {
    // I don't _think_ you can ever have circular references of iframes but just
    // in case, we'll limit the number of iterations.
    iterationCount++;

    let { left: currentX, top: currentY } =
      currentIframe.getBoundingClientRect();

    // The bounding client rect includes the element and its borders and padding.
    // However, the coordinates within the iframe are minus the borders and
    // padding.
    //
    // Note that if these values change, the ResizeObserver _should_ fire because
    // it is supposed to fire when either the iframe's border box _or_ content box
    // size changes.
    const cs = getComputedStyle(currentIframe);
    currentX += parseFloat(cs.borderLeftWidth);
    currentY += parseFloat(cs.paddingLeft);
    currentX += parseFloat(cs.borderTopWidth);
    currentY += parseFloat(cs.paddingTop);

    x += currentX;
    y += currentY;

    resizeObserver.observe(currentIframe);

    // See if there are parent iframes we need to account for.
    try {
      const parentIframe: Element | null | undefined =
        currentIframe.ownerDocument.defaultView?.frameElement;
      if (
        parentIframe instanceof HTMLIFrameElement ||
        parentIframe instanceof HTMLFrameElement
      ) {
        currentIframe = parentIframe;
      } else {
        currentIframe = null;
      }
    } catch {
      currentIframe = null;
    }
  }

  cachedOrigin = { iframe: iframeElement, origin: { x, y }, resizeObserver };

  return cachedOrigin.origin;
}

// Called from within an iframe, returns the window dimensions using a size that
// should match the size we expect when expecting the <iframe> element from its
// parent.
export function getWindowDimensions(): { width: number; height: number } {
  if (document.compatMode === 'BackCompat') {
    return {
      width: document.body?.clientWidth ?? window.innerWidth,
      height: document.body?.clientHeight ?? window.innerHeight,
    };
  } else {
    return { width: window.innerWidth, height: window.innerHeight };
  }
}
