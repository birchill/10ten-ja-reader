export function getScrollOffset(): { scrollX: number; scrollY: number } {
  // If we're in full screen mode, we should use the scroll position of the
  // full-screen element (which is always zero?).
  if (document.fullscreenElement) {
    return {
      scrollX: document.fullscreenElement.scrollLeft,
      scrollY: document.fullscreenElement.scrollTop,
    };
  }

  const { scrollX, scrollY } = document.defaultView!;
  return { scrollX, scrollY };
}
