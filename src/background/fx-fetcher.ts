import Bugsnag, { Event as BugsnagEvent } from '@bugsnag/browser';
import { browser } from 'webextension-polyfill-ts';
import * as s from 'superstruct';

import { fetchWithTimeout } from '../utils/fetch';
import { padNum } from '../utils/pad-num';
import { getReleaseStage } from '../utils/release-stage';

import { getLocalFxData } from './fx-data';
import { isError } from '../utils/is-error';

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
        this.fetchData().catch((e) => {
          Bugsnag.notify(e);
        });
      }
    });

    // Fetch the latest update date and if we've never downloaded the data,
    // do it now.
    getLocalFxData().then((fxData) => {
      if (!fxData) {
        Bugsnag.leaveBreadcrumb('No stored FX data. Doing initial fetch.');
        this.fetchData().catch((e) => {
          Bugsnag.notify(e);
        });
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

  private async fetchData({
    usePreviousDay = false,
  }: { usePreviousDay?: boolean } = {}) {
    // Don't try fetching if we are offline
    if (!navigator.onLine) {
      Bugsnag.leaveBreadcrumb('Deferring FX data update until we are online');
      window.addEventListener('online', () => {
        Bugsnag.leaveBreadcrumb(
          'Fetching FX data update now that we are online'
        );
        this.fetchData();
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
    if (usePreviousDay) {
      Bugsnag.leaveBreadcrumb("Using previous day's FX data");
    }
    const now = usePreviousDay ? new Date(Date.now() - ONE_DAY) : new Date();
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
    let responseText: string | undefined;
    try {
      const response = await fetchWithTimeout(url, {
        mode: 'cors',
        timeout: 10_000,
      });

      // Check the response
      if (!response.ok) {
        throw new DownloadError(url, response.status, response.statusText);
      }

      // Parse the response
      let result: any;
      try {
        result = await response.json();
      } catch (e) {
        if (isError(e) && e.name === 'SyntaxError') {
          responseText = await response.text();
        }
        throw e;
      }
      s.assert(result, FxDataSchema);

      // Store the response
      await browser.storage.local.set({
        fx: { ...result, updated: now.getTime() },
      });

      // Update our local state now that everything succeeded
      this.updated = now.getTime();
      this.fetchState = { type: 'idle' };
    } catch (e: unknown) {
      // Convert network errors disguised as TypeErrors to DownloadErrors
      if (
        isError(e) &&
        e instanceof TypeError &&
        (e.message.startsWith('NetworkError') ||
          e.message === 'Failed to fetch')
      ) {
        // Use 418 just so that we pass the check for a retry-able error below
        // which looks for a status code in the 4xx~5xx range.
        e = new DownloadError(url, 418, e.message);
      }

      // Possibly schedule a retry
      const retryAbleError =
        isError(e) &&
        (e.name === 'TimeoutError' ||
          e.name === 'NetworkError' ||
          (e.name === 'DownloadError' &&
            (e as DownloadError).code >= 400 &&
            (e as DownloadError).code < 500));

      const retryCount =
        this.fetchState.type === 'fetching' &&
        typeof this.fetchState.retryCount === 'number'
          ? this.fetchState.retryCount
          : 0;
      if (retryAbleError && retryCount < 3) {
        console.warn(e);
        Bugsnag.leaveBreadcrumb(
          `Failed attempt #${retryCount + 1} to fetch FX data. Will retry.`,
          { error: e }
        );

        // If we request a day in the future (e.g. because our clock is wrong),
        // CloudFront will return a 401 Forbidden response.
        //
        // In that case we should try to request the previous day's data.
        //
        // (Eventually we should probably just serve a single file with the
        // latest data and set an appropriate 24h expiry on it.)
        const usePreviousDay = e instanceof DownloadError && e.code === 401;

        // We're using setTimeout here but in the case of event pages (as we
        // use on some platforms) these are not guaranteed to run.
        //
        // That's fine though because if the background page gets killed then
        // when it restarts it will trigger a new fetch anyway.
        const timeout = window.setTimeout(() => {
          this.fetchData({ usePreviousDay });
        }, 5000);
        this.fetchState = { type: 'waiting to retry', retryCount, timeout };
      } else {
        console.error(e);
        Bugsnag.notify(e as any, (event: BugsnagEvent) => {
          if (responseText) {
            event.addMetadata('response', { text: responseText });
          }
        });
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
        Bugsnag.leaveBreadcrumb(
          `Scheduling next FX data update for ${new Date(nextRun)}`
        );
        browser.alarms.create('fx-update', { when: nextRun });
      } catch (e) {
        console.error(e);
        Bugsnag.notify(e);
      }
    }
  }

  async cancelScheduledUpdate() {
    await browser.alarms.clear('fx-update');
  }
}
