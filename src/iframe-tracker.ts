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
    return embeddingElement instanceof HTMLIFrameElement
      ? embeddingElement
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
