import type { Permissions, Storage } from 'webextension-polyfill';
import browser from 'webextension-polyfill';

export type ReportingConsentState = Readonly<
  | { mode: 'loading' | 'error'; enabled: false }
  | { mode: 'native' | 'local'; enabled: boolean }
>;

const LOCAL_PREFERENCE = 'automaticErrorReporting';
const NATIVE_PERMISSION: Permissions.Permissions = {
  data_collection: ['technicalAndInteraction'],
};

// One instance per extension context: background page/service worker or options
// page. Native consent is authoritative; the local preference is only used
// where the browser has no data collection permissions.
export class ReportingConsent {
  #state: ReportingConsentState = { mode: 'loading', enabled: false };
  #revision = 0;
  #listeners = new Set<(state: ReportingConsentState) => void>();
  readonly ready: Promise<void>;

  constructor() {
    browser.permissions.onAdded.addListener(this.#onAdded);
    browser.permissions.onRemoved.addListener(this.#onRemoved);
    browser.storage.onChanged.addListener(this.#onStorageChanged);
    this.ready = this.refresh();
  }

  get state(): ReportingConsentState {
    return this.#state;
  }

  addChangeListener(listener: (state: ReportingConsentState) => void) {
    this.#listeners.add(listener);
  }

  removeChangeListener(listener: (state: ReportingConsentState) => void) {
    this.#listeners.delete(listener);
  }

  dispose() {
    ++this.#revision;
    browser.permissions.onAdded.removeListener(this.#onAdded);
    browser.permissions.onRemoved.removeListener(this.#onRemoved);
    browser.storage.onChanged.removeListener(this.#onStorageChanged);
    this.#listeners.clear();
  }

  // Also allows retrying a failed query. Never fall back to a saved preference
  // when native support could not be determined.
  async refresh(): Promise<void> {
    const revision = ++this.#revision;
    this.#update({ mode: 'loading', enabled: false });

    try {
      const permissions = await browser.permissions.getAll();
      if (revision !== this.#revision) {
        return;
      }

      if (permissions.data_collection) {
        this.#update({
          mode: 'native',
          enabled: permissions.data_collection.includes(
            'technicalAndInteraction'
          ),
        });
        return;
      }

      const stored = await browser.storage.local.get(LOCAL_PREFERENCE);
      if (revision === this.#revision) {
        this.#update({
          mode: 'local',
          enabled: stored[LOCAL_PREFERENCE] === true,
        });
      }
    } catch {
      if (revision === this.#revision) {
        this.#update({ mode: 'error', enabled: false });
      }
    }
  }

  // Call directly from a user event, after initialization. In particular, do
  // not await readiness here: Firefox's request() needs the user gesture.
  async setEnabled(enabled: boolean): Promise<void> {
    const { mode } = this.#state;
    if (mode === 'loading' || mode === 'error') {
      throw new Error('Reporting consent is not ready');
    }

    try {
      if (mode === 'native') {
        if (enabled) {
          await browser.permissions.request(NATIVE_PERMISSION);
        } else {
          await browser.permissions.remove(NATIVE_PERMISSION);
        }
      } else {
        await browser.storage.local.set({ [LOCAL_PREFERENCE]: enabled });
      }
    } catch (error) {
      ++this.#revision;
      this.#update({ mode: 'error', enabled: false });
      throw error;
    }

    // Re-read the authoritative value, including a declined permission prompt.
    await this.refresh();
  }

  #onAdded = (permissions: Permissions.Permissions) => {
    this.#onNativeChange(permissions, true);
  };

  #onRemoved = (permissions: Permissions.Permissions) => {
    this.#onNativeChange(permissions, false);
  };

  #onNativeChange(permissions: Permissions.Permissions, enabled: boolean) {
    if (!permissions.data_collection?.includes('technicalAndInteraction')) {
      return;
    }

    // Apply revocations immediately and invalidate any older pending read.
    ++this.#revision;
    this.#update({ mode: 'native', enabled });
  }

  #onStorageChanged = (
    changes: Record<string, Storage.StorageChange>,
    areaName: string | undefined
  ) => {
    if (
      // Safari 18 can omit areaName (WebKit bug 281644). This preference is
      // only stored locally, so re-read it when its key changes either way.
      (areaName === 'local' || areaName === undefined) &&
      LOCAL_PREFERENCE in changes &&
      this.#state.mode !== 'native'
    ) {
      void this.refresh();
    }
  };

  #update(state: ReportingConsentState) {
    if (
      state.mode === this.#state.mode &&
      state.enabled === this.#state.enabled
    ) {
      return;
    }

    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
  }
}
