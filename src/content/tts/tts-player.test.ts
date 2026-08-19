import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  MoraTimingData,
  TtsClip,
  TtsClipRequest,
} from '../../common/tts/tts-request';

import type {
  FetchClip,
  PlayClip,
  PlaybackState,
  StartInfo,
} from './tts-player';
import { TtsPlayer } from './tts-player';

const readings: Array<TtsClipRequest> = [
  { reading: 'はいる', kanji: '入る', pitchAccentPos: 1 },
  { reading: 'いる', kanji: '入る', pitchAccentPos: 0 },
  { reading: 'にゅう', kanji: '入', pitchAccentPos: 0 },
];

const moraTiming: MoraTimingData = {
  charTimingsMs: [0, 500, 1000],
  totalDurationMs: 1500,
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TtsPlayer', () => {
  it('starts idle', () => {
    const { player } = makePlayer(readings);

    expect(player.state).toEqual({ kind: 'idle' });
  });

  it('fetches every playable reading up front, then plays the first', async () => {
    const { player, fetches } = makePlayer(readings);

    player.playAll();

    expect(player.state).toEqual({ kind: 'loading', readingIndex: 0 });
    expect(fetches.map((fetch) => fetch.request)).toEqual(readings);

    await flush();

    expect(player.state).toEqual({
      kind: 'playing',
      readingIndex: 0,
      startedAt: 100,
      moraTiming,
    });
  });

  it('does not fetch a reading that sounds the same as an earlier one', async () => {
    const withDuplicate: Array<TtsClipRequest> = [
      { reading: 'こーひー' },
      { reading: 'コーヒー' },
      { reading: 'ちがう' },
    ];
    const { player, fetches } = makePlayer(withDuplicate);

    player.playAll();

    expect(fetches.map((fetch) => fetch.request)).toEqual([
      withDuplicate[0],
      withDuplicate[2],
    ]);

    await flush();

    expect(player.state).toMatchObject({ kind: 'playing', readingIndex: 0 });
  });

  it('plays the readings in sequence', async () => {
    const { player, fetches, playbacks } = makePlayer(readings);

    player.playAll();
    await flush();
    playbacks[0].end();
    await flush();

    expect(player.state).toMatchObject({ kind: 'playing', readingIndex: 1 });
    expect(playbacks[1].clip).toBe(fetches[1].clip);

    playbacks[1].end();
    await flush();

    expect(player.state).toMatchObject({ kind: 'playing', readingIndex: 2 });
  });

  it('returns to idle when the last reading ends', async () => {
    const { player, playbacks } = makePlayer([readings[0]]);

    player.playAll();
    await flush();
    playbacks[0].end();
    await flush();

    expect(player.state).toEqual({ kind: 'idle' });
  });

  it('stays loading until the clip starts', async () => {
    const { player, playbacks } = makePlayer([readings[0]], {
      deferStart: true,
    });

    player.playAll();
    await flush();

    expect(playbacks).toHaveLength(1);
    expect(player.state).toEqual({ kind: 'loading', readingIndex: 0 });

    await vi.advanceTimersByTimeAsync(5000);

    expect(player.state).toEqual({ kind: 'loading', readingIndex: 0 });

    playbacks[0].start(4321);
    await flush();

    expect(player.state).toEqual({
      kind: 'playing',
      readingIndex: 0,
      startedAt: 4321,
      moraTiming,
    });
  });

  it('plays a clip that has no mora timing', async () => {
    const { player } = makePlayer([readings[0]], { withoutMoraTiming: true });

    player.playAll();
    await flush();

    expect(player.state).toEqual({
      kind: 'playing',
      readingIndex: 0,
      startedAt: 100,
      moraTiming: undefined,
    });
  });

  it('stops the fetches and the running clip, then returns to idle', async () => {
    const { player, states, fetches, playbacks } = makePlayer(readings);

    player.playAll();
    await flush();
    player.stop();

    expect(player.state).toEqual({ kind: 'idle' });
    expect(playbacks[0].signal.aborted).toBe(true);
    expect(fetches.every((fetch) => fetch.signal.aborted)).toBe(true);

    await flush();

    expect(player.state).toEqual({ kind: 'idle' });
    expect(states.at(-1)).toEqual({ kind: 'idle' });
  });

  it('never reaches the playing state when it stops before the clip starts', async () => {
    const { player, states, playbacks } = makePlayer([readings[0]], {
      deferStart: true,
    });

    player.playAll();
    await flush();
    player.stop();

    expect(playbacks[0].signal.aborted).toBe(true);

    playbacks[0].start();
    await flush();

    expect(player.state).toEqual({ kind: 'idle' });
    expect(states.some((state) => state.kind === 'playing')).toBe(false);
  });

  it('stays idle when a stop lands between the start and the state update', async () => {
    const { player, states, playbacks } = makePlayer([readings[0]], {
      deferStart: true,
    });

    player.playAll();
    await flush();
    playbacks[0].start();
    void Promise.resolve().then(() => player.stop());
    await flush();

    expect(player.state).toEqual({ kind: 'idle' });
    expect(states.some((state) => state.kind === 'playing')).toBe(false);
  });

  it('plays nothing when it stops while the fetch is in flight', async () => {
    const { player, fetches, playbacks } = makePlayer(readings, {
      deferFetch: true,
      fetchIgnoresAbort: true,
    });

    player.playAll();

    expect(player.state).toEqual({ kind: 'loading', readingIndex: 0 });

    player.stop();

    expect(player.state).toEqual({ kind: 'idle' });
    expect(fetches.every((fetch) => fetch.signal.aborted)).toBe(true);

    fetches[0].resolve();
    await flush();

    expect(playbacks).toHaveLength(0);
    expect(player.state).toEqual({ kind: 'idle' });
  });

  it('plays nothing when a stop lands between the fetch and the playback', async () => {
    const { player, fetches, playbacks } = makePlayer([readings[0]], {
      deferFetch: true,
      fetchIgnoresAbort: true,
    });

    player.playAll();
    await flush();
    fetches[0].resolve();
    void Promise.resolve().then(() => player.stop());
    await flush();

    expect(playbacks).toHaveLength(0);
    expect(player.state).toEqual({ kind: 'idle' });
  });

  it('skips a reading whose fetch fails', async () => {
    const { player } = makePlayer(readings, {
      fetchFailsFor: (request) => request.reading === 'はいる',
    });

    player.playAll();
    await flush();

    expect(player.state).toMatchObject({ kind: 'playing', readingIndex: 1 });
  });

  it('holds a later reading whose fetch fails until its turn', async () => {
    const { player, playbacks } = makePlayer(readings, {
      fetchFailsFor: (request) => request.reading === 'にゅう',
    });

    player.playAll();
    await flush();
    playbacks[0].end();
    await flush();

    expect(player.state).toMatchObject({ kind: 'playing', readingIndex: 1 });

    playbacks[1].end();
    await flush();

    expect(player.state).toEqual({ kind: 'error' });
  });

  it('skips a reading whose playback fails', async () => {
    const { player, playbacks } = makePlayer(readings);

    player.playAll();
    await flush();
    playbacks[0].fail();
    await flush();

    expect(player.state).toMatchObject({ kind: 'playing', readingIndex: 1 });
  });

  it('skips a reading that does not start before the deadline', async () => {
    const { player, playbacks } = makePlayer(readings, { deferStart: true });

    player.playAll();
    await flush();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(playbacks[0].signal.aborted).toBe(true);
    expect(player.state).toEqual({ kind: 'loading', readingIndex: 1 });

    playbacks[1].start();
    await flush();

    expect(player.state).toMatchObject({ kind: 'playing', readingIndex: 1 });
  });

  it('shows the error state, then returns to idle, when the last reading fails', async () => {
    const { player } = makePlayer([readings[0]], { fetchFailsFor: () => true });

    player.playAll();
    await flush();

    expect(player.state).toEqual({ kind: 'error' });

    await vi.advanceTimersByTimeAsync(2000);

    expect(player.state).toEqual({ kind: 'idle' });
  });

  it('skips a reading whose fetch never settles', async () => {
    const { player, playbacks } = makePlayer(readings, {
      deferFetch: true,
      fetchIgnoresAbort: true,
    });

    player.playAll();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(playbacks).toHaveLength(0);
    expect(player.state).toEqual({ kind: 'loading', readingIndex: 1 });
  });

  it('shows the error state when the only fetch never settles', async () => {
    const { player } = makePlayer([readings[0]], {
      deferFetch: true,
      fetchIgnoresAbort: true,
    });

    player.playAll();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(player.state).toEqual({ kind: 'error' });

    await vi.advanceTimersByTimeAsync(2000);

    expect(player.state).toEqual({ kind: 'idle' });
  });

  it('shows the error state when the only clip never starts', async () => {
    const { player } = makePlayer([readings[0]], { unresponsive: true });

    player.playAll();
    await flush();

    expect(player.state).toEqual({ kind: 'loading', readingIndex: 0 });

    await vi.advanceTimersByTimeAsync(10_000);

    expect(player.state).toEqual({ kind: 'error' });

    await vi.advanceTimersByTimeAsync(2000);

    expect(player.state).toEqual({ kind: 'idle' });
  });

  it('keeps playing a clip that lasts longer than the deadline', async () => {
    const { player, playbacks } = makePlayer([readings[0]]);

    player.playAll();
    await flush();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(playbacks[0].signal.aborted).toBe(false);
    expect(player.state).toMatchObject({ kind: 'playing', readingIndex: 0 });
  });

  it('keeps the session a listener starts while the error shows', async () => {
    let attempts = 0;
    const { player } = makePlayer([readings[0]], {
      fetchFailsFor: () => ++attempts === 1,
    });
    let restarted = false;
    player.subscribe((state) => {
      if (state.kind === 'error' && !restarted) {
        restarted = true;
        player.playAll();
      }
    });

    player.playAll();
    await flush();
    await vi.advanceTimersByTimeAsync(2000);

    expect(restarted).toBe(true);
    expect(player.state).toMatchObject({ kind: 'playing', readingIndex: 0 });
  });

  it('removes its session abort listener when each clip settles', async () => {
    const { player, sessions, playbacks } = makePlayer(readings, {
      fetchIgnoresAbort: true,
    });

    player.playAll();
    for (let clip = 0; clip < readings.length; clip++) {
      await flush();
      playbacks[clip].end();
    }
    await flush();

    const { added, removed } = sessions[0];
    expect(player.state).toEqual({ kind: 'idle' });
    expect(added.mock.calls).toHaveLength(readings.length);
    expect(removed.mock.calls.map((call) => call[1])).toEqual(
      added.mock.calls.map((call) => call[1])
    );
  });

  it('supersedes the running session on a new play', async () => {
    const { player, fetches, playbacks } = makePlayer(readings);

    player.playAll();
    await flush();
    player.playAll();

    expect(playbacks[0].signal.aborted).toBe(true);
    expect(player.state).toEqual({ kind: 'loading', readingIndex: 0 });

    await flush();

    expect(player.state).toMatchObject({
      kind: 'playing',
      readingIndex: 0,
      startedAt: 200,
    });
    expect(playbacks).toHaveLength(2);
    expect(fetches).toHaveLength(6);
  });

  it('does not notify subscribers when it stops while already idle', () => {
    const { player, states } = makePlayer(readings);

    player.stop();
    player.setReadings([{ reading: 'ねこ' }]);

    expect(states).toEqual([]);
  });

  it('does nothing when there are no readings', async () => {
    const { player, states, fetches } = makePlayer([]);

    player.playAll();
    await flush();

    expect(fetches).toEqual([]);
    expect(states).toEqual([]);
    expect(player.state).toEqual({ kind: 'idle' });
  });

  it('stops playback when the readings change', async () => {
    const { player, playbacks } = makePlayer(readings);

    player.playAll();
    await flush();
    player.setReadings([...readings]);

    expect(player.state).toMatchObject({ kind: 'playing' });

    player.setReadings([{ reading: 'ねこ' }]);

    expect(player.state).toEqual({ kind: 'idle' });
    expect(playbacks[0].signal.aborted).toBe(true);
  });
});

type Behavior = {
  deferFetch?: boolean;
  fetchIgnoresAbort?: boolean;
  fetchFailsFor?: (request: TtsClipRequest) => boolean;
  deferStart?: boolean;
  unresponsive?: boolean;
  withoutMoraTiming?: boolean;
};

type FetchCall = {
  request: TtsClipRequest;
  signal: AbortSignal;
  clip: TtsClip;
  resolve: () => void;
  reject: () => void;
};

type PlaybackCall = {
  clip: TtsClip;
  signal: AbortSignal;
  start: (startedAt?: number) => void;
  end: () => void;
  fail: () => void;
};

function makePlayer(
  readingsToPlay: ReadonlyArray<TtsClipRequest>,
  behavior: Behavior = {}
) {
  const fetches: Array<FetchCall> = [];
  const playbacks: Array<PlaybackCall> = [];
  const sessions: Array<ReturnType<typeof watchSignal>> = [];

  const fetchClip: FetchClip = (request, signal) => {
    if (!sessions.some((session) => session.signal === signal)) {
      sessions.push(watchSignal(signal));
    }

    const result = deferred<TtsClip>();
    const clip: TtsClip = {
      bytes: new Uint8Array([fetches.length]),
      ...(behavior.withoutMoraTiming ? {} : { moraTiming }),
    };
    const call: FetchCall = {
      request,
      signal,
      clip,
      resolve: () => result.resolve(clip),
      reject: () => result.reject(new Error('fetch failed')),
    };
    fetches.push(call);

    if (!behavior.fetchIgnoresAbort) {
      signal.addEventListener('abort', call.reject, { once: true });
    }
    if (behavior.fetchFailsFor?.(request)) {
      call.reject();
    } else if (!behavior.deferFetch) {
      call.resolve();
    }

    return result.promise;
  };

  const playClip: PlayClip = (clip, signal) => {
    const started = deferred<StartInfo>();
    const ended = deferred<void>();
    const defaultStartedAt = (playbacks.length + 1) * 100;
    const call: PlaybackCall = {
      clip,
      signal,
      start: (startedAt = defaultStartedAt) => started.resolve({ startedAt }),
      end: () => ended.resolve(),
      fail: () => ended.reject(new Error('playback failed')),
    };
    playbacks.push(call);

    if (!behavior.unresponsive) {
      signal.addEventListener(
        'abort',
        () => {
          started.reject(new Error('aborted'));
          ended.reject(new Error('aborted'));
        },
        { once: true }
      );
      if (!behavior.deferStart) {
        call.start();
      }
    }

    return { started: started.promise, ended: ended.promise };
  };

  const player = new TtsPlayer({ fetchClip, playClip });
  player.setReadings(readingsToPlay);

  const states: Array<PlaybackState> = [];
  player.subscribe((state) => states.push(state));

  return { player, states, fetches, playbacks, sessions };
}

function watchSignal(signal: AbortSignal) {
  return {
    signal,
    added: vi.spyOn(signal, 'addEventListener'),
    removed: vi.spyOn(signal, 'removeEventListener'),
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
