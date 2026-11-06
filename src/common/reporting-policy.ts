import type { Storage } from 'webextension-polyfill';
import browser from 'webextension-polyfill';

export type ReportingPolicyState = Readonly<{
  status: 'loading' | 'ready' | 'unsupported' | 'error';
  disableErrorReporting: boolean;
  disableLocalErrorStorage: boolean;
}>;

const BLOCKED = { disableErrorReporting: true, disableLocalErrorStorage: true };
const UNRESTRICTED = {
  disableErrorReporting: false,
  disableLocalErrorStorage: false,
};

export class ReportingPolicy {
  #state: ReportingPolicyState = { status: 'loading', ...BLOCKED };
  #revision = 0;
  #listeners = new Set<(state: ReportingPolicyState) => void>();
  readonly ready: Promise<void>;

  constructor() {
    browser.storage.onChanged.addListener(this.#onChanged);
    this.ready = this.refresh();
  }

  get state(): ReportingPolicyState {
    return this.#state;
  }

  // The background queue subscribes here and clears saved reports whenever a
  // resolved policy has disableLocalErrorStorage set. Loading/errors block new
  // writes but must not themselves delete existing reports.
  addChangeListener(listener: (state: ReportingPolicyState) => void) {
    this.#listeners.add(listener);
  }

  removeChangeListener(listener: (state: ReportingPolicyState) => void) {
    this.#listeners.delete(listener);
  }

  dispose() {
    ++this.#revision;
    browser.storage.onChanged.removeListener(this.#onChanged);
    this.#listeners.clear();
  }

  async refresh(): Promise<void> {
    const revision = ++this.#revision;
    this.#update({ status: 'loading', ...BLOCKED });
    if (!browser.storage.managed) {
      this.#update({ status: 'unsupported', ...UNRESTRICTED });
      return;
    }

    let state: ReportingPolicyState;
    try {
      const values = await browser.storage.managed.get([
        'DisableErrorReporting',
        'DisableLocalErrorStorage',
      ]);
      state = {
        status: 'ready',
        disableErrorReporting: values?.DisableErrorReporting === true,
        disableLocalErrorStorage: values?.DisableLocalErrorStorage === true,
      };
    } catch (error) {
      // Firefox/Thunderbird report an unconfigured policy using this error.
      // Other failures leave both operations blocked until a successful read.
      state =
        error instanceof Error &&
        error.message === 'Managed storage manifest not found'
          ? { status: 'ready', ...UNRESTRICTED }
          : { status: 'error', ...BLOCKED };
    }

    if (revision === this.#revision) {
      this.#update(state);
    }
  }

  #onChanged = (
    _changes: Record<string, Storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName === 'managed') {
      void this.refresh();
    }
  };

  #update(state: ReportingPolicyState) {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
