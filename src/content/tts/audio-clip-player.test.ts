import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TtsClip } from '../../common/tts/tts-request';

import type { PlayClip } from './tts-player';

/**
 * @vitest-environment jsdom
 */

let calls: Array<string>;
let lastSource: FakeSourceNode | undefined;
let contextInstances: number;
let resumeDeferred: ReturnType<typeof deferred<void>>;
let decodeDeferred: ReturnType<typeof deferred<AudioBuffer>>;
let preparePlayback: () => void;
let playClip: PlayClip;

class FakeSourceNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  connect = vi.fn<() => void>();
  start = vi.fn<() => void>(() => calls.push('start'));
  stop = vi.fn<() => void>(() => calls.push('stop'));
  disconnect = vi.fn<() => void>(() => calls.push('disconnect'));
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  calls = [];
  lastSource = undefined;
  contextInstances = 0;
  resumeDeferred = deferred<void>();
  decodeDeferred = deferred<AudioBuffer>();

  class FakeAudioContext {
    state: 'suspended' | 'running' | 'closed' = 'suspended';
    destination = {};

    constructor() {
      contextInstances += 1;
      calls.push('construct');
    }

    resume = vi.fn<() => Promise<void>>(() => {
      calls.push('resume');
      return resumeDeferred.promise.then(() => {
        this.state = 'running';
      });
    });

    decodeAudioData = vi.fn<(buffer: ArrayBuffer) => Promise<AudioBuffer>>(
      () => {
        calls.push('decode');
        return decodeDeferred.promise;
      }
    );

    createBufferSource = vi.fn<() => FakeSourceNode>(() => {
      lastSource = new FakeSourceNode();
      return lastSource;
    });
  }

  vi.stubGlobal('AudioContext', FakeAudioContext);

  const mod = await import('./audio-clip-player');
  preparePlayback = mod.preparePlayback;
  playClip = mod.playClip;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('preparePlayback', () => {
  it('creates the context and resumes it synchronously, then resumes again while still suspended', () => {
    preparePlayback();
    expect(calls).toEqual(['construct', 'resume']);

    preparePlayback();
    expect(calls).toEqual(['construct', 'resume', 'resume']);
  });
});

describe('playClip', () => {
  it('starts the source only after the clip decodes, then resolves `ended` on `onended`', async () => {
    preparePlayback();
    resumeDeferred.resolve();
    await flush();

    const clip: TtsClip = { bytes: new Uint8Array([1, 2, 3]) };
    const { started, ended } = playClip(clip, new AbortController().signal);
    void started.then(() => calls.push('started-resolved'));

    await flush();
    expect(calls).not.toContain('start');

    decodeDeferred.resolve({} as AudioBuffer);
    await flush();

    expect(calls.indexOf('start')).toBeGreaterThanOrEqual(0);
    expect(calls.indexOf('start')).toBeLessThan(
      calls.indexOf('started-resolved')
    );

    lastSource!.onended!();
    await expect(ended).resolves.toBeUndefined();
    expect(lastSource!.disconnect).toHaveBeenCalledTimes(1);
  });

  it('rejects `started` and never starts the source when the signal aborts before playback begins', async () => {
    preparePlayback();
    resumeDeferred.resolve();
    await flush();

    const clip: TtsClip = { bytes: new Uint8Array([1, 2, 3]) };
    const controller = new AbortController();
    const { started, ended } = playClip(clip, controller.signal);

    await flush();
    controller.abort();

    await expect(started).rejects.toThrow('Clip playback aborted');
    await expect(ended).rejects.toThrow('Clip playback aborted');
    expect(lastSource).toBeUndefined();
  });

  it('stops and disconnects the source, and rejects `ended`, when the signal aborts mid-playback', async () => {
    preparePlayback();
    resumeDeferred.resolve();
    await flush();

    const clip: TtsClip = { bytes: new Uint8Array([1, 2, 3]) };
    const controller = new AbortController();
    const { started, ended } = playClip(clip, controller.signal);

    decodeDeferred.resolve({} as AudioBuffer);
    await flush();
    await started;

    controller.abort();

    expect(lastSource!.stop).toHaveBeenCalledTimes(1);
    expect(lastSource!.disconnect).toHaveBeenCalledTimes(1);
    await expect(ended).rejects.toThrow('Clip playback aborted');
  });

  it('reuses the same AudioContext and readiness across clips', async () => {
    preparePlayback();
    resumeDeferred.resolve();
    await flush();

    const clip: TtsClip = { bytes: new Uint8Array([1, 2, 3]) };
    playClip(clip, new AbortController().signal);
    decodeDeferred.resolve({} as AudioBuffer);
    await flush();

    playClip(clip, new AbortController().signal);
    await flush();

    expect(contextInstances).toBe(1);
  });
});

function flush() {
  return vi.advanceTimersByTimeAsync(0);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
