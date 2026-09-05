import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TtsButtonState } from './use-deferred-loading';
import { LOADING_DEFER_MS, useDeferredLoading } from './use-deferred-loading';

/**
 * @vitest-environment jsdom
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('useDeferredLoading', () => {
  it('hides short loading attempts and starts a fresh loading delay', () => {
    const view = mount();

    view.publish('loading');
    view.advance(LOADING_DEFER_MS - 1);
    expect(view.state()).toBe('idle');

    view.publish('playing');
    expect(view.state()).toBe('playing');
    view.advance(2);
    view.publish('loading');
    expect(view.state()).toBe('idle');

    view.advance(LOADING_DEFER_MS - 1);
    expect(view.state()).toBe('idle');
    view.advance(1);
    expect(view.state()).toBe('loading');
  });

  it('shows loading after the loading delay', () => {
    const view = mount();

    view.publish('loading');
    view.advance(LOADING_DEFER_MS);

    expect(view.state()).toBe('loading');
  });
});

function mount() {
  const container = document.createElement('div');
  document.body.append(container);

  function Harness({ kind }: { kind: TtsButtonState }) {
    return h('span', null, useDeferredLoading(kind));
  }

  act(() => {
    render(h(Harness, { kind: 'idle' }), container);
  });

  return {
    state: () => container.textContent,
    publish: (kind: TtsButtonState) =>
      act(() => {
        render(h(Harness, { kind }), container);
      }),
    advance: (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms);
      }),
  };
}
