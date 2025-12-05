import { DownloadError } from '@birchill/jpdict-idb';

import { FxDownloadError } from '../background/fx-fetcher';

import { fetchWithTimeout } from './fetch';
import { getHash } from './hash';

// Some errors are so common (e.g. download errors) that they don't qualify as
// errors we want to report but rather as telemetry events to monitor.
export function maybeSendTelemetry(
  error: unknown,
  version: string,
  uid: string
): boolean {
  const downloadTelemetry = asDownloadTelemetry(error, version, uid);
  if (!downloadTelemetry) {
    return false;
  }

  // Don't block waiting for our request to be sent
  fetchWithTimeout('https://data.10ten.life/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(downloadTelemetry),
    mode: 'cors',
    timeout: 10_000,
  })
    .then((response) => {
      if (!response.ok) {
        void (async () => {
          if (response.status === 400) {
            try {
              const data = await response.json();
              if (typeof data.error === 'string') {
                console.error(
                  `Failed to send download failure report: ${data.error}`
                );
                return;
              }
            } catch {
              // Ignore
            }
          }

          console.error(
            'Failed to send download failure report',
            response.status,
            response.statusText
          );
        })();
      }
    })
    .catch((error) => {
      console.error('Failed to send download failure report', error);
    });

  return true;
}

type DownloadTelemetry = {
  t: 'dl_failed';
  etype: 'timeout' | 'network' | 'syntax';
  url: string;
  v: string;
  uid?: string;
  msg?: string;
};

function asDownloadTelemetry(
  error: unknown,
  version: string,
  uid: string
): DownloadTelemetry | null {
  if (
    !(error instanceof DownloadError) &&
    !(error instanceof FxDownloadError)
  ) {
    return null;
  }

  let etype: DownloadTelemetry['etype'] | undefined;
  switch (error.code) {
    // DownloadError and FxDownloadError:
    case 'Timeout':
      etype = 'timeout';
      break;

    // FxDownloadError codes:

    case 'NetworkError':
      etype = 'network';
      break;

    case 'SyntaxError':
      etype = 'syntax';
      break;

    // DownloadError codes:

    case 'VersionFileNotFound':
    case 'VersionFileNotAccessible':
    case 'DatabaseFileNotFound':
    case 'DatabaseFileNotAccessible':
      etype = 'network';
      break;

    case 'VersionFileInvalid':
    case 'DatabaseFileInvalidJSON':
      etype = 'syntax';
      break;

    // Deliberately excluded:
    //
    // - MajorVersionNotFound
    // - DatabaseTooOld
    // - DatabaseFileHeaderMissing
    // - DatabaseFileHeaderDuplicate
    // - DatabaseFileVersionMismatch
    // - DatabaseFileInvalidRecord
  }

  if (!etype) {
    return null;
  }

  const userIdHash = getHash(uid);

  return {
    t: 'dl_failed',
    etype,
    url: error.url,
    v: version,
    uid: userIdHash,
    msg: error.message,
  };
}
