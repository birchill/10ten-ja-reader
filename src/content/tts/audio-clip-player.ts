import { rejectWhenAborted } from '../../utils/reject-when-aborted';

import type { PlayClip, StartInfo } from './tts-player';

type PreparedPlayback = { context: AudioContext; ready: Promise<void> };

let prepared: PreparedPlayback | undefined;

export function preparePlayback(): void {
  if (!prepared || prepared.context.state === 'closed') {
    prepared = createPrepared();
    return;
  }
  if (prepared.context.state !== 'running') {
    // Resume while the user gesture is still on the stack. WebKit keeps the
    // context suspended for a resume() that arrives after the gesture is over,
    // so this cannot wait until the clip is ready to play.
    prepared.ready = resumeTracked(prepared.context);
  }
}

function createPrepared(): PreparedPlayback {
  const context = new AudioContext();
  return { context, ready: resumeTracked(context) };
}

function resumeTracked(context: AudioContext): Promise<void> {
  const ready = context.resume();
  void ready.catch(() => {});
  return ready;
}

export const playClip: PlayClip = (clip, signal) => {
  const started = deferred<StartInfo>();
  const ended = deferred<void>();
  let source: AudioBufferSourceNode | undefined;
  let settled = false;

  const stopQuietly = () => {
    try {
      source?.stop();
    } catch {}
  };

  const disconnectQuietly = () => {
    try {
      source?.disconnect();
    } catch {}
  };

  const settle = (error?: unknown) => {
    if (settled) {
      return;
    }
    settled = true;
    signal.removeEventListener('abort', onAbort);

    if (error === undefined) {
      disconnectQuietly();
      ended.resolve();
      return;
    }

    stopQuietly();
    disconnectQuietly();
    started.reject(error);
    ended.reject(error);
  };

  const onAbort = () => settle(new Error('Clip playback aborted'));
  signal.addEventListener('abort', onAbort);

  void run();

  return { started: started.promise, ended: ended.promise };

  async function run() {
    try {
      if (!prepared) {
        throw new Error('preparePlayback() was not called');
      }
      const playback = prepared;
      await rejectWhenAborted(playback.ready, signal);
      if (signal.aborted) {
        return;
      }
      if (playback.context.state !== 'running') {
        throw new Error('AudioContext did not resume');
      }

      const audioBuffer = await rejectWhenAborted(
        playback.context.decodeAudioData(clip.bytes.slice().buffer),
        signal
      );
      if (signal.aborted) {
        return;
      }

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
