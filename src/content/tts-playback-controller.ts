import type { MoraTimingData, TtsClipRequest } from '../common/tts/tts-request';
import { buildTtsFilename } from '../common/tts/tts-request';

import { preparePlayback } from './tts/audio-clip-player';
import type { TtsPlayerOptions } from './tts/tts-player';
import { TtsPlayer } from './tts/tts-player';

export type TtsEntry = { id: number; requests: Array<TtsClipRequest> };

export type TtsPlaybackState =
  | { kind: 'idle' }
  | {
      kind: 'loading';
      activeEntryIndex: number;
      readingIndex: number;
      audioStarted: boolean;
    }
  | {
      kind: 'playing';
      activeEntryIndex: number;
      readingIndex: number;
      startedAt: number;
      moraTiming?: MoraTimingData;
    }
  | { kind: 'error'; activeEntryIndex: number };

type TtsPlaybackListener = (state: TtsPlaybackState) => void;

export type TtsPlaybackHandle = Pick<
  TtsPlaybackController,
  'subscribe' | 'toggle' | 'state'
>;

export class TtsPlaybackController {
  #player: TtsPlayer;
  #entries: ReadonlyArray<TtsEntry> = [];
  #activeEntry: { index: number; key: string } | undefined;
  #audioStarted = false;
  #actions: Array<() => void> = [];
  #draining = false;
  #state: TtsPlaybackState = { kind: 'idle' };
  #listeners = new Set<TtsPlaybackListener>();

  constructor(options: TtsPlayerOptions) {
    this.#player = new TtsPlayer(options);
    this.#player.subscribe(this.#onPlayerState);
  }

  get state(): TtsPlaybackState {
    return this.#state;
  }

  subscribe(listener: TtsPlaybackListener): () => void {
    this.#listeners.add(listener);
    notify(listener, this.#state);

    return () => this.#listeners.delete(listener);
  }

  setEntries(entries: ReadonlyArray<TtsEntry>) {
    this.#enqueue(() => this.#applySetEntries(entries));
  }

  toggle(entryIndex: number) {
    this.#enqueue(() => this.#applyToggle(entryIndex));
  }

  stop() {
    this.#enqueue(() => this.#applyStop());
  }

  #enqueue(action: () => void) {
    this.#actions.push(action);
    this.#drainWhenIdle();
  }

  #onPlayerState = () => {
    if (this.#player.state.kind === 'playing') {
      this.#audioStarted = true;
    }
    this.#drainWhenIdle();
  };

  #drainWhenIdle() {
    // The drain that already runs picks this change up and publishes only at
    // quiescence.
    if (this.#draining) {
      return;
    }

    this.#draining = true;
    try {
      this.#drain();
    } finally {
      this.#draining = false;
    }
  }

  #drain() {
    let delivery:
      | { state: TtsPlaybackState; recipients: Array<TtsPlaybackListener> }
      | undefined;

    for (;;) {
      const action = this.#actions.shift();
      if (action) {
        this.#runAction(action);
        continue;
      }

      const state = this.#currentState();
      if (state.kind === 'idle') {
        this.#activeEntry = undefined;
      }
      if (!sameState(state, this.#state)) {
        this.#state = state;
        delivery = { state, recipients: [...this.#listeners] };
      }

      const recipient = delivery?.recipients.shift();
      if (!delivery || !recipient) {
        return;
      }
      if (this.#listeners.has(recipient)) {
        notify(recipient, delivery.state);
      }
    }
  }

  #runAction(action: () => void) {
    try {
      action();
    } catch (error) {
      console.error('[10ten-ja-reader] Reading playback action failed', error);
      // Leave nothing half-started: the queue behind us still has to drain,
      // and a session we cannot finish must not keep the UI showing Stop.
      this.#applyStop();
    }
  }

  #currentState(): TtsPlaybackState {
    const playerState = this.#player.state;
    const active = this.#activeEntry;
    if (playerState.kind === 'idle' || !active) {
      return { kind: 'idle' };
    }

    const activeEntryIndex = active.index;
    switch (playerState.kind) {
      case 'loading':
        return {
          kind: 'loading',
          activeEntryIndex,
          readingIndex: playerState.readingIndex,
          audioStarted: this.#audioStarted,
        };

      case 'playing':
        return {
          kind: 'playing',
          activeEntryIndex,
          readingIndex: playerState.readingIndex,
          startedAt: playerState.startedAt,
          moraTiming: playerState.moraTiming,
        };

      case 'error':
        return { kind: 'error', activeEntryIndex };
    }
  }

  #applySetEntries(entries: ReadonlyArray<TtsEntry>) {
    this.#entries = entries;

    const active = this.#activeEntry;
    if (!active) {
      return;
    }

    const stillThere = entries[active.index];
    const index =
      stillThere && entryKey(stillThere) === active.key
        ? active.index
        : entries.findIndex((entry) => entryKey(entry) === active.key);
    if (index < 0) {
      this.#applyStop();
      return;
    }

    if (index !== active.index) {
      this.#activeEntry = { ...active, index };
    }
  }

  #applyToggle(entryIndex: number) {
    const entry = this.#entries[entryIndex];
    if (!entry) {
      return;
    }

    if (this.#isRunningEntry(entryIndex)) {
      this.#applyStop();
      return;
    }

    try {
      // Must run while the click is on the stack: `playClip` rejects without
      // it, and WebKit ignores a resume() once the gesture is over. Play
      // anyway on failure so it surfaces as an error badge, not a dead button.
      preparePlayback();
    } catch (error) {
      console.warn(
        '[10ten-ja-reader] Could not prepare reading playback',
        error
      );
    }

    this.#activeEntry = { index: entryIndex, key: entryKey(entry) };
    this.#audioStarted = false;
    this.#player.setReadings(entry.requests);
    this.#player.playAll();
  }

  #applyStop() {
    this.#activeEntry = undefined;
    this.#audioStarted = false;
    this.#player.stop();
  }

  #isRunningEntry(entryIndex: number): boolean {
    // Test the player, not the published state: while actions drain, the
    // published state can be older than the session the player holds.
    const { kind } = this.#player.state;
    return (
      this.#activeEntry?.index === entryIndex &&
      (kind === 'loading' || kind === 'playing')
    );
  }
}

function notify(listener: TtsPlaybackListener, state: TtsPlaybackState) {
  try {
    listener(state);
  } catch (error) {
    console.error('[10ten-ja-reader] Reading playback listener failed', error);
  }
}

function sameState(a: TtsPlaybackState, b: TtsPlaybackState): boolean {
  switch (a.kind) {
    case 'idle':
      return b.kind === 'idle';

    case 'loading':
      return (
        b.kind === 'loading' &&
        a.activeEntryIndex === b.activeEntryIndex &&
        a.readingIndex === b.readingIndex &&
        a.audioStarted === b.audioStarted
      );

    case 'playing':
      return (
        b.kind === 'playing' &&
        a.activeEntryIndex === b.activeEntryIndex &&
        a.readingIndex === b.readingIndex &&
        a.startedAt === b.startedAt &&
        a.moraTiming === b.moraTiming
      );

    case 'error':
      return b.kind === 'error' && a.activeEntryIndex === b.activeEntryIndex;
  }
}

function entryKey(entry: TtsEntry): string {
  // Do not key playback on this instead of the row position. Two rows can
  // carry the same id (several deinflection paths reaching one entry) and the
  // same audio, so only the position tells them apart.
  return `${entry.id}\n${entry.requests.map(buildTtsFilename).join('\n')}`;
}
