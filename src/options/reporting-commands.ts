import browser from 'webextension-polyfill';

import type { ReportBatchReply } from '../common/report-batch';
import type { ReportingConsent } from '../common/reporting-consent';

// Use the IDs and revision displayed to the user. A stale-state reply requires
// refreshing the display and a new gesture, never silently selecting more data.
export function sendReportsOnce(
  selectedIds: Array<string>,
  expectedRevision: number
): Promise<ReportBatchReply> {
  return browser.runtime.sendMessage({
    type: 'sendReportsOnce',
    selectedIds,
    expectedRevision,
  });
}

// Call directly from the user event, with an initialized consent adapter.
// Submit the fixed selection before starting the native permission prompt and
// do not await messaging before request(): Firefox requires the user gesture.
// The background batch runs independently even if options closes mid-prompt.
export async function sendReportsAndEnable(
  selectedIds: Array<string>,
  expectedRevision: number,
  consent: ReportingConsent
) {
  const batch = sendReportsOnce(selectedIds, expectedRevision);
  const enabling = consent.setEnabled(true).then(
    () =>
      consent.state.mode === 'error' || consent.state.mode === 'loading'
        ? ('error' as const)
        : consent.state.enabled
          ? ('enabled' as const)
          : ('off' as const),
    () => 'error' as const
  );
  const [reply, automaticReporting] = await Promise.all([batch, enabling]);
  return { reply, automaticReporting };
}

export function retryReportBatch(id: string): Promise<ReportBatchReply> {
  return browser.runtime.sendMessage({ type: 'retryReportBatch', id });
}
