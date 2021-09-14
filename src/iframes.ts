import { Point } from './geometry';

export type IframeSearchParams = {
  frameId?: number;
  initialSrc?: string;
  currentSrc?: string;
  dimensions?: {
    width: number;
    height: number;
  };
};

export function findIframeElement(
  params: IframeSearchParams
): HTMLIFrameElement | null {
  // First collect together all the iframes we can.
  const iframes = getIframes(document);
  if (!iframes.length) {
    return null;
  }
  if (iframes.length === 1) {
    return iframes[0];
  }

  // Look for an iframe that matches on frameId
  const frameIdMatch =
    typeof params.frameId === 'number'
      ? iframes.find((f) => f.dataset.frameId === String(params.frameId))
      : undefined;
  if (frameIdMatch) {
    return frameIdMatch;
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

function getIframes(doc: Document): Array<HTMLIFrameElement> {
  const iframes = Array.from(doc.getElementsByTagName('iframe'));

  // For same-origin iframes, fetch their child iframe elements recursively.
  for (let iframe of iframes) {
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

function getIframeDimensions(elem: HTMLIFrameElement): {
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
  | { iframe: HTMLIFrameElement; origin: Point; resizeObserver: ResizeObserver }
  | undefined;

export function getIframeOrigin(iframeElement: HTMLIFrameElement): Point {
  if (cachedOrigin?.iframe === iframeElement) {
    return cachedOrigin.origin;
  } else if (cachedOrigin) {
    cachedOrigin.resizeObserver.disconnect();
    cachedOrigin = undefined;
  }

  const { left: x, top: y } = iframeElement.getBoundingClientRect();

  const resizeObserver = new ResizeObserver(() => {
    cachedOrigin = undefined;
    resizeObserver.disconnect();
  });

  resizeObserver.observe(iframeElement);

  cachedOrigin = {
    iframe: iframeElement,
    origin: { x, y },
    resizeObserver,
  };

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
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
}
