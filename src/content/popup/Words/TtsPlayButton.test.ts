import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TtsPlaybackState } from '../../tts-playback-controller';

import { LOADING_DEFER_MS } from '../hooks/use-deferred-loading';
import { STOP_PATH } from '../play-stop-paths';

import { TtsPlayButton, type TtsPlayButtonProps } from './TtsPlayButton';

/**
 * @vitest-environment jsdom
 */

vi.mock('../../../common/i18n', () => ({
  useLocale: () => ({ t: (key: string) => key, langTag: 'en' }),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'matchMedia',
    vi
      .fn()
      .mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('TtsPlayButton', () => {
  it('labels itself with the action the next click performs', () => {
    const { button, publish } = mount();

    expect(button.getAttribute('aria-label')).toBe(
      'content_play_readings_label'
    );
    expect(button.getAttribute('title')).toBe('content_play_readings_label');

    act(() => publish(loading()));
    expect(button.getAttribute('aria-label')).toBe(
      'content_stop_readings_label'
    );

    act(() => publish(playing()));
    expect(button.getAttribute('aria-label')).toBe(
      'content_stop_readings_label'
    );
  });

  it('flips the glyph to stop only once playback actually starts', () => {
    const { path, publish } = mount();
    const playPath = path.getAttribute('d');

    act(() => publish(loading()));
    expect(path.getAttribute('d')).toBe(playPath);

    act(() => {
      vi.advanceTimersByTime(LOADING_DEFER_MS);
    });
    expect(path.getAttribute('d')).toBe(playPath);

    act(() => publish(playing()));
    expect(path.getAttribute('d')).toBe(STOP_PATH);
  });

  it('holds the stop glyph across a loading gap between readings', () => {
    const { path, publish } = mount();

    act(() => publish(playing()));
    act(() => publish(loading(1, true)));
    expect(path.getAttribute('d')).toBe(STOP_PATH);
  });

  it('adds scan styles after the loading delay', () => {
    const { glyphClass, publish } = mount();

    act(() => publish(loading()));
    expect(glyphClass()).not.toContain('scan-line');
    expect(glyphClass()).not.toContain('animate-[scan-up_0.7s_infinite]');

    act(() => {
      vi.advanceTimersByTime(LOADING_DEFER_MS);
    });

    expect(glyphClass()).toContain('scan-line');
    expect(glyphClass()).toContain('animate-[scan-up_0.7s_infinite]');
  });

  it('selects dimmed, no-animation styles for reduced motion', () => {
    prefersReducedMotion();
    const { glyphClass, publish } = mount();

    act(() => publish(loading()));
    act(() => {
      vi.advanceTimersByTime(LOADING_DEFER_MS);
    });

    expect(glyphClass()).toContain('opacity-30');
    expect(glyphClass()).not.toContain('scan-line');
    expect(glyphClass()).not.toContain('animate-[scan-up_0.7s_infinite]');
    expect(glyphClass()).not.toContain('group-hover/tts:opacity-100');
  });

  it('ignores state published for a different entry', () => {
    const { button, publish } = mount({ entryIndex: 1 });

    act(() => publish(playing()));

    expect(button.getAttribute('aria-label')).toBe(
      'content_play_readings_label'
    );
  });

  it('keeps one live region and clears error feedback on the next attempt', () => {
    const { container, publish } = mount();

    const status = container.querySelector('[role="status"]')!;
    expect(status).not.toBeNull();
    expect(status.textContent).toBe('');
    expect(status.getAttribute('lang')).toBe('en');

    act(() => publish(errored()));
    expect(container.querySelector('[role="status"]')).toBe(status);
    expect(status.textContent).toBe('content_play_readings_error');
    expect(container.querySelector('.tts-error-badge')).not.toBeNull();

    act(() => publish(loading()));
    expect(container.querySelector('[role="status"]')).toBe(status);
    expect(status.textContent).toBe('');
    expect(container.querySelector('.tts-error-badge')).toBeNull();

    act(() => publish(playing()));
    expect(container.querySelector('[role="status"]')).toBe(status);
    expect(status.textContent).toBe('');
  });

  it('shows the stop glyph on the very first paint when the controller already reports playing', () => {
    const controller: TtsPlayButtonProps['controller'] = {
      state: playing(),
      subscribe: () => () => {},
      toggle: () => {},
    };
    const container = document.createElement('div');
    document.body.append(container);

    // Omit `act()` to check the synchronous render before the subscription effect runs.
    render(h(TtsPlayButton, { controller, entryIndex: 0 }), container);

    const button = container.querySelector('button')!;
    const path = container.querySelector('path')!;
    expect(button.getAttribute('aria-label')).toBe(
      'content_stop_readings_label'
    );
    expect(path.getAttribute('d')).toBe(STOP_PATH);
  });
});

function mount(overrides: Partial<TtsPlayButtonProps> = {}) {
  let listener: ((state: TtsPlaybackState) => void) | undefined;
  let currentState: TtsPlaybackState = { kind: 'idle' };

  const controller: TtsPlayButtonProps['controller'] = {
    get state() {
      return currentState;
    },
    subscribe: (l) => {
      listener = l;
      l(currentState);
      return () => {
        listener = undefined;
      };
    },
    toggle: () => {},
  };

  const props: TtsPlayButtonProps = { controller, entryIndex: 0, ...overrides };

  const container = document.createElement('div');
  document.body.append(container);
  act(() => {
    render(h(TtsPlayButton, props), container);
  });

  const glyph = () => container.querySelectorAll('svg')[0]!;

  return {
    container,
    button: container.querySelector('button')!,
    path: glyph().querySelector('path')!,
    glyphClass: () => glyph().getAttribute('class') ?? '',
    publish: (state: TtsPlaybackState) => {
      currentState = state;
      listener?.(state);
    },
  };
}

function loading(readingIndex = 0, audioStarted = false): TtsPlaybackState {
  return { kind: 'loading', activeEntryIndex: 0, readingIndex, audioStarted };
}

function playing(readingIndex = 0): TtsPlaybackState {
  return { kind: 'playing', activeEntryIndex: 0, readingIndex, startedAt: 100 };
}

function prefersReducedMotion() {
  vi.stubGlobal(
    'matchMedia',
    vi
      .fn()
      .mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }))
  );
}

function errored(): TtsPlaybackState {
  return { kind: 'error', activeEntryIndex: 0 };
}
