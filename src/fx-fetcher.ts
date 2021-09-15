import Bugsnag from '@bugsnag/browser';
import { browser } from 'webextension-polyfill-ts';
import * as s from 'superstruct';

import { fetchWithTimeout } from './fetch';
import { getLocalFxData } from './fx-data';
import { padNum } from './pad-num';
import { getReleaseStage } from './release-stage';

const FxDataSchema = s.type({
  timestamp: s.min(s.integer(), 0),
  rates: s.record(s.string(), s.number()),
});

// Hopefully this is sufficiently similar enough to the DownloadError class used
// by hikibiki-data that our Bugsnag grouping code should treat them as the
// same.
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
  | {
      type: 'idle';
    }
  | {
      type: 'fetching';
      retryCount?: number;
    }
  | {
      type: 'waiting to retry';
      timeout: number;
      retryCount: number;
    };

export class FxFetcher {
  private fetchState: FetchState = { type: 'idle' };
  private updated: number | undefined;

  constructor() {
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'fx-update') {
        this.fetchData().catch((e) => {
          Bugsnag.notify(e);
        });
      }
    });

    // Fetch the latest update date and if we've never downloaded the data,
    // do it now.
    getLocalFxData().then((fxData) => {
      if (!fxData) {
        this.fetchData().catch((e) => {
          Bugsnag.notify(e);
        });
      } else {
        this.updated = fxData.updated;
      }
    });
  }

  private async fetchData() {
    // Don't try fetching if we are offline
    if (!navigator.onLine) {
      window.addEventListener('online', () => {
        this.fetchData();
      });
      return;
    }

    // Don't try if we are already fetching
    if (this.fetchState.type === 'fetching') {
      return;
    }

    // Abort any timeout to retry
    if (this.fetchState.type === 'waiting to retry') {
      window.clearTimeout(this.fetchState.timeout);
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
    const now = new Date();
    const dateString =
      now.getUTCFullYear() +
      padNum(now.getUTCMonth() + 1) +
      padNum(now.getUTCDate());
    let url = `https://data.10ten.study/fx/jpy-${dateString}.json`;

    // Set up query string
    const manifest = browser.runtime.getManifest();
    const queryParams = new URLSearchParams({
      sp: '10ten-ja-reader',
      sv: (manifest as any).version_name || manifest.version,
      sc: getReleaseStage() === 'production' ? 'prod' : 'dev',
    });
    url += `?${queryParams.toString()}`;

    // Do the fetch
    try {
      const response = await fetchWithTimeout(url, {
        mode: 'cors',
        timeout: 5000,
      });

      // Check the response
      if (!response.ok) {
        throw new DownloadError(url, response.status, response.statusText);
      }

      // Parse the response
      const result = await response.json();
      s.assert(result, FxDataSchema);

      // Store the response
      await browser.storage.local.set({
        fx: { ...result, updated: now.getTime() },
      });

      // Update our local state now that everything succeeded
      this.updated = now.getTime();
      this.fetchState = { type: 'idle' };
    } catch (e) {
      console.error(e);
      Bugsnag.notify(e);

      // Possibly schedule a retry
      const retryAbleError =
        e?.name === 'TimeoutError' ||
        e?.name === 'NetworkError' ||
        (e instanceof TypeError && e.message.startsWith('NetworkError')) ||
        (e?.name === 'DownloadError' && e.code >= 400 && e.code < 500);
      const retryCount =
        this.fetchState.type === 'fetching' &&
        typeof this.fetchState.retryCount === 'number'
          ? this.fetchState.retryCount
          : 0;
      if (retryAbleError && retryCount < 3) {
        // We're using setTimeout here but in the case of event pages (as we
        // use on some platforms) these are not guaranteed to run.
        //
        // That's fine though because if the background page gets killed then
        // when it restarts it will trigger a new fetch anyway.
        const timeout = window.setTimeout(() => {
          this.fetchData();
        }, 3000);
        this.fetchState = { type: 'waiting to retry', retryCount, timeout };
      } else {
        this.fetchState = { type: 'idle' };
      }
    }

    // Clear any alarm that might have triggered us so we can set a new alarm.
    await this.cancelScheduledUpdate();

    // If we succeeded, or failed outright, schedule our next update.
    //
    // For the failed outright case, we determined that retrying isn't going to
    // help but who knows, maybe in 24 hours it will?
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

    // If we've never been updated, schedule the next run in an hour.
    //
    // This is mostly going to happen when we fail the initial download and
    // fetch decides to schedule the next update anyway.
    //
    // For that case, we don't want to re-trigger too soon or else we'll ping
    // the server unnecessarily.
    const now = Date.now();
    const ONE_MINUTE = 60 * 1000;
    const ONE_HOUR = 60 * ONE_MINUTE;
    const ONE_DAY = 24 * ONE_HOUR;
    let nextRun =
      typeof this.updated === 'undefined'
        ? now + ONE_HOUR
        : this.updated + ONE_DAY;

    // Clamp the next run to the start of the next UTC day so that it is as
    // up-to-date as possible.
    const nextUtcDay = now + ONE_DAY - (now % ONE_DAY);
    if (nextUtcDay < nextRun) {
      // ... but add a few minutes to avoid all the clients hitting the server
      // at the same time.
      nextRun = nextUtcDay + Math.random() * ONE_HOUR;
    }

    // If the next run is within a minute or so, run it now. Otherwise, schedule
    // it for later.
    if (nextRun <= now + ONE_MINUTE) {
      this.fetchData();
    } else {
      try {
        browser.alarms.create('fx-update', { when: nextRun });
      } catch (e) {
        console.log(e);
      }
    }
  }

  async cancelScheduledUpdate() {
    await browser.alarms.clear('fx-update');
  }
}
