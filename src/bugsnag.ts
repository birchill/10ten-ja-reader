import { browser } from 'webextension-polyfill-ts';
import Bugsnag, { Event as BugsnagEvent } from '@bugsnag/browser';

const getExtensionInstallId = (): string => {
  try {
    return new URL(browser.runtime.getURL('yer')).host;
  } catch (e) {
    return 'unknown';
  }
};

let releaseStage = 'production';

if (browser.management) {
  browser.management.getSelf().then((info) => {
    if (info.installType === 'development') {
      releaseStage = 'development';
    }
  });
}

export function startBugsnag() {
  const manifest = browser.runtime.getManifest();

  Bugsnag.start({
    apiKey: 'e707c9ae84265d122b019103641e6462',
    appVersion: (manifest as any).version_name || manifest.version,
    autoTrackSessions: false,
    collectUserIp: false,
    enabledBreadcrumbTypes: ['log', 'error'],
    logger: null,
    onError: async (event: BugsnagEvent) => {
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
      event.app.releaseStage = releaseStage;

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
      const basePath = `https://github.com/birchill/10ten-ja-reader/download/v${manifest.version}`;
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
        } catch (_e) {
          console.warn('Failed to get storage estimate');
        }
      }

      return true;
    },
    user: { id: getExtensionInstallId() },
  });
}
