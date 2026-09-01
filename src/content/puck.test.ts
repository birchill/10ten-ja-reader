// @vitest-environment jsdom
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { LookupPuck as LookupPuckClass } from './puck';
import type { SafeAreaProvider } from './safe-area-provider';

vi.mock('../utils/ua-utils', () => ({ isIOS: () => true }));

declare global {
  var browser: any;
  var chrome: any;
}

describe('LookupPuck tap handling on iOS', () => {
  let LookupPuck: typeof LookupPuckClass;
  let LookupPuckId: string;
  let previousBrowserObject: any;
  let previousChromeObject: any;
  let previousPointerEvent: typeof PointerEvent;

  let subject: LookupPuckClass;
  let puckElement: HTMLDivElement;

  beforeAll(async () => {
    previousPointerEvent = globalThis.PointerEvent;
    globalThis.PointerEvent = class extends MouseEvent {
      readonly pointerId: number;

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
      }
    } as typeof PointerEvent;

    previousChromeObject = globalThis.chrome;
    globalThis.chrome = { runtime: { id: 'test' } };

    previousBrowserObject = globalThis.browser;
    globalThis.browser = {
      storage: { local: { get: async () => ({}), set: async () => {} } },
    };

    ({ LookupPuck, LookupPuckId } = await import('./puck'));
  });

  afterAll(() => {
    globalThis.PointerEvent = previousPointerEvent;
    globalThis.browser = previousBrowserObject;
    globalThis.chrome = previousChromeObject;
  });

  beforeEach(() => {
    vi.useFakeTimers();

    subject = new LookupPuck({
      initialPosition: {
        x: 0,
        y: 0,
        orientation: { readingDirection: 'horizontal', moonSide: 'above' },
      },
      safeAreaProvider: makeSafeAreaProvider(),
      onLookupDisabled: () => {},
      onPuckStateChanged: () => {},
      handedness: 'unset',
      toolbarIcon: 'default',
      theme: 'blue',
      fontSize: 'normal',
      fontFace: 'system',
    });
    subject.render();
    subject.setEnabledState('active');

    const container = document.getElementById(LookupPuckId);
    puckElement = container!.shadowRoot!.querySelector('.puck')!;
    puckElement.setPointerCapture = vi.fn<(pointerId: number) => void>();
  });

  afterEach(() => {
    subject.unmount();
    vi.useRealTimers();
  });

  it('cancels compatibility mouse events from a handled pointer tap', () => {
    dispatchPointerTap(1);
    const { mouseDown, mouseUp } = dispatchMouseTap(1);

    vi.advanceTimersByTime(300);

    expect(mouseDown.defaultPrevented).toBe(true);
    expect(mouseUp.defaultPrevented).toBe(true);
    expect(subject.getEnabledState()).toBe('inactive');
    expect(subject.getTargetOrientation()).toEqual({
      readingDirection: 'horizontal',
      moonSide: 'above',
    });
  });

  it('uses mouse events when iOS swallows the second pointer tap', () => {
    dispatchPointerTap(1);
    dispatchMouseTap(2);

    expect(subject.getEnabledState()).toBe('active');
    expect(subject.getTargetOrientation()).toEqual({
      readingDirection: 'horizontal',
      moonSide: 'below',
    });
  });

  function dispatchPointerTap(pointerId: number) {
    puckElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId,
      })
    );
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId,
      })
    );
  }

  function dispatchMouseTap(detail: number) {
    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      detail,
    });
    puckElement.dispatchEvent(mouseDown);

    const mouseUp = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      detail,
    });
    puckElement.dispatchEvent(mouseUp);

    return { mouseDown, mouseUp };
  }
});

function makeSafeAreaProvider(): SafeAreaProvider {
  return {
    getSafeArea: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as SafeAreaProvider;
}
