import { DownloadError } from '@birchill/jpdict-idb';

import { FxDownloadError } from '../background/fx-fetcher';

import { getHash } from './hash';
import { protectDiagnosticText } from './reporting-protection';

export type DownloadTelemetry = {
  t: 'dl_failed';
  etype: 'timeout' | 'network' | 'syntax';
  url: string;
  v: string;
  uid?: string;
  msg?: string;
};

export function asDownloadTelemetry(
  error: unknown,
  version: string,
  uid: string | undefined
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

  const userIdHash = uid ? getHash(uid) : undefined;

  return {
    t: 'dl_failed',
    etype,
    url: error.url,
    v: version,
    uid: userIdHash,
    msg: protectDiagnosticText(error.message),
  };
}
