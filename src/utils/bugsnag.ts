import type { Event as BugsnagEvent } from '@birchill/bugsnag-zero';
import Bugsnag, {
  appDuration,
  browserContext,
  browserHandledRejectionBreadcrumbs,
  browserNotifyUnhandledExceptions,
  browserNotifyUnhandledRejections,
  consoleBreadcrumbs,
  deviceOrientation,
  errorBreadcrumbs,
  fetchBreadcrumbs,
  limitEvents,
  navigationBreadcrumbs,
  stringifyValues,
} from '@birchill/bugsnag-zero';
import type { NotifyResult } from '@birchill/bugsnag-zero';
import { DownloadError } from '@birchill/jpdict-idb';
import browser from 'webextension-polyfill';

import { ExtensionStorageError } from '../common/extension-storage-error';
import type { PreparedReport } from '../common/prepared-report';

import { BUGSNAG_NOTIFIER_API_KEY } from './bugsnag-api-key';
import { asDownloadTelemetry } from './dl-failed-telemetry';
import { getInstallationId } from './installation-id';
import { getReleaseStage } from './release-stage';
import {
  protectPreparedReport,
  reportingInteractionBreadcrumbs,
} from './reporting-protection';

export function startBugsnag(
  context: 'background' | 'options',
  capture: (report: PreparedReport) => Promise<NotifyResult>
) {
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
    reportingInteractionBreadcrumbs,
    limitEvents(20),
    navigationBreadcrumbs,
    stringifyValues,
  ];

  if (getReleaseStage() !== 'development') {
    plugins.push(consoleBreadcrumbs);
  }

  Bugsnag.setDelivery({
    sendEvent(payload) {
      protectPreparedReport(payload);
      const event = payload.events[0];
      // onError prepares download telemetry while the original Error is still
      // available. Extract it from the SDK snapshot and strip the private
      // routing fields before passing either destination's payload to capture.
      const download = event.metaData?.__10tenDownloadReport;
      // context retains the destination if SDK size limits discard metadata.
      // It is only a routing marker here, not part of the transmitted report.
      const isDownload = event.context === '10ten:download-failure';
      if (isDownload) {
        delete event.context;
      }
      if (event.metaData) {
        delete event.metaData.__10tenDownloadReport;
      }
      // The SDK may discard oversized metadata. Never fall through to Bugsnag
      // if doing so removed a download report's prepared payload.
      if (isDownload && !download) {
        return Promise.resolve({
          status: 'skipped',
          reason: 'download-payload-unavailable',
        } as const);
      }

      const reportContext = {
        source: context,
        capturedAt: event.device?.time || new Date().toISOString(),
        appVersion: event.app?.version || manifest.version,
      };
      return capture(
        download
          ? {
              destination: 'download-failure',
              payload: download,
              context: reportContext,
            }
          : { destination: 'bugsnag', payload, context: reportContext }
      );
    },
  });

  Bugsnag.start({
    apiKey: BUGSNAG_NOTIFIER_API_KEY,
    appVersion: manifest.version_name || manifest.version,
    collectUserIp: false,
    onError: async (event: BugsnagEvent) => {
      // Fill out the user ID
      const installationId =
        context === 'background'
          ? await getInstallationId()
          : await browser.runtime
              .sendMessage({ type: 'getReportingInstallationId' })
              .catch(() => undefined);
      const id =
        typeof installationId === 'string' ? installationId : undefined;
      event.user = { id };

      // Group download errors by URL and error code
      if (event.originalError instanceof DownloadError) {
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

      // Prepare routing data before the SDK discards originalError. Delivery
      // strips these private fields before capture, storage, or transmission.
      event.metaData ??= {};
      event.metaData.__10tenDownloadReport = asDownloadTelemetry(
        event.originalError,
        manifest.version_name || manifest.version,
        id
      );
      if (event.metaData.__10tenDownloadReport) {
        event.context = '10ten:download-failure';
      }

      return true;
    },
    plugins,
  });
}
