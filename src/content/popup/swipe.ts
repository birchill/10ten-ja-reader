type HorizontalSwipeDirection = 'right' | 'left';

export function onHorizontalSwipe(
  element: HTMLElement,
  handler: (swipeDirection: HorizontalSwipeDirection) => void
) {
  // Min x distance traveled to be considered swipe
  const xMinThreshold = 50;
  // Max y distance that can be traveled before
  // it's no longer considered a horizontal swipe
  const yMaxThreshold = 100;
  // Max time allowed to travel that distance
  const allowedTime = 200;

  let startTime = 0;
  let startX: number;
  let startY: number;

  element.addEventListener(
    'touchstart',
    function (e) {
      startX = e.changedTouches[0].pageX;
      startY = e.changedTouches[0].pageY;
      startTime = performance.now();
    },
    false
  );

  element.addEventListener(
    'touchend',
    function (e) {
      const touch = e.changedTouches[0];
      const deltaX = touch.pageX - startX;
      const deltaY = touch.pageY - startY;
      const elapsedTime = performance.now() - startTime;

      // Check that elapsed time is within specified, horizontal dist
      // traveled >= threshold, and vertical dist traveled <= 100
      const isSwipe =
        elapsedTime <= allowedTime &&
        Math.abs(deltaX) >= xMinThreshold &&
        Math.abs(deltaY) <= yMaxThreshold;
      if (isSwipe) {
        handler(deltaX < 0 ? 'right' : 'left');
      }
    },
    false
  );
}
