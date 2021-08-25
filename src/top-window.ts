// There are certain of cases where the actual topmost window might not have
// the content script running such as:
//
// 1. When the topmost window is a restricted domain like addons.mozilla.org.
// 2. When the topmost window is an extension page for another extension (e.g.
//    LiveTL).
//
// Unfortunately, it's not easy to detect these cases since in these cases the
// topmost window will be cross-origin so we can't read its URL.
//
// Instead, we have to just ping the window and see if it responds.
//
// That's flaky and we really don't want to do async work every time we need to
// find the topmost window so we do this lookup out-of-band and just return
// our best guess in the meantime.

import { isMessageSourceWindow } from './dom-utils';
import { isObject } from './is-object';
import { requestIdleCallback } from './request-idle-callback';

// Initially assume the actual topmost window has the content script running
// since this is the most common case.
let topMostWindow: Window = window.top;
let gotResponse = false;

// Respond to ping messages from descendants who want to know if we are
// running the content script or not and update our state if we get a pong
// message.
window.addEventListener('message', (event) => {
  if (isObject(event) && isMessageSourceWindow(event.source)) {
    if (event.data === '10ten(ja):ping') {
      event.source.postMessage('10ten(ja):pong', event.origin);
    } else if (event.data === '10ten(ja):pong') {
      topMostWindow = event.source;
      gotResponse = true;
    }
  }
});

async function lookupTopMostWindow() {
  // Common case: if we are the topmost window then we know for absolute certain
  // the content script is running there!
  if (window.self === window.top) {
    topMostWindow = window.self;
    return;
  }

  // Also fairly common case: if the topmost window is same-origin then it
  // _should_ be running the content script. It's hard to imagine a scenario
  // where we got the content script and it didn't.
  try {
    if (window.location.origin === window.top.location.origin) {
      topMostWindow = window.top;
      return;
    }
  } catch (_e) {
    // Ignore: We likely got a security exception because the topmost window is
    // cross-origin.
  }

  // Otherwise we have to ping each of our ancestors from the top-down to see
  // who responds.

  // First get our chain of ancestor windows.
  const ancestorWindows: Array<Window> = [];
  let current: Window = window.self;
  // (Be very careful here because window === window.parent for the topmost
  // window, not null as you might expect.)
  while (current !== current.parent) {
    current = current.parent;
    ancestorWindows.push(current);
  }

  // Arrange the chain from top-to-bottom.
  ancestorWindows.reverse();

  // Ping each ancestor and wait for it to respond.
  gotResponse = false;
  for (const ancestorWindow of ancestorWindows.reverse()) {
    ancestorWindow.postMessage('10ten(ja):ping', '*');

    // Wait a second or two for a response before trying the next one.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (gotResponse) {
      return;
    }
  }

  // If we got here, no one answered so we are the top-most window.
  topMostWindow = window.self;
}

// Trigger the lookup sometime after the page has settled down.
requestIdleCallback(
  () => {
    lookupTopMostWindow();
  },
  { timeout: 4000 }
);

export function getTopMostWindow(): Window {
  return topMostWindow;
}

export function isTopMostWindow(): boolean {
  return window.self === getTopMostWindow();
}
