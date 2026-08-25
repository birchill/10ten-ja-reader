import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TtsClip } from '../../common/tts/tts-request';

import type { PlayClip } from './tts-player';

/**
 * @vitest-environment jsdom
 */

let calls: Array<string>;
let lastSource: FakeSourceNode | undefined;
let lastContext: FakeAudioContext | undefined;
let contextInstances: number;
let resumeDeferred: ReturnType<typeof deferred<void>>;
let decodeDeferred: ReturnType<typeof deferred<AudioBuffer>>;
let staysAudioSuspended: boolean;
let preparePlayback: () => void;
let playClip: PlayClip;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  calls = [];
  lastSource = undefined;
  lastContext = undefined;
  contextInstances = 0;
  staysAudioSuspended = false;
  resumeDeferred = deferred<void>();
  decodeDeferred = deferred<AudioBuffer>();

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

  it('resumes an existing context that WebKit left interrupted', async () => {
    preparePlayback();
    resumeDeferred.resolve();
    await flush();

    lastContext!.state = 'interrupted';
    preparePlayback();

    expect(contextInstances).toBe(1);
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

  it('rejects immediately, without creating a context, when preparePlayback was never called', async () => {
    const clip: TtsClip = { bytes: new Uint8Array([1, 2, 3]) };
    const { started, ended } = playClip(clip, new AbortController().signal);

    await expect(started).rejects.toThrow('preparePlayback() was not called');
    await expect(ended).rejects.toThrow('preparePlayback() was not called');
    expect(contextInstances).toBe(0);
  });

  it('rejects, instead of hanging, when resume() resolves but the context stays suspended', async () => {
    staysAudioSuspended = true;
    preparePlayback();
    resumeDeferred.resolve();

    const clip: TtsClip = { bytes: new Uint8Array([1, 2, 3]) };
    const { started, ended } = playClip(clip, new AbortController().signal);

    await expect(started).rejects.toThrow('AudioContext did not resume');
    await expect(ended).rejects.toThrow('AudioContext did not resume');
    expect(lastSource).toBeUndefined();
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

  it('never starts a source when the signal aborts in the microtask gap right after decode resolves', async () => {
    preparePlayback();
    resumeDeferred.resolve();
    await flush();

    const clip: TtsClip = { bytes: new Uint8Array([1, 2, 3]) };
    const controller = new AbortController();
    const { started, ended } = playClip(clip, controller.signal);
    void started.catch(() => {});
    void ended.catch(() => {});
    await flush();

    decodeDeferred.resolve({} as AudioBuffer);
    queueMicrotask(() => controller.abort());
    await flush();

    await expect(started).rejects.toThrow('Clip playback aborted');
    await expect(ended).rejects.toThrow('Clip playback aborted');
    expect(calls).not.toContain('start');
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
});

class FakeAudioContext {
  state: AudioContextState = 'suspended';
  destination = {};

  constructor() {
    contextInstances += 1;
    calls.push('construct');
    recordContext(this);
  }

  resume = vi.fn<() => Promise<void>>(() => {
    calls.push('resume');
    return resumeDeferred.promise.then(() => {
      if (!staysAudioSuspended) {
        this.state = 'running';
      }
    });
  });

  decodeAudioData = vi.fn<(buffer: ArrayBuffer) => Promise<AudioBuffer>>(() => {
    calls.push('decode');
    return decodeDeferred.promise;
  });

  createBufferSource = vi.fn<() => FakeSourceNode>(() => {
    lastSource = new FakeSourceNode();
    return lastSource;
  });
}

function recordContext(context: FakeAudioContext): void {
  lastContext = context;
}

class FakeSourceNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  connect = vi.fn<() => void>();

  start = vi.fn<() => void>(() => {
    calls.push('start');
  });

  stop = vi.fn<() => void>(() => calls.push('stop'));

  disconnect = vi.fn<() => void>(() => calls.push('disconnect'));
}

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
