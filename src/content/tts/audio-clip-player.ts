import { rejectWhenAborted } from '../../utils/reject-when-aborted';

import type { PlayClip, StartInfo } from './tts-player';

type PreparedPlayback = { context: AudioContext; ready: Promise<void> };

let prepared: PreparedPlayback | undefined;

// Do not call this outside a user gesture handler. WebKit keeps the context
// suspended if the gesture is over.
export function preparePlayback(): void {
  ensurePrepared();
}

export const playClip: PlayClip = (clip, signal) => {
  const started = deferred<StartInfo>();
  const ended = deferred<void>();
  let source: AudioBufferSourceNode | undefined;
  let settled = false;

  const settle = (error?: unknown) => {
    if (settled) {
      return;
    }
    settled = true;
    signal.removeEventListener('abort', onAbort);

    if (error === undefined) {
      source?.disconnect();
      ended.resolve();
      return;
    }

    source?.stop();
    source?.disconnect();
    started.reject(error);
    ended.reject(error);
  };

  const onAbort = () => settle(new Error('Clip playback aborted'));
  signal.addEventListener('abort', onAbort);

  void run();

  return { started: started.promise, ended: ended.promise };

  async function run() {
    try {
      const playback = ensurePrepared();
      await rejectWhenAborted(playback.ready, signal);

      const audioBuffer = await rejectWhenAborted(
        playback.context.decodeAudioData(
          clip.bytes.buffer.slice(0) as ArrayBuffer
        ),
        signal
      );

      source = playback.context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playback.context.destination);
      source.onended = () => settle();

      source.start();
      started.resolve({ startedAt: performance.now() });
    } catch (e) {
      settle(e);
    }
  }
};

function ensurePrepared(): PreparedPlayback {
  if (!prepared) {
    const context = new AudioContext();
    prepared = { context, ready: context.resume() };
  } else if (prepared.context.state === 'suspended') {
    prepared.ready = prepared.context.resume();
  }
  return prepared;
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
