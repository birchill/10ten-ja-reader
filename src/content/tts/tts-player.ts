import { getPlayableReadingIndices } from '../../common/tts/tts-playable-readings';
import type {
  MoraTimingData,
  TtsClip,
  TtsClipRequest,
} from '../../common/tts/tts-request';
import { buildTtsFilename } from '../../common/tts/tts-request';

const CLIP_DEADLINE_MS = 10_000;

export type StartInfo = {
  /** The start time, on the `performance.now()` clock. */
  startedAt: number;
};

export type ClipPlayback = {
  started: Promise<StartInfo>;
  ended: Promise<void>;
};

export type FetchClip = (
  request: TtsClipRequest,
  signal: AbortSignal
) => Promise<TtsClip>;

export type PlayClip = (clip: TtsClip, signal: AbortSignal) => ClipPlayback;

export type PlaybackState =
  | { kind: 'idle' }
  | { kind: 'loading'; readingIndex: number }
  | {
      kind: 'playing';
      readingIndex: number;
      startedAt: number;
      moraTiming?: MoraTimingData;
    }
  | { kind: 'error' };

export type TtsPlayerOptions = { fetchClip: FetchClip; playClip: PlayClip };

type PendingClip = { readingIndex: number; clip: Promise<TtsClip> };

export class TtsPlayer {
  #options: TtsPlayerOptions;
  #readings: ReadonlyArray<TtsClipRequest> = [];
  #readingsKey = '';
  #state: PlaybackState = { kind: 'idle' };
  #listeners = new Set<(state: PlaybackState) => void>();
  #session: AbortController | null = null;
  #errorResetTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: TtsPlayerOptions) {
    this.#options = options;
  }

  get state(): PlaybackState {
    return this.#state;
  }

  subscribe(listener: (state: PlaybackState) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  setReadings(readings: ReadonlyArray<TtsClipRequest>) {
    const key = readings.map(buildTtsFilename).join('\n');
    if (key !== this.#readingsKey) {
      this.stop();
    }
    this.#readings = readings;
    this.#readingsKey = key;
  }

  playAll = () => {
    this.#play(getPlayableReadingIndices(this.#readings));
  };

  stop = () => {
    this.#session?.abort();
    this.#session = null;
    clearTimeout(this.#errorResetTimer);
    // `setReadings` stops on every word change. Do not make subscribers
    // re-render for an idle-to-idle change.
    if (this.#state.kind !== 'idle') {
      this.#setState({ kind: 'idle' });
    }
  };

  #setState(state: PlaybackState) {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }

  #play(indices: Array<number>) {
    this.stop();
    if (!indices.length) {
      return;
    }

    const session = new AbortController();
    this.#session = session;

    const pending = indices.map((readingIndex) => {
      const clip = this.#options.fetchClip(
        this.#readings[readingIndex],
        session.signal
      );
      // A later reading can fail before its turn to play. Without a handler,
      // this gives an unhandled rejection.
      ignoreRejection(clip);
      return { readingIndex, clip };
    });

    void this.#run(pending, session.signal);
  }

  async #run(clips: Array<PendingClip>, signal: AbortSignal) {
    for (const [pos, pending] of clips.entries()) {
      this.#setState({ kind: 'loading', readingIndex: pending.readingIndex });
      try {
        await this.#playWhenReady(pending, signal);
      } catch {
        if (signal.aborted) {
          return;
        }
        if (pos < clips.length - 1) {
          continue;
        }
        // Keep this 2s delay equal to the error-icon fade-out in
        // `TtsPlayButton.tsx`. Set the timer before you tell the listeners.
        // Then a listener that starts a new session can cancel it with `stop`.
        this.#errorResetTimer = setTimeout(
          () => this.#setState({ kind: 'idle' }),
          2000
        );
        this.#setState({ kind: 'error' });
        return;
      }
      if (signal.aborted) {
        return;
      }
    }

    this.#setState({ kind: 'idle' });
  }

  async #playWhenReady(
    { readingIndex, clip }: PendingClip,
    signal: AbortSignal
  ): Promise<void> {
    const clipController = new AbortController();
    const abortClip = () => clipController.abort();
    signal.addEventListener('abort', abortClip);
    // The deadline aborts this clip only. It must not abort the session,
    // because the readings that follow must still play.
    const deadline = setTimeout(abortClip, CLIP_DEADLINE_MS);

    try {
      const fetched = await rejectWhenAborted(clip, clipController.signal);
      if (signal.aborted) {
        return;
      }

      const { started, ended } = this.#options.playClip(
        fetched,
        clipController.signal
      );
      ignoreRejection(ended);

      const { startedAt } = await rejectWhenAborted(
        started,
        clipController.signal
      );
      // A clip can play for longer than the deadline, so stop the deadline as
      // soon as the audio starts.
      clearTimeout(deadline);
      if (signal.aborted) {
        return;
      }

      this.#setState({
        kind: 'playing',
        readingIndex,
        startedAt,
        moraTiming: fetched.moraTiming,
      });
      await rejectWhenAborted(ended, clipController.signal);
    } finally {
      clearTimeout(deadline);
      signal.removeEventListener('abort', abortClip);
      // Abort after every outcome, also a natural end. This tells the playback
      // seam to release the resources of this clip.
      clipController.abort();
    }
  }
}

function ignoreRejection(promise: Promise<unknown>) {
  void promise.catch(() => {});
}

function rejectWhenAborted<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new Error('Playback aborted'));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error('Playback aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
    void promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort);
    });
  });
}
