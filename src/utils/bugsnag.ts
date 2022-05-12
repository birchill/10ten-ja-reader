import Bugsnag, { Event as BugsnagEvent } from '@bugsnag/browser';
import { browser } from 'webextension-polyfill-ts';

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
    if (!storedInstallId) {
      const installId = getRandomId();
      await browser.storage.local.set({ installid: installId });
      storedInstallId = installId;
    }

    return storedInstallId;
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

  Bugsnag.start({
    apiKey: 'e707c9ae84265d122b019103641e6462',
    appVersion: (manifest as any).version_name || manifest.version,
    autoTrackSessions: false,
    collectUserIp: false,
    enabledBreadcrumbTypes: ['log', 'error', 'request'],
    logger: null,
    onError: async (event: BugsnagEvent) => {
      // Fill out the user ID
      //
      // Bugsnag will generate a unique device ID, store it in local storage,
      // and use that as the user ID but that won't help us once we move to
      // MV3 (no local storage) or if we try to use it in a content script
      // (different local storage context) so we use our own ID that we store
      // in extension local storage.
      event.setUser(await getExtensionInstallId());

      // Group download errors by URL and error code
      if (
        event.errors[0].errorClass === 'DownloadError' &&
        event.originalError &&
        typeof event.originalError.url !== 'undefined'
      ) {
        event.groupingHash =
          String(event.originalError.code) + event.originalError.url;
        event.request.url = event.originalError.url;
      }

      // Group extension errors by action and key
      if (
        event.errors[0].errorClass === 'ExtensionStorageError' &&
        event.originalError
      ) {
        const { key, action } = event.originalError;
        event.groupingHash = `${action}:${key}`;
      }

      // Update release stage here since we can only fetch this async but
      // bugsnag doesn't allow updating the instance after initializing.
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
      const basePath = `https://github.com/birchill/10ten-ja-reader/releases/download/v${manifest.version}`;
      for (const error of event.errors) {
        for (const frame of error.stacktrace) {
          frame.file = frame.file.replace(
            /^(moz-extension|chrome-extension|extension|safari-extension):\/\/[0-9a-z-]+/,
            basePath
          );
        }
      }

      // If we get a QuotaExceededError, report how much disk space was available.
      if (event.errors[0].errorClass === 'QuotaExceededError') {
        try {
          const { quota, usage } = await navigator.storage.estimate();
          event.addMetadata('storage', { quota, usage });
        } catch {
          console.warn('Failed to get storage estimate');
        }
      }

      return true;
    },
  });
}
