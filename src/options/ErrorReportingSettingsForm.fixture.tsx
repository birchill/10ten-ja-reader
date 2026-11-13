import { useMemo, useState } from 'preact/hooks';

import type {
  SavedReport,
  SavedReportSummary,
} from '../background/report-queue';
import type { ReportBatch } from '../common/report-batch';

import { ErrorReportingNotice } from './ErrorReportingNotice';
import { ErrorReportingSettingsForm } from './ErrorReportingSettingsForm';
import './options.css';
import type {
  ActionOrigin,
  ReportingActions,
  ReportingViewState,
} from './use-reporting';

// Synthetic examples only.
const reports: Array<SavedReport> = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    destination: 'download-failure',
    payload: {
      t: 'dl_failed',
      etype: 'timeout',
      url: 'https://data.10ten.life/jpdict/reader/words/en/2.0.412-3.jsonl',
      v: '1.30.0',
      uid: 'synthetic-hash',
      msg: 'Download timed out after 30000 ms',
    },
    context: {
      source: 'background',
      capturedAt: '2026-11-08T05:02:11.000Z',
      appVersion: '1.30.0',
    },
    occurrences: {
      count: 4,
      firstSeenAt: '2026-11-08T05:02:11.000Z',
      lastSeenAt: '2026-11-08T05:14:40.000Z',
    },
    dedupKey: '0'.repeat(64),
    delivery: { state: 'ready', attempts: 0 },
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    destination: 'bugsnag',
    payload: {
      apiKey: 'synthetic',
      payloadVersion: '5',
      notifier: {
        name: 'Bugsnag Zero',
        version: '1.0.0',
        url: 'https://github.com/birchill/bugsnag-zero',
      },
      events: [
        {
          exceptions: [
            {
              errorClass: 'QuotaExceededError',
              message: 'The quota has been exceeded.',
              stacktrace: [
                {
                  file: 'background.js',
                  method: 'JpdictIdb.bulkUpdate',
                  lineNumber: 4821,
                },
              ],
            },
          ],
          breadcrumbs: [
            {
              name: 'Database update started',
              timestamp: '2026-11-07T00:40:52.000Z',
              type: 'manual',
              metaData: { series: 'words' },
            },
          ],
          app: { version: '1.30.0', releaseStage: 'production' },
          user: { id: '00000000-synthetic-0000-000000000001' },
        } as any,
      ],
    },
    context: {
      source: 'background',
      capturedAt: '2026-11-07T00:41:03.000Z',
      appVersion: '1.30.0',
    },
    occurrences: {
      count: 1,
      firstSeenAt: '2026-11-07T00:41:03.000Z',
      lastSeenAt: '2026-11-07T00:41:03.000Z',
    },
    dedupKey: '1'.repeat(64),
    delivery: {
      state: 'failed',
      attempts: 1,
      lastAttemptAt: '2026-11-07T00:41:04.000Z',
      outcome: 'failed',
      statusCode: 503,
    },
  },
];

const summaries: Array<SavedReportSummary> = reports.map(
  ({ payload: _payload, dedupKey: _dedupKey, ...summary }) => summary
);

const details = Object.fromEntries(reports.map((r) => [r.id, r]));

function batch(failedIds: Array<string> = []): ReportBatch {
  return {
    id: 'batch',
    status: 'complete',
    totalSelected: reports.length,
    sent: reports.length - failedIds.length,
    failed: failedIds.length,
    skipped: 0,
    results: reports.map((r) =>
      failedIds.includes(r.id)
        ? {
            id: r.id,
            status: 'failed' as const,
            reason: 'Diagnostic report rejected',
            statusCode: 503,
          }
        : { id: r.id, status: 'sent' as const }
    ),
  };
}

const base: ReportingViewState = {
  consent: { mode: 'native', enabled: false },
  policy: {
    status: 'ready',
    disableErrorReporting: false,
    disableLocalErrorStorage: false,
  },
  reports: { status: 'ready', revision: 3, records: summaries },
  details,
  failedDetails: {},
  noticeDismissed: false,
  dismissAcknowledged: false,
  viewerOpen: { notice: false, settings: false },
};

function Preview(props: { initial: ReportingViewState }) {
  const [state, setState] = useState(props.initial);
  const actions = useMemo<ReportingActions>(() => {
    const patch = (value: Partial<ReportingViewState>) =>
      setState((prev) => ({ ...prev, ...value }));
    const send = (origin: ActionOrigin, enable: boolean) =>
      patch({
        send: {
          origin,
          status: 'complete',
          batch: batch(),
          automaticReporting: enable ? 'enabled' : undefined,
        },
        reports: { ...base.reports, records: [] },
        consent: enable ? { mode: 'native', enabled: true } : base.consent,
      });
    return {
      setAutomaticReporting: (enabled) =>
        patch({
          consent: { mode: 'native', enabled },
          automaticMessage: enabled ? 'enabled-with-saved' : undefined,
        }),
      retryConsent: () => patch({ consent: base.consent }),
      sendReports: send,
      retrySend: () => send('settings', false),
      closeSendResult: () =>
        setState((prev) =>
          prev.send && prev.send.status !== 'sending'
            ? { ...prev, send: { ...prev.send, closed: true } }
            : prev
        ),
      deleteReport: (id) =>
        setState((prev) => ({
          ...prev,
          reports: {
            ...prev.reports,
            records: prev.reports.records.filter((r) => r.id !== id),
          },
        })),
      deleteAllReports: () =>
        patch({
          reports: { ...base.reports, records: [] },
          deleteResult: 'deleted',
          viewerOpen: { notice: false, settings: false },
        }),
      dismissNotice: () =>
        patch({ noticeDismissed: true, dismissAcknowledged: true }),
      undoDismissNotice: () =>
        patch({ noticeDismissed: false, dismissAcknowledged: false }),
      acknowledgeDismissal: () => patch({ dismissAcknowledged: false }),
      setViewerOpen: (placement, open) =>
        setState((prev) => ({
          ...prev,
          viewerOpen: { ...prev.viewerOpen, [placement]: open },
        })),
      reviewSavedReports: () =>
        setState((prev) => ({
          ...prev,
          viewerOpen: { ...prev.viewerOpen, settings: true },
        })),
      retryReportDetails: (id) =>
        setState((prev) => ({
          ...prev,
          details: { ...prev.details, [id]: details[id] },
          failedDetails: {},
        })),
    };
  }, []);

  return (
    <div class="mx-auto max-w-[780px] px-6 pt-6 pb-16">
      <ErrorReportingNotice state={state} actions={actions} />
      <ErrorReportingSettingsForm state={state} actions={actions} />
    </div>
  );
}

export default {
  'Reporting off, saved reports': <Preview initial={base} />,
  'Reporting off, no saved reports': (
    <Preview initial={{ ...base, reports: { ...base.reports, records: [] } }} />
  ),
  'Inspecting reports': (
    <Preview
      initial={{ ...base, viewerOpen: { notice: false, settings: true } }}
    />
  ),
  'Report data unavailable': (
    <Preview
      initial={{
        ...base,
        details: {},
        failedDetails: Object.fromEntries(
          reports.map((r) => [r.id, true as const])
        ),
        viewerOpen: { notice: false, settings: true },
      }}
    />
  ),
  'Inspecting reports from notice': (
    <Preview
      initial={{ ...base, viewerOpen: { notice: true, settings: false } }}
    />
  ),
  Loading: (
    <Preview
      initial={{
        ...base,
        consent: { mode: 'loading', enabled: false },
        reports: { status: 'loading', revision: -1, records: [] },
      }}
    />
  ),
  'Sending from notice': (
    <Preview
      initial={{
        ...base,
        send: { origin: 'notice', status: 'sending', total: 2 },
      }}
    />
  ),
  'Partial success': (
    <Preview
      initial={{
        ...base,
        reports: { ...base.reports, records: [summaries[1]] },
        send: {
          origin: 'notice',
          status: 'complete',
          batch: batch([reports[1].id]),
        },
      }}
    />
  ),
  'Sent and enabled, permission declined': (
    <Preview
      initial={{
        ...base,
        reports: { ...base.reports, records: [] },
        send: {
          origin: 'notice',
          status: 'complete',
          batch: batch(),
          automaticReporting: 'off',
        },
      }}
    />
  ),
  'Waiting for permission prompt': (
    <Preview initial={{ ...base, automaticPending: 'prompt' }} />
  ),
  'Enabled with saved reports': (
    <Preview
      initial={{
        ...base,
        consent: { mode: 'native', enabled: true },
        automaticMessage: 'enabled-with-saved',
      }}
    />
  ),
  'Notice dismissed': (
    <Preview
      initial={{ ...base, noticeDismissed: true, dismissAcknowledged: true }}
    />
  ),
  'Sending disabled by organization': (
    <Preview
      initial={{
        ...base,
        policy: { ...base.policy, disableErrorReporting: true },
      }}
    />
  ),
  'Storage disabled by organization': (
    <Preview
      initial={{
        ...base,
        policy: { ...base.policy, disableLocalErrorStorage: true },
        reports: { ...base.reports, records: [] },
      }}
    />
  ),
  'Setting unavailable': (
    <Preview
      initial={{ ...base, consent: { mode: 'error', enabled: false } }}
    />
  ),
};
