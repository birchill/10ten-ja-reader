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
  it('never surfaces a loading burst that ends before the defer elapses', () => {
    const view = mount();

    view.publish('loading');
    view.advance(LOADING_DEFER_MS - 1);
    expect(view.state()).toBe('idle');

    view.publish('playing');
    expect(view.state()).toBe('playing');
  });

  it('surfaces loading once it outlasts the defer', () => {
    const view = mount();

    view.publish('loading');
    view.advance(LOADING_DEFER_MS);

    expect(view.state()).toBe('loading');
  });

  it('restarts the defer for a second loading state', () => {
    const view = mount();

    view.publish('loading');
    view.advance(LOADING_DEFER_MS);
    view.publish('playing');

    view.publish('loading');
    expect(view.state()).toBe('idle');

    view.advance(LOADING_DEFER_MS);
    expect(view.state()).toBe('loading');
  });

  it('passes settled states straight through', () => {
    const view = mount();

    view.publish('error');
    expect(view.state()).toBe('error');

    view.publish('idle');
    expect(view.state()).toBe('idle');
  });
});

function mount(initialKind: TtsButtonState = 'idle') {
  const container = document.createElement('div');
  document.body.append(container);

  function Harness({ kind }: { kind: TtsButtonState }) {
    return h('span', null, useDeferredLoading(kind));
  }

  act(() => {
    render(h(Harness, { kind: initialKind }), container);
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
