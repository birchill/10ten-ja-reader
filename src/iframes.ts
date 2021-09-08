import { Point } from './geometry';

let cachedOrigin:
  | { window: Window; origin: Point; resizeObserver: ResizeObserver }
  | undefined;

export function getIframeOriginFromWindow(iframeWindow: Window): Point | null {
  if (cachedOrigin?.window === iframeWindow) {
    return cachedOrigin.origin;
  } else if (cachedOrigin) {
    cachedOrigin.resizeObserver.disconnect();
    cachedOrigin = undefined;
  }

  const iframeElement = getIframeElementFromWindow(iframeWindow);
  if (!iframeElement) {
    return null;
  }

  const { left: x, top: y } = iframeElement.getBoundingClientRect();

  const resizeObserver = new ResizeObserver(() => {
    cachedOrigin = undefined;
    resizeObserver.disconnect();
  });

  resizeObserver.observe(iframeElement);

  cachedOrigin = {
    window: iframeWindow,
    origin: { x, y },
    resizeObserver,
  };

  return cachedOrigin.origin;
}

export function getIframeElementFromWindow(
  iframeWindow: Window
): HTMLIFrameElement | null {
  // For same origin iframes we can just use the `frameElement` property.
  try {
    const embeddingElement = iframeWindow.frameElement;
    // We can't use instanceof HTMLIFrameElement here because on Safari,
    // depending on which iframe is in focus, that will sometimes fail.
    return embeddingElement?.tagName === 'IFRAME'
      ? (embeddingElement as HTMLIFrameElement)
      : null;
  } catch (e) {
    // Ignore
  }

  // For cross-origin iframe we need to look through all the <iframe> elements
  // and find one with a matching contentWindow
  const iframeElements = document.getElementsByTagName('iframe');
  return (
    Array.from(iframeElements).find(
      (iframe) => iframe.contentWindow === iframeWindow
    ) || null
  );
}

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
      ? iframes.find((f) => f.dataset.frameId === params.frameId)
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

  if (!candidates.length) {
    return null;
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

let cachedOriginForIframeElement:
  | { iframe: HTMLIFrameElement; origin: Point; resizeObserver: ResizeObserver }
  | undefined;

export function getIframeOrigin(iframeElement: HTMLIFrameElement): Point {
  if (cachedOriginForIframeElement?.iframe === iframeElement) {
    return cachedOriginForIframeElement.origin;
  } else if (cachedOriginForIframeElement) {
    cachedOriginForIframeElement.resizeObserver.disconnect();
    cachedOriginForIframeElement = undefined;
  }

  const { left: x, top: y } = iframeElement.getBoundingClientRect();

  const resizeObserver = new ResizeObserver(() => {
    cachedOriginForIframeElement = undefined;
    resizeObserver.disconnect();
  });

  resizeObserver.observe(iframeElement);

  cachedOriginForIframeElement = {
    iframe: iframeElement,
    origin: { x, y },
    resizeObserver,
  };

  return cachedOriginForIframeElement.origin;
}
