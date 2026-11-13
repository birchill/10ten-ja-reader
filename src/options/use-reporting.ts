import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Storage } from 'webextension-polyfill';
import browser from 'webextension-polyfill';

import type {
  SavedReport,
  SavedReportSummary,
} from '../background/report-queue';
import type { ReportBatch, ReportBatchReply } from '../common/report-batch';
import type { ReportingConsentState } from '../common/reporting-consent';
import { ReportingConsent } from '../common/reporting-consent';
import type { ReportingPolicyState } from '../common/reporting-policy';
import { ReportingPolicy } from '../common/reporting-policy';

import {
  deleteAllReports,
  deleteReport,
  readReport,
  readReportingState,
  retryReportBatch,
  sendReportsAndEnable,
  sendReportsOnce,
} from './reporting-commands';

// Stored locally, never synced. Dismissal is permanent and independent of
// consent, saved reports, and privacy-policy revision notices.
const NOTICE_DISMISSED_KEY = 'errorReportNoticeDismissed';
const REPORT_QUEUE_KEY = 'diagnosticReports';
const BATCH_POLL_INTERVAL = 1000;

export type SavedReportsState = Readonly<{
  status: 'loading' | 'ready' | 'error' | 'unsupported';
  revision: number;
  records: ReadonlyArray<SavedReportSummary>;
}>;

export type ActionOrigin = 'notice' | 'settings';

export type AutomaticReportingOutcome = 'enabled' | 'off' | 'error';

export type SendState = Readonly<
  | {
      origin: ActionOrigin;
      status: 'sending';
      total: number;
      // Set while following a batch to completion by polling, e.g. one
      // started in another options page.
      batchId?: string;
      automaticReporting?: AutomaticReportingOutcome;
    }
  | {
      origin: ActionOrigin;
      status: 'complete';
      batch: ReportBatch;
      automaticReporting?: AutomaticReportingOutcome;
      closed?: boolean;
    }
  | {
      origin: ActionOrigin;
      status: 'stale' | 'unavailable' | 'error';
      automaticReporting?: AutomaticReportingOutcome;
      closed?: boolean;
    }
>;

export type ViewerPlacement = 'notice' | 'settings';

export type ReportingFocusTarget =
  | 'notice'
  | 'notice-viewer'
  | 'notice-status'
  | 'dismiss-status'
  | 'automatic'
  | 'viewer'
  | 'settings-status'
  | 'saved-status';

export type ReportingViewState = Readonly<{
  consent: ReportingConsentState;
  policy: ReportingPolicyState;
  reports: SavedReportsState;
  // Full snapshots, read only while the viewer is open.
  details: Readonly<Record<string, SavedReport>>;
  // IDs whose full snapshot couldn't be read. Not read again until retried.
  failedDetails: Readonly<Record<string, true>>;
  // Undefined until read from storage.
  noticeDismissed: boolean | undefined;
  dismissAcknowledged: boolean;
  automaticPending?: 'prompt' | 'saving';
  automaticMessage?: 'declined' | 'enabled-with-saved';
  send?: SendState;
  deleteResult?: 'deleted' | 'failed';
  // Firefox embeds this page in about:addons, which sizes it to its content
  // and scrolls the embedding page. We can't scroll that from here so the
  // notice opens its own copy of the viewer rather than linking to the one
  // at the bottom of the page.
  viewerOpen: Readonly<Record<ViewerPlacement, boolean>>;
  focus?: Readonly<{ target: ReportingFocusTarget; seq: number }>;
}>;

export type ReportingActions = {
  setAutomaticReporting: (enabled: boolean) => void;
  retryConsent: () => void;
  sendReports: (origin: ActionOrigin, enable: boolean) => void;
  retrySend: () => void;
  closeSendResult: () => void;
  deleteReport: (id: string, placement: ViewerPlacement) => void;
  deleteAllReports: () => void;
  dismissNotice: () => void;
  undoDismissNotice: () => void;
  acknowledgeDismissal: () => void;
  setViewerOpen: (placement: ViewerPlacement, open: boolean) => void;
  reviewSavedReports: () => void;
  retryReportDetails: (id: string) => void;
};

export function isSendingBlocked(state: ReportingViewState): boolean {
  return state.policy.disableErrorReporting;
}

export function isBusy(state: ReportingViewState): boolean {
  return state.send?.status === 'sending' || !!state.automaticPending;
}

export function shouldShowNotice(state: ReportingViewState): boolean {
  return (
    state.noticeDismissed === false &&
    state.consent.mode !== 'loading' &&
    !state.consent.enabled &&
    !isSendingBlocked(state) &&
    state.reports.status === 'ready' &&
    state.reports.records.length > 0
  );
}

// Background may reply with a batch that is still sending, e.g. when another
// options page started it first. Follow it to completion rather than treating
// the reply as its outcome.
function followBatch(
  origin: ActionOrigin,
  batch: ReportBatch,
  automaticReporting?: AutomaticReportingOutcome
): SendState {
  return batch.status === 'sending'
    ? {
        origin,
        status: 'sending',
        total: batch.totalSelected,
        batchId: batch.id,
        automaticReporting,
      }
    : { origin, status: 'complete', batch, automaticReporting };
}

// Reports from the original batch that were not sent and are still saved.
export function remainingInBatch(
  batch: ReportBatch,
  reports: SavedReportsState
): number {
  const saved = new Set(reports.records.map((record) => record.id));
  return batch.results.filter(
    (result) => result.status !== 'sent' && saved.has(result.id)
  ).length;
}

export function useReporting(): {
  state: ReportingViewState;
  actions: ReportingActions;
} {
  // Each extension context owns its own adapters. The options page needs its
  // own consent instance so permission requests run from the user gesture.
  const [consent] = useState(() => new ReportingConsent());
  const [policy] = useState(() => new ReportingPolicy());
  const [state, setState] = useState<ReportingViewState>(() => ({
    consent: consent.state,
    policy: policy.state,
    reports: { status: 'loading', revision: -1, records: [] },
    details: {},
    failedDetails: {},
    noticeDismissed: undefined,
    dismissAcknowledged: false,
    viewerOpen: { notice: false, settings: false },
  }));

  const focusSeq = useRef(0);
  const refreshSeq = useRef(0);
  const unmounted = useRef(false);

  const update = useCallback(
    (
      patch:
        | Partial<ReportingViewState>
        | ((state: ReportingViewState) => Partial<ReportingViewState>),
      focus?: ReportingFocusTarget
    ) => {
      if (unmounted.current) {
        return;
      }

      setState((prev) => ({
        ...prev,
        ...(typeof patch === 'function' ? patch(prev) : patch),
        ...(focus ? { focus: { target: focus, seq: ++focusSeq.current } } : {}),
      }));
    },
    []
  );

  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current;
    try {
      const reply = await readReportingState();
      if (seq !== refreshSeq.current) {
        return;
      }

      update((prev) => {
        const reports: SavedReportsState = {
          status: reply.status,
          revision: reply.revision,
          records: reply.records,
        };

        // Follow a batch started elsewhere, including a retry of one whose
        // result this page shows, so its buttons stay disabled and its
        // outcome is reported. A result still showing is replaced in place.
        let send = prev.send;
        const batch = reply.batch;
        if (batch?.status === 'sending' && send?.status !== 'sending') {
          send = followBatch(
            send && !send.closed ? send.origin : 'settings',
            batch
          );
        } else if (send?.status === 'sending' && send.batchId) {
          send =
            batch?.id === send.batchId
              ? followBatch(send.origin, batch, send.automaticReporting)
              : undefined;
        }

        const ids = new Set(reply.records.map((record) => record.id));
        const keep = <T>(record: Readonly<Record<string, T>>) =>
          Object.fromEntries(
            Object.entries(record).filter(([id]) => ids.has(id))
          );

        return {
          reports,
          send,
          details: keep(prev.details),
          failedDetails: keep(prev.failedDetails),
        };
      });
    } catch {
      if (seq === refreshSeq.current) {
        update((prev) => ({ reports: { ...prev.reports, status: 'error' } }));
      }
    }
  }, [update]);

  // Adapters, saved reports, and notice dismissal, with external changes.
  useEffect(() => {
    unmounted.current = false;
    const onConsent = (consentState: ReportingConsentState) =>
      update({ consent: consentState });
    const onPolicy = (policyState: ReportingPolicyState) =>
      update({ policy: policyState });
    consent.addChangeListener(onConsent);
    policy.addChangeListener(onPolicy);
    update({ consent: consent.state, policy: policy.state });

    const onStorageChanged = (
      changes: Record<string, Storage.StorageChange>,
      areaName: string | undefined
    ) => {
      // Safari 18 can omit areaName (WebKit bug 281644).
      if (areaName !== 'local' && areaName !== undefined) {
        return;
      }

      if (REPORT_QUEUE_KEY in changes) {
        void refresh();
      }

      if (NOTICE_DISMISSED_KEY in changes) {
        update({
          noticeDismissed: changes[NOTICE_DISMISSED_KEY].newValue === true,
        });
      }
    };
    browser.storage.onChanged.addListener(onStorageChanged);

    void refresh();
    browser.storage.local.get(NOTICE_DISMISSED_KEY).then(
      (values) =>
        update({ noticeDismissed: values[NOTICE_DISMISSED_KEY] === true }),
      // Without storage we can't remember a dismissal, so don't nag.
      () => update({ noticeDismissed: true })
    );

    return () => {
      unmounted.current = true;
      browser.storage.onChanged.removeListener(onStorageChanged);
      consent.dispose();
      policy.dispose();
    };
  }, [consent, policy, refresh, update]);

  // Poll a batch started elsewhere: the queue doesn't necessarily change when
  // its last request finishes.
  const externalBatch =
    state.send?.status === 'sending' ? state.send.batchId : undefined;
  useEffect(() => {
    if (!externalBatch) {
      return;
    }

    const timer = setInterval(() => void refresh(), BATCH_POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [externalBatch, refresh]);

  // Read full reports for the viewer, once each until a failed read is retried.
  const pendingDetails = useRef(new Set<string>());
  const missingDetails =
    state.viewerOpen.notice || state.viewerOpen.settings
      ? state.reports.records
          .filter(
            (record) =>
              !state.details[record.id] && !state.failedDetails[record.id]
          )
          .map((record) => record.id)
          .join(',')
      : '';
  useEffect(() => {
    if (!missingDetails) {
      return;
    }

    for (const id of missingDetails.split(',')) {
      if (pendingDetails.current.has(id)) {
        continue;
      }

      pendingDetails.current.add(id);
      const failed = () =>
        update((prev) => ({
          failedDetails: { ...prev.failedDetails, [id]: true },
        }));
      readReport(id)
        .then(
          (report) =>
            report
              ? update((prev) => ({
                  details: { ...prev.details, [id]: report },
                }))
              : failed(),
          failed
        )
        .finally(() => pendingDetails.current.delete(id));
    }
  }, [missingDetails, update]);

  // Move focus after the corresponding content has rendered.
  useEffect(() => {
    if (!state.focus) {
      return;
    }

    const element = document.querySelector<HTMLElement>(
      `[data-reporting-focus="${state.focus.target}"]`
    );
    if (!element) {
      return;
    }

    // Firefox's about:addons and Chrome's options dialog size this page to
    // its content and scroll the embedding page instead. focus() only scrolls
    // our own document but scrollIntoView() also scrolls the embedder.
    element.focus({ preventScroll: true });
    element.scrollIntoView?.({
      block: state.focus.target === 'viewer' ? 'start' : 'nearest',
    });
  }, [state.focus]);

  // Actions are plain functions of this render's state. Only update() and
  // refresh() need stable identities, for the effects above.
  const busy = isBusy(state);
  const statusFocus = (origin: ActionOrigin) =>
    origin === 'notice' ? 'notice-status' : 'settings-status';

  const finishSend = (
    origin: ActionOrigin,
    reply: ReportBatchReply,
    automaticReporting?: AutomaticReportingOutcome
  ) => {
    update(
      {
        send:
          reply.status === 'ok'
            ? followBatch(origin, reply.batch, automaticReporting)
            : {
                origin,
                status:
                  reply.status === 'stale-state' ? 'stale' : 'unavailable',
                automaticReporting,
              },
      },
      statusFocus(origin)
    );
    void refresh();
  };

  const failSend = (
    origin: ActionOrigin,
    automaticReporting?: AutomaticReportingOutcome
  ) => {
    update(
      { send: { origin, status: 'error', automaticReporting } },
      statusFocus(origin)
    );
    void refresh();
  };

  const actions: ReportingActions = {
    setAutomaticReporting(enabled) {
      const { mode } = consent.state;
      if (mode !== 'native' && mode !== 'local') {
        return;
      }

      // Call setEnabled synchronously: Firefox's permission request requires
      // the user gesture. Enabling never sends saved reports.
      const enabling = consent.setEnabled(enabled);
      update({
        automaticPending: enabled && mode === 'native' ? 'prompt' : 'saving',
        automaticMessage: undefined,
        deleteResult: undefined,
      });
      enabling.then(
        () => {
          const result = consent.state;
          update(
            (prev) => ({
              consent: result,
              automaticPending: undefined,
              automaticMessage: !enabled
                ? undefined
                : result.enabled
                  ? prev.reports.records.length
                    ? 'enabled-with-saved'
                    : undefined
                  : result.mode === 'native'
                    ? 'declined'
                    : undefined,
            }),
            'automatic'
          );
        },
        // The adapter now reports an error state, which offers a retry.
        () =>
          update(
            { consent: consent.state, automaticPending: undefined },
            'automatic'
          )
      );
    },

    retryConsent() {
      void consent.refresh();
    },

    sendReports(origin, enable) {
      if (
        busy ||
        isSendingBlocked(state) ||
        state.reports.status !== 'ready' ||
        !state.reports.records.length
      ) {
        return;
      }

      // Send exactly the reports displayed. If anything changed in the
      // meantime, background replies with stale-state and sends nothing.
      const ids = state.reports.records.map((record) => record.id);
      const revision = state.reports.revision;
      const sending = enable
        ? sendReportsAndEnable(ids, revision, consent)
        : sendReportsOnce(ids, revision).then((reply) => ({
            reply,
            automaticReporting: undefined,
          }));
      update(
        {
          send: { origin, status: 'sending', total: ids.length },
          automaticMessage: undefined,
          deleteResult: undefined,
          dismissAcknowledged: false,
        },
        statusFocus(origin)
      );
      sending.then(
        ({ reply, automaticReporting }) =>
          finishSend(origin, reply, automaticReporting),
        () =>
          failSend(
            origin,
            enable ? (consent.state.enabled ? 'enabled' : 'error') : undefined
          )
      );
    },

    retrySend() {
      const send = state.send;
      if (send?.status !== 'complete' || busy) {
        return;
      }

      // Background retries only the original batch's surviving reports.
      update(
        {
          send: {
            origin: send.origin,
            status: 'sending',
            total: remainingInBatch(send.batch, state.reports),
          },
        },
        statusFocus(send.origin)
      );
      retryReportBatch(send.batch.id).then(
        (reply) => finishSend(send.origin, reply),
        () => failSend(send.origin)
      );
    },

    closeSendResult() {
      update(
        (prev) => ({
          send:
            prev.send && prev.send.status !== 'sending'
              ? { ...prev.send, closed: true }
              : prev.send,
        }),
        // The page may not be able to scroll to anything further down so let
        // focus return to the start of the page otherwise.
        shouldShowNotice(state) ? 'notice' : undefined
      );
    },

    deleteReport(id, placement) {
      const othersRemain = state.reports.records.some(
        (record) => record.id !== id
      );
      deleteReport(id).then(
        (deleted) => {
          update(
            { deleteResult: deleted ? undefined : 'failed' },
            placement === 'notice'
              ? othersRemain
                ? 'notice-viewer'
                : undefined
              : othersRemain
                ? 'viewer'
                : 'saved-status'
          );
          void refresh();
        },
        () => update({ deleteResult: 'failed' })
      );
    },

    deleteAllReports() {
      deleteAllReports().then(
        (deleted) => {
          update(
            (prev) => ({
              deleteResult: deleted ? 'deleted' : 'failed',
              viewerOpen: deleted
                ? { notice: false, settings: false }
                : prev.viewerOpen,
              automaticMessage: undefined,
              send: prev.send?.status === 'sending' ? prev.send : undefined,
            }),
            'saved-status'
          );
          void refresh();
        },
        () => update({ deleteResult: 'failed' }, 'saved-status')
      );
    },

    dismissNotice() {
      update(
        { noticeDismissed: true, dismissAcknowledged: true },
        'dismiss-status'
      );
      void browser.storage.local
        .set({ [NOTICE_DISMISSED_KEY]: true })
        .catch(() => {});
    },

    undoDismissNotice() {
      update({ noticeDismissed: false, dismissAcknowledged: false }, 'notice');
      void browser.storage.local.remove(NOTICE_DISMISSED_KEY).catch(() => {});
    },

    acknowledgeDismissal() {
      update({ dismissAcknowledged: false });
    },

    setViewerOpen(placement, open) {
      update((prev) => ({
        viewerOpen: { ...prev.viewerOpen, [placement]: open },
      }));
    },

    // Opens the viewer next to the automatic reporting checkbox.
    reviewSavedReports() {
      update(
        (prev) => ({ viewerOpen: { ...prev.viewerOpen, settings: true } }),
        'viewer'
      );
    },

    // Clearing the failure lets the viewer read the report again.
    retryReportDetails(id) {
      update((prev) => {
        const { [id]: _failed, ...failedDetails } = prev.failedDetails;
        return { failedDetails };
      });
    },
  };

  return { state, actions };
}
