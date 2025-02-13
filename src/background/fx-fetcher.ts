import Bugsnag from '@birchill/bugsnag-zero';
import * as s from 'superstruct';
import browser from 'webextension-polyfill';

import { fetchWithTimeout } from '../utils/fetch';
import { isError } from '../utils/is-error';
import { getReleaseStage } from '../utils/release-stage';

import { getLocalFxData } from './fx-data';

declare let self: (Window | ServiceWorkerGlobalScope) & typeof globalThis;

const FxDataSchema = s.type({
  timestamp: s.min(s.integer(), 0),
  rates: s.record(s.string(), s.number()),
});

// Hopefully this is sufficiently similar enough to the DownloadError class used
// by jpdict-idb that our Bugsnag grouping code should treat them as the same.
class DownloadError extends Error {
  code: number;
  url: string;

  constructor(url: string, code: number, ...params: any[]) {
    super(...params);
    Object.setPrototypeOf(this, DownloadError.prototype);

    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, DownloadError);
    }

    this.name = 'DownloadError';
    this.code = code;
    this.url = url;
  }
}

type FetchState =
  | { type: 'idle'; didFail?: boolean }
  | { type: 'fetching'; retryCount?: number }
  | { type: 'waiting to retry'; timeout: number; retryCount: number };

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

export class FxFetcher {
  private fetchState: FetchState = { type: 'idle' };
  private updated: number | undefined;

  constructor() {
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'fx-update') {
        Bugsnag.leaveBreadcrumb('Running FX data update from alarm');
        this.fetchData().catch((e) => Bugsnag.notify(e));
      }
    });

    // Fetch the latest update date and if we've never downloaded the data,
    // do it now.
    //
    // No need to catch errors here, getLocalFxData does its own error
    // handling.
    void getLocalFxData().then((fxData) => {
      if (!fxData) {
        Bugsnag.leaveBreadcrumb('No stored FX data. Doing initial fetch.');
        this.fetchData().catch((e) => Bugsnag.notify(e));
      } else {
        Bugsnag.leaveBreadcrumb(
          `Got stored FX data from ${new Date(
            fxData.timestamp
          )}. Last updated ${new Date(fxData.updated)}.`
        );
        this.updated = fxData.updated;
      }
    });
  }

  private async fetchData() {
    // Don't try fetching if we are offline
    if (!self.navigator.onLine) {
      Bugsnag.leaveBreadcrumb('Deferring FX data update until we are online');
      self.addEventListener('online', () => {
        Bugsnag.leaveBreadcrumb(
          'Fetching FX data update now that we are online'
        );
        void this.fetchData();
      });
      return;
    }

    // Don't try if we are already fetching
    if (this.fetchState.type === 'fetching') {
      Bugsnag.leaveBreadcrumb('Overlapping attempt to fetch FX data.');
      return;
    }

    // Abort any timeout to retry
    if (this.fetchState.type === 'waiting to retry') {
      self.clearTimeout(this.fetchState.timeout);
    }

    // Update our state
    this.fetchState = {
      type: 'fetching',
      retryCount:
        this.fetchState.type === 'waiting to retry'
          ? this.fetchState.retryCount + 1
          : undefined,
    };

    // Set up base URL
    let url = 'https://data.10ten.life/fx/jpy.json';

    // Set up query string
    const manifest = browser.runtime.getManifest();
    const queryParams = new URLSearchParams({
      sp: '10ten-ja-reader',
      sv: (manifest as any).version_name || manifest.version,
      sc: getReleaseStage() === 'production' ? 'prod' : 'dev',
    });
    url += `?${queryParams.toString()}`;

    // Do the fetch
    let fxData: s.Infer<typeof FxDataSchema> | undefined;
    try {
      const response = await fetchWithTimeout(url, {
        mode: 'cors',
        timeout: 20_000,
      });

      // Check the response
      if (!response.ok) {
        throw new DownloadError(url, response.status, response.statusText);
      }

      // Parse the response
      const result = await response.json();
      s.assert(result, FxDataSchema);

      fxData = result;
    } catch (e: unknown) {
      // Convert network errors disguised as TypeErrors to DownloadErrors
      let error = e;
      if (
        isError(e) &&
        e instanceof TypeError &&
        (e.message.startsWith('NetworkError') ||
          e.message === 'Failed to fetch')
      ) {
        // Use 418 just so that we pass the check for a retry-able error below
        // which looks for a status code in the 4xx~5xx range.
        error = new DownloadError(url, 418, e.message);
      }

      // Possibly schedule a retry
      const retryAbleError =
        isError(error) &&
        (error.name === 'TimeoutError' ||
          error.name === 'NetworkError' ||
          (error.name === 'DownloadError' &&
            (error as DownloadError).code >= 400 &&
            (error as DownloadError).code < 500));

      const retryCount =
        this.fetchState.type === 'fetching' &&
        typeof this.fetchState.retryCount === 'number'
          ? this.fetchState.retryCount
          : 0;
      if (retryAbleError && retryCount < 3) {
        console.warn(error);
        Bugsnag.leaveBreadcrumb(
          `Failed attempt #${retryCount + 1} to fetch FX data. Will retry.`,
          { error }
        );

        // We're using setTimeout here but in the case of event pages or service
        // workers (as we use on some platforms) these are not guaranteed to
        // run.
        //
        // That's fine though because if the background page gets killed then
        // when it restarts it will trigger a new fetch anyway.
        const timeout = self.setTimeout(() => this.fetchData(), 10_000);
        this.fetchState = { type: 'waiting to retry', retryCount, timeout };
      } else {
        console.error(error);
        void Bugsnag.notify(error);
        this.fetchState = { type: 'idle', didFail: true };
      }
    }

    if (fxData) {
      // Store the response
      //
      // If this fails (e.g. due to a QuotaExceededError) there's not much we
      // can do since we communicate the FX data with other components via
      // local storage.
      const updated = Date.now();
      try {
        await browser.storage.local.set({ fx: { ...fxData, updated } });

        // Update our local state now that everything succeeded
        this.updated = updated;
        this.fetchState = { type: 'idle' };
      } catch {
        // Don't report to Bugsnag because this is really common in Firefox for
        // some reason.
        this.fetchState = { type: 'idle', didFail: true };
      }
    }

    // Clear any alarm that might have triggered us so we can set a new alarm.
    await this.cancelScheduledUpdate();

    // If we succeeded, or failed outright, schedule our next update.
    //
    // For the failed outright case, we determined that retrying isn't going to
    // help but who knows, maybe in an hour it will?
    await this.scheduleNextUpdate();
  }

  async scheduleNextUpdate() {
    // If we have an existing alarm, it's not likely to be later than we
    const existingAlarm = await browser.alarms.get('fx-update');
    if (existingAlarm) {
      return;
    }

    // If we are already fetching (or waiting to re-fetch) let it run. It will
    // schedule the next run when it completes.
    if (this.fetchState.type !== 'idle') {
      return;
    }

    // Schedule the next run to run in a day from the last update.
    //
    // If we failed the last update (or failed _every_ update) try again in an
    // hour. We don't want to re-trigger too soon, however, or else we'll ping
    // the server unnecessarily.
    const now = Date.now();
    let nextRun: number;
    if (typeof this.updated === 'undefined' || this.fetchState.didFail) {
      nextRun = now + ONE_HOUR;
    } else {
      nextRun = Math.max(this.updated + ONE_DAY, now);
    }

    // If the next UTC day is before we're scheduled to run next, bring the next
    // run forwards so that we get the data when it is as fresh as possible.
    const nextUtcDay = now + ONE_DAY - (now % ONE_DAY);
    if (nextUtcDay < nextRun) {
      // ... but add a few minutes to avoid all the clients hitting the server
      // at the same time.
      nextRun = nextUtcDay + Math.random() * ONE_HOUR;
    }

    // If the next run is within a minute or so, run it now. Otherwise, schedule
    // it for later.
    if (nextRun <= now + ONE_MINUTE) {
      // Don't wait on fetchData -- it does its own error handling and caller's
      // of this function shouldn't have to wait for us to run the fetch, only
      // to schedule it.
      void this.fetchData();
    } else {
      try {
        Bugsnag.leaveBreadcrumb(
          `Scheduling next FX data update for ${new Date(nextRun)}`
        );
        browser.alarms.create('fx-update', { when: nextRun });
      } catch (e) {
        console.error('Error creating alarm for FX data update', e);
        void Bugsnag.notify(e);
      }
    }
  }

  async cancelScheduledUpdate() {
    await browser.alarms.clear('fx-update');
  }
}
