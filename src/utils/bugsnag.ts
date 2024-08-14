import Bugsnag, {
  Event as BugsnagEvent,
  appDuration,
  browserContext,
  browserHandledRejectionBreadcrumbs,
  browserNotifyUnhandledExceptions,
  browserNotifyUnhandledRejections,
  consoleBreadcrumbs,
  deviceOrientation,
  errorBreadcrumbs,
  fetchBreadcrumbs,
  interactionBreadcrumbs,
  limitEvents,
  navigationBreadcrumbs,
  stringifyValues,
} from '@birchill/bugsnag-zero';
import browser from 'webextension-polyfill';

import { ExtensionStorageError } from '../common/extension-storage-error';

import { isObject } from './is-object';
import { getReleaseStage } from './release-stage';

const getExtensionInstallId = async (): Promise<string> => {
  let internalUuid: string | undefined;
  try {
    // In Firefox, each install gets a unique internal UUID which differs from
    // the extension ID (provided it is set through the
    // browser_specific_settings in manifest.json).
    //
    // Specifically:
    //
    // browser.runtime.id = Extension ID
    // browser.runtime.getURL('yer').host = Internal UUID
    // browser.getMessage('@@extension_id') = Internal UUID
    //
    // In other browsers I think all of the above return the Extension ID.
    // (I haven't checked Safari, however.)
    //
    // If that internal UUID is available, we use it because it is sometimes
    // helpful when Firefox users contact us describing a bug, to be able to
    // find error reports generated from their installation.
    //
    internalUuid = new URL(browser.runtime.getURL('yer')).host;
  } catch {
    // Ignore
  }

  if (internalUuid && internalUuid !== browser.runtime.id) {
    return internalUuid;
  }

  // Generate/fetch a unique install ID since the browser doesn't provide one.
  try {
    let storedInstallId = (await browser.storage.local.get('installid'))
      ?.installid;
    if (typeof storedInstallId !== 'string') {
      const installId = getRandomId();
      await browser.storage.local.set({ installid: installId });
      storedInstallId = installId;
    }

    return storedInstallId as string;
  } catch {
    // Ignore because we are probably already in the middle of reporting an error
  }

  return 'unknown';
};

function getRandomId() {
  const number = getRandomNumber(10);
  return `${'0'.repeat(10)}${number.toString(36)}`.slice(-10);
}

// |length| here is the maximum number of base-36 digits we want to generate.
function getRandomNumber(length: number): number {
  if (Math.pow(36, length) > Number.MAX_SAFE_INTEGER) {
    console.error(
      `A base-36 number with ${length} digits overflows the range of an integer`
    );
  }
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  const max = Math.pow(2, 8);

  let result = 0;
  for (let i = 0; i < values.length; i++) {
    result *= 36;
    result += Math.round((values[i] / max) * 35);
  }
  return result;
}

export function startBugsnag() {
  const manifest = browser.runtime.getManifest();

  const plugins = [
    appDuration,
    browserContext,
    browserHandledRejectionBreadcrumbs,
    browserNotifyUnhandledExceptions,
    browserNotifyUnhandledRejections,
    deviceOrientation,
    errorBreadcrumbs,
    fetchBreadcrumbs,
    interactionBreadcrumbs,
    limitEvents(20),
    navigationBreadcrumbs,
    stringifyValues,
  ];

  if (getReleaseStage() !== 'development') {
    plugins.push(consoleBreadcrumbs);
  }

  Bugsnag.start({
    apiKey: 'e707c9ae84265d122b019103641e6462',
    appVersion: manifest.version_name || manifest.version,
    collectUserIp: false,
    onError: async (event: BugsnagEvent) => {
      // Fill out the user ID
      event.user = { id: await getExtensionInstallId() };

      // Group download errors by URL and error code
      if (isDownloadError(event.originalError)) {
        event.groupingHash =
          String(event.originalError.code) + event.originalError.url;
        if (!event.request) {
          event.request = {};
        }
        event.request.url = event.originalError.url;
      }

      // Group extension errors by action and key
      if (event.originalError instanceof ExtensionStorageError) {
        const { key, action } = event.originalError;
        event.groupingHash = `${action}:${key}`;
      }

      // Update release stage here since we can only fetch this async but
      // bugsnag doesn't allow updating the instance after initializing.
      if (!event.app) {
        event.app = {};
      }
      event.app.releaseStage = getReleaseStage();

      // Update paths in stack trace so that:
      //
      // (a) They are the same across installations of the same version (since
      //     the installed extension ID in the path differs per installation).
      // (b) They point to where the source is available publicly.
      //
      // Note that this is also necessary because Bugsnag's backend discards stack
      // frames from extensions.
      //
      // See: https://docs.bugsnag.com/platforms/javascript/faq/?#how-can-i-get-error-reports-from-browser-extensions
      const basePath = `https://github.com/birchill/10ten-ja-reader/releases/download/v${manifest.version_name || manifest.version}`;
      for (const error of event.exceptions) {
        for (const frame of error.stacktrace) {
          frame.file = frame.file.replace(
            /^(moz-extension|chrome-extension|extension|safari-extension|safari-web-extension):\/\/[0-9a-z-]+/,
            basePath
          );
        }
      }

      // If we get a QuotaExceededError, report how much disk space was available.
      if (event.exceptions[0].errorClass === 'QuotaExceededError') {
        try {
          const { quota, usage } = await navigator.storage.estimate();
          if (!event.metaData) {
            event.metaData = {};
          }
          event.metaData.storage = { quota, usage };
        } catch {
          console.warn('Failed to get storage estimate');
        }
      }

      return true;
    },
    plugins,
  });
}

// Common demonimator between jpdict-idb's DownloadError type and
// fx-fetcher.ts's DownloadError.
type CommonDownloadError = {
  name: 'DownloadError';
  url?: string;
  code: number | string;
};

function isDownloadError(error: unknown): error is CommonDownloadError {
  return (
    isObject(error) &&
    typeof error.name === 'string' &&
    (typeof error.url === 'string' || typeof error.url === 'undefined') &&
    (typeof error.code === 'number' || typeof error.url === 'string')
  );
}
