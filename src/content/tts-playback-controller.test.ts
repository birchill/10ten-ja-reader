import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  MoraTimingData,
  TtsClip,
  TtsClipRequest,
} from '../common/tts/tts-request';

import type { TtsEntry, TtsPlaybackState } from './tts-playback-controller';
import { TtsPlaybackController } from './tts-playback-controller';
import { preparePlayback } from './tts/audio-clip-player';
import type { FetchClip, PlayClip, StartInfo } from './tts/tts-player';

vi.mock('./tts/audio-clip-player', () => ({
  preparePlayback: vi.fn<() => void>(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(preparePlayback).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TtsPlaybackController', () => {
  it('fetches and marks only the entry it is playing', async () => {
    const { controller, fetches, statuses } = setUp([entryA, entryB]);

    await flush();

    expect(fetches).toEqual([]);

    controller.toggle(1);

    expect(statuses()).toEqual(['idle', 'loading']);

    await flush();

    expect(statuses()).toEqual(['idle', 'playing']);
    expect(fetches.map((fetch) => fetch.request)).toEqual(entryB.requests);
    expect(controller.state).toMatchObject({
      kind: 'playing',
      activeEntryIndex: 1,
      readingIndex: 0,
    });
  });

  it('stops the playing entry when another entry starts', async () => {
    const { controller, statuses, playbacks } = setUp([entryA, entryB]);

    controller.toggle(0);
    await flush();
    controller.toggle(1);
    await flush();

    expect(playbacks[0].signal.aborted).toBe(true);
    expect(statuses()).toEqual(['idle', 'playing']);
  });

  it('starts the newly toggled entry while another entry is still loading', async () => {
    const { controller, fetches, playbacks, statuses } = setUp(
      [entryA, entryB],
      { deferFetch: true }
    );

    controller.toggle(0);
    controller.toggle(1);

    expect(fetches[0].signal.aborted).toBe(true);
    expect(fetches[1].request).toEqual(entryB.requests[0]);
    expect(statuses()).toEqual(['idle', 'loading']);

    fetches[1].resolve();
    await flush();

    expect(playbacks).toHaveLength(1);
    expect(statuses()).toEqual(['idle', 'playing']);
    expect(controller.state).toMatchObject({
      kind: 'playing',
      activeEntryIndex: 1,
    });
  });

  it('stops the playing entry when it is toggled again', async () => {
    const { controller, statuses, playbacks } = setUp([entryA, entryB]);

    controller.toggle(0);
    await flush();
    controller.toggle(0);

    expect(playbacks[0].signal.aborted).toBe(true);
    expect(statuses()).toEqual(['idle', 'idle']);
    expect(controller.state).toEqual({ kind: 'idle' });
  });

  it('stops a loading entry when it is toggled again', () => {
    const { controller, fetches, playbacks } = setUp([entryA, entryB], {
      deferFetch: true,
    });

    controller.toggle(0);
    controller.toggle(0);

    expect(fetches[0].signal.aborted).toBe(true);
    expect(playbacks).toEqual([]);
    expect(controller.state).toEqual({ kind: 'idle' });
  });

  it('plays the entry again when it is toggled while the error shows', async () => {
    let attempts = 0;
    const { controller, fetches, statuses } = setUp([entryA, entryB], {
      failFor: () => ++attempts === 1,
    });

    controller.toggle(1);
    await flush();

    expect(statuses()).toEqual(['idle', 'error']);

    controller.toggle(1);
    await flush();

    expect(fetches).toHaveLength(2);
    expect(statuses()).toEqual(['idle', 'playing']);
  });

  it('reports that audio has started once the first reading plays', async () => {
    const { controller, playbacks } = setUp([
      { id: 4, requests: twoReadings },
      entryB,
    ]);
    const loadingStates: Array<boolean> = [];
    controller.subscribe((state) => {
      if (state.kind === 'loading') {
        loadingStates.push(state.audioStarted);
      }
    });

    controller.toggle(0);
    await flush();

    expect(loadingStates).toEqual([false]);

    playbacks[0].end();
    await flush();

    expect(loadingStates).toEqual([false, true]);
  });

  it('still attempts playback when preparing the audio context throws', async () => {
    const { controller, statuses } = setUp([entryA, entryB]);
    const warnings = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(preparePlayback).mockImplementationOnce(() => {
      throw new Error('no audio context');
    });

    controller.toggle(0);
    await flush();

    expect(warnings).toHaveBeenCalled();
    expect(statuses()).toEqual(['playing', 'idle']);

    controller.toggle(1);
    await flush();

    expect(statuses()).toEqual(['idle', 'playing']);
  });

  it('keeps playing when the entries are set again with the same keys', async () => {
    const { controller, statuses } = setUp([entryA, entryB]);

    controller.toggle(1);
    await flush();

    controller.setEntries([{ ...entryA }, { ...entryB }]);

    expect(statuses()).toEqual(['idle', 'playing']);
  });

  it('keeps playing when the entry it is playing moves to another index', async () => {
    const { controller, statuses, playbacks } = setUp([entryA, entryB]);

    controller.toggle(1);
    await flush();

    controller.setEntries([entryB]);

    expect(playbacks[0].signal.aborted).toBe(false);
    expect(statuses()).toEqual(['playing', 'idle']);
    expect(controller.state).toMatchObject({
      kind: 'playing',
      activeEntryIndex: 0,
    });
  });

  it('stops when the audio of the entry it is playing changes', async () => {
    const { controller, statuses, playbacks } = setUp([entryA, entryB]);

    controller.toggle(1);
    await flush();

    controller.setEntries([entryA, { id: entryB.id, requests: twoReadings }]);

    expect(playbacks[0].signal.aborted).toBe(true);
    expect(statuses()).toEqual(['idle', 'idle']);
  });

  it('stops when the entry it is playing disappears', async () => {
    const { controller, statuses, playbacks } = setUp([entryA, entryB]);

    controller.toggle(1);
    await flush();

    controller.setEntries([]);

    expect(playbacks[0].signal.aborted).toBe(true);
    expect(statuses()).toEqual(['idle', 'idle']);
  });

  it('fetches the clips again when an entry is played after it finished', async () => {
    const { controller, fetches, playbacks, statuses } = setUp([
      { id: 4, requests: twoReadings },
      entryB,
    ]);

    controller.toggle(0);
    await flush();
    playbacks[0].end();
    await flush();
    playbacks[1].end();
    await flush();

    expect(fetches).toHaveLength(2);
    expect(statuses()).toEqual(['idle', 'idle']);

    controller.toggle(0);
    await flush();

    expect(fetches).toHaveLength(4);
    expect(statuses()).toEqual(['playing', 'idle']);
  });

  it('tells a listener the current state when it subscribes while a reading plays', async () => {
    const { controller, subscribeProbe } = setUp([entryA, entryB]);

    controller.toggle(1);
    await flush();
    const late = subscribeProbe(1);

    expect(late.status()).toBe('playing');
  });

  it('stops notifying a listener that unsubscribed', async () => {
    const { controller, deliveries, unsubscribeAll } = setUp([entryA, entryB]);

    expect(deliveries).toEqual([
      { entryIndex: 0, kind: 'idle' },
      { entryIndex: 1, kind: 'idle' },
    ]);

    unsubscribeAll();
    controller.toggle(0);
    await flush();

    expect(deliveries).toHaveLength(2);
  });

  it('keeps playing when a listener throws', async () => {
    const { controller, statuses } = setUp([entryA, entryB]);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const seen: Array<string> = [];
    controller.subscribe(() => {
      throw new Error('listener failed');
    });
    controller.subscribe((state) => seen.push(state.kind));

    controller.toggle(0);
    await flush();

    expect(statuses()).toEqual(['playing', 'idle']);
    expect(seen).toEqual(['idle', 'loading', 'playing']);
    expect(errors).toHaveBeenCalled();
  });

  it('stops when a stop arrives while it starts an entry', async () => {
    const { controller, fetches, playbacks, statuses } = setUp(
      [entryA, entryB],
      { deferFetch: true }
    );

    controller.toggle(0);

    expect(statuses()).toEqual(['loading', 'idle']);

    controller.stop();
    await flush();

    expect(fetches[0].signal.aborted).toBe(true);
    expect(playbacks).toEqual([]);
    expect(statuses()).toEqual(['idle', 'idle']);
    expect(controller.state).toEqual({ kind: 'idle' });
  });

  it('prepares audio playback synchronously on start, and not on stop', async () => {
    const { controller } = setUp([entryA, entryB]);

    expect(preparePlayback).not.toHaveBeenCalled();

    // Called synchronously by `toggle`, not after an await: WebKit ignores a
    // resume() that lands once the click is off the stack.
    controller.toggle(0);
    expect(preparePlayback).toHaveBeenCalledTimes(1);

    await flush();
    controller.toggle(0);

    expect(preparePlayback).toHaveBeenCalledTimes(1);
  });

  it('stops playback on stop()', async () => {
    const { controller, statuses, playbacks } = setUp([entryA, entryB]);

    controller.toggle(0);
    await flush();

    controller.stop();

    expect(playbacks[0].signal.aborted).toBe(true);
    expect(statuses()).toEqual(['idle', 'idle']);
    expect(controller.state).toEqual({ kind: 'idle' });
  });

  it('carries the exact moraTiming object and startedAt through to the playing state', async () => {
    const moraTiming: MoraTimingData = {
      charTimingsMs: [0, 120, 240],
      totalDurationMs: 360,
    };
    const clip: TtsClip = { bytes: new Uint8Array([1]), moraTiming };

    const controller = new TtsPlaybackController({
      fetchClip: () => Promise.resolve(clip),
      playClip: () => ({
        started: Promise.resolve({ startedAt: 123 }),
        ended: new Promise<void>(() => {}),
      }),
    });
    controller.setEntries([entryA]);

    controller.toggle(0);
    await flush();

    expect(controller.state).toMatchObject({ kind: 'playing', startedAt: 123 });
    const playing = controller.state;
    expect(playing.kind === 'playing' ? playing.moraTiming : undefined).toBe(
      moraTiming
    );
  });
});

const entryA: TtsEntry = {
  id: 1,
  requests: [{ kanji: '入る', reading: 'はいる', pitchAccentPos: 1 }],
};
const entryB: TtsEntry = {
  id: 2,
  requests: [{ kanji: '猫', reading: 'ねこ' }],
};
const twoReadings: Array<TtsClipRequest> = [
  { kanji: '日', reading: 'ひ' },
  { kanji: '日', reading: 'にち' },
];

type Behavior = {
  deferFetch?: boolean;
  failFor?: (request: TtsClipRequest) => boolean;
};

type FetchCall = {
  request: TtsClipRequest;
  signal: AbortSignal;
  clip: TtsClip;
  resolve: () => void;
};

type PlaybackCall = { clip: TtsClip; signal: AbortSignal; end: () => void };

function setUp(entries: ReadonlyArray<TtsEntry>, behavior: Behavior = {}) {
  const fetches: Array<FetchCall> = [];
  const playbacks: Array<PlaybackCall> = [];

  const fetchClip: FetchClip = (request, signal) => {
    const result = deferred<TtsClip>();
    const clip: TtsClip = { bytes: new Uint8Array([fetches.length]) };
    const reject = () => result.reject(new Error('fetch failed'));
    fetches.push({
      request,
      signal,
      clip,
      resolve: () => result.resolve(clip),
    });

    signal.addEventListener('abort', reject, { once: true });
    if (behavior.failFor?.(request)) {
      reject();
    } else if (!behavior.deferFetch) {
      result.resolve(clip);
    }

    return result.promise;
  };

  const playClip: PlayClip = (clip, signal) => {
    const started = deferred<StartInfo>();
    const ended = deferred<void>();
    playbacks.push({ clip, signal, end: () => ended.resolve() });

    signal.addEventListener(
      'abort',
      () => {
        started.reject(new Error('aborted'));
        ended.reject(new Error('aborted'));
      },
      { once: true }
    );
    started.resolve({ startedAt: playbacks.length * 100 });

    return { started: started.promise, ended: ended.promise };
  };

  const controller = new TtsPlaybackController({ fetchClip, playClip });
  controller.setEntries(entries);

  const deliveries: Array<{ entryIndex: number; kind: string }> = [];
  const probes = [
    subscribeProbe({ controller, entryIndex: 0, deliveries }),
    subscribeProbe({ controller, entryIndex: 1, deliveries }),
  ];

  return {
    controller,
    fetches,
    playbacks,
    deliveries,
    subscribeProbe: (entryIndex: number) =>
      subscribeProbe({ controller, entryIndex, deliveries }),
    unsubscribeAll: () => {
      for (const probe of probes) {
        probe.unsubscribe();
      }
    },
    statuses: () => probes.map((probe) => probe.status()),
  };
}

function subscribeProbe({
  controller,
  entryIndex,
  deliveries,
}: {
  controller: TtsPlaybackController;
  entryIndex: number;
  deliveries: Array<{ entryIndex: number; kind: string }>;
}) {
  let state: TtsPlaybackState = { kind: 'idle' };
  const unsubscribe = controller.subscribe((next) => {
    deliveries.push({ entryIndex, kind: next.kind });
    state = next;
  });

  return {
    status: () =>
      state.kind !== 'idle' && state.activeEntryIndex === entryIndex
        ? state.kind
        : 'idle',
    unsubscribe,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function flush() {
  return vi.advanceTimersByTimeAsync(0);
}
