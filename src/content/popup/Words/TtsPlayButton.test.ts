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

    // Clicking during loading cancels it, so the label has to say so before
    // the glyph catches up.
    act(() => publish(loading()));
    expect(button.getAttribute('aria-label')).toBe(
      'content_stop_readings_label'
    );

    act(() => publish(playing()));
    expect(button.getAttribute('aria-label')).toBe(
      'content_stop_readings_label'
    );

    expect(button.hasAttribute('aria-pressed')).toBe(false);
  });

  it('flips the glyph to stop only once playback actually starts', () => {
    const { path, publish } = mount();
    const playPath = path.getAttribute('d');

    act(() => publish(loading()));
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

  it('scans the glyph while loading', () => {
    const { glyphClass, publish } = mount();

    act(() => publish(loading()));
    act(() => {
      vi.advanceTimersByTime(LOADING_DEFER_MS);
    });

    expect(glyphClass()).toContain('scan-line');
  });

  it('dims the glyph while loading when animation is unavailable', () => {
    prefersReducedMotion();
    const { glyphClass, publish } = mount();

    expect(glyphClass()).toContain('opacity-60');

    act(() => publish(loading()));
    act(() => {
      vi.advanceTimersByTime(LOADING_DEFER_MS);
    });

    expect(glyphClass()).toContain('opacity-30');
    expect(glyphClass()).not.toContain('scan-line');
    // The pointer is still on the button after the click that started this,
    // so a hover override here would hide the only feedback there is.
    expect(glyphClass()).not.toContain('group-hover/tts:opacity-100');
  });

  it('ignores state published for a different entry', () => {
    const { button, publish } = mount({ entryIndex: 1 });

    act(() => publish(playing()));

    expect(button.getAttribute('aria-label')).toBe(
      'content_play_readings_label'
    );
  });

  it('keeps one live region mounted and only fills it while the error lasts', () => {
    const { container, button, publish } = mount();

    const status = container.querySelector('[role="status"]')!;
    expect(status).not.toBeNull();
    expect(status.textContent).toBe('');
    expect(status.getAttribute('lang')).toBe('en');

    act(() => publish(errored()));
    expect(container.querySelector('[role="status"]')).toBe(status);
    expect(status.textContent).toBe('content_play_readings_error');
    expect(button.getAttribute('aria-label')).toBe(
      'content_play_readings_label'
    );

    act(() => publish(playing()));
    expect(container.querySelector('[role="status"]')).toBe(status);
    expect(status.textContent).toBe('');
  });

  it('clears the error badge when the next attempt starts loading', () => {
    const { container, publish } = mount();

    act(() => publish(errored()));
    expect(container.querySelector('.tts-error-badge')).not.toBeNull();

    act(() => publish(loading()));
    expect(container.querySelector('.tts-error-badge')).toBeNull();
  });

  it('shows the stop glyph on the very first paint when the controller already reports playing', () => {
    const controller: TtsPlayButtonProps['controller'] = {
      state: playing(),
      subscribe: () => () => {},
      toggle: () => {},
    };
    const container = document.createElement('div');
    document.body.append(container);

    // Not wrapped in act(): this must hold true from the synchronous
    // render, before the subscribe effect has had a chance to run.
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
