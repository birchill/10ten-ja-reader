import { Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import type {
  SavedReport,
  SavedReportSummary,
} from '../background/report-queue';
import { useLocale } from '../common/i18n';
import { REPORT_CONTENT_ATTRIBUTE } from '../utils/reporting-protection';

import { ReportingButton } from './ReportingButton';
import {
  canRetrySend,
  formatReportDate,
  plural,
  reportCategory,
  reportDestination,
  reportTitle,
  sendResultText,
  sendingText,
} from './report-display';
import type {
  ReportingActions,
  ReportingViewState,
  ViewerPlacement,
} from './use-reporting';
import { isBusy, isSendingBlocked } from './use-reporting';

type Props = { state: ReportingViewState; actions: ReportingActions };

const reportContent = { [REPORT_CONTENT_ATTRIBUTE]: '' };

export function SavedReports({ state, actions }: Props) {
  const { t } = useLocale();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { consent, policy, reports } = state;
  const loading =
    consent.mode === 'loading' ||
    policy.status === 'loading' ||
    reports.status === 'loading';
  const count = reports.status === 'ready' ? reports.records.length : 0;
  const hasReports = !loading && count > 0;
  const send = state.send?.origin === 'settings' ? state.send : undefined;
  const sendingBlocked = isSendingBlocked(state);

  const heading = (
    <h2 class="m-0 text-base font-semibold">
      {t('options_saved_reports_heading')}
    </h2>
  );

  // Storage prohibition clears saved reports in background and hides them.
  // Always say so, even when automatic reporting would otherwise hide this
  // section.
  if (policy.status === 'ready' && policy.disableLocalErrorStorage) {
    return (
      <div class="mt-1 flex flex-col gap-2.5 ps-[22px]">
        {heading}
        <p class="m-0">{t('options_saved_reports_storage_disabled')}</p>
      </div>
    );
  }

  // Once automatic reporting is on, this section only matters while there are
  // reports left over or something to report.
  const visible =
    loading ||
    !consent.enabled ||
    count > 0 ||
    reports.status !== 'ready' ||
    !!send ||
    !!state.deleteResult;
  if (!visible) {
    return null;
  }

  const statusText = loading
    ? t('options_saved_reports_checking')
    : reports.status === 'unsupported'
      ? t('options_saved_reports_unsupported')
      : reports.status === 'error'
        ? t('options_saved_reports_load_failed')
        : count
          ? plural(t, 'options_saved_reports_count', count)
          : t('options_saved_reports_none');
  const canDeleteAll = hasReports || reports.status === 'unsupported';

  return (
    <div class="mt-1 flex flex-col gap-2.5 ps-[22px]">
      {heading}
      <p class="m-0">
        {sendingBlocked && !loading
          ? t('options_saved_reports_description_blocked')
          : consent.enabled
            ? t('options_saved_reports_description_on')
            : t('options_saved_reports_description_off')}
      </p>
      <div class="flex min-w-0 flex-col rounded-lg border border-solid border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800">
        <div class="flex items-center gap-2 py-1.5 ps-1.5 pe-2.5">
          {hasReports ? (
            <button
              type="button"
              class="flex min-w-0 flex-[1_1_0] cursor-pointer scroll-mt-6 items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-start! font-[inherit] whitespace-normal! text-inherit hover:bg-zinc-200 dark:hover:bg-zinc-700"
              aria-expanded={state.viewerOpen.settings}
              aria-controls="settings-saved-reports-viewer"
              data-reporting-focus="viewer"
              onClick={() =>
                actions.setViewerOpen('settings', !state.viewerOpen.settings)
              }
            >
              <Chevron open={state.viewerOpen.settings} />
              <span class="flex min-w-0 flex-col gap-px">
                <span class="font-medium">{statusText}</span>
                <span class="text-sm text-zinc-600 dark:text-zinc-400">
                  {state.viewerOpen.settings
                    ? t('options_saved_reports_hide')
                    : t('options_saved_reports_show')}
                </span>
              </span>
            </button>
          ) : (
            <span
              class="flex-1 px-2 py-1.5 font-medium"
              tabIndex={-1}
              data-reporting-focus="saved-status"
            >
              {statusText}
            </span>
          )}
          {canDeleteAll && !confirmingDelete && (
            <ReportingButton
              variant="secondary"
              size="small"
              onClick={() => setConfirmingDelete(true)}
            >
              {t('options_saved_reports_delete_all')}
            </ReportingButton>
          )}
        </div>
        {canDeleteAll && confirmingDelete && (
          <DeleteAllConfirmation
            count={count}
            onConfirm={() => {
              setConfirmingDelete(false);
              actions.deleteAllReports();
            }}
            onCancel={() => setConfirmingDelete(false)}
          />
        )}
        {state.viewerOpen.settings && hasReports && (
          <SavedReportsViewer
            state={state}
            actions={actions}
            placement="settings"
          />
        )}
        {send?.status === 'sending' && (
          <div class="flex flex-col gap-2 px-4 pb-4">
            <p
              class="m-0"
              role="status"
              tabIndex={-1}
              data-reporting-focus="settings-status"
            >
              {sendingText(t, send.total)}
            </p>
            <progress class="w-50 max-w-full" />
          </div>
        )}
        {send && send.status !== 'sending' && (
          <div class="mx-4 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-solid border-zinc-300 bg-white px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-900">
            <p
              class="m-0 flex-[1_1_240px]"
              role="status"
              tabIndex={-1}
              data-reporting-focus="settings-status"
            >
              {sendResultText(t, state, send)}
            </p>
            {canRetrySend(state, send) && (
              <ReportingButton
                variant="secondary"
                size="small"
                disabled={isBusy(state)}
                onClick={actions.retrySend}
              >
                {t('options_error_reporting_try_again')}
              </ReportingButton>
            )}
          </div>
        )}
      </div>
      {state.deleteResult && (
        <p class="m-0 text-zinc-600 dark:text-zinc-400" role="status">
          {state.deleteResult === 'deleted'
            ? t('options_saved_reports_deleted')
            : t('options_saved_reports_delete_failed')}
        </p>
      )}
    </div>
  );
}

// Shown in the settings section and, since the page may not be able to scroll
// there, inside the notice at the top of the page too.
export function SavedReportsViewer(
  props: Props & { placement: ViewerPlacement }
) {
  const { t } = useLocale();
  const { state, actions, placement } = props;
  const { consent, reports } = state;
  const count = reports.records.length;
  const sendingBlocked = isSendingBlocked(state);

  return (
    <div
      id={`${placement}-saved-reports-viewer`}
      role="region"
      aria-label={t('options_saved_reports_viewer_label')}
      class={
        placement === 'settings'
          ? 'flex min-w-0 flex-col gap-3 px-4 pt-1 pb-4'
          : 'flex min-w-0 flex-col gap-3 rounded-lg border border-solid border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900'
      }
      {...reportContent}
    >
      <p class="m-0 text-sm text-zinc-600 dark:text-zinc-400">
        {sendingBlocked
          ? t('options_saved_reports_viewer_intro_blocked')
          : t('options_saved_reports_viewer_intro')}
      </p>
      <ul class="m-0 list-none border-0 border-t border-solid border-zinc-300 p-0 dark:border-zinc-600">
        {reports.records.map((summary) => (
          <SavedReportRow
            key={summary.id}
            placement={placement}
            summary={summary}
            report={state.details[summary.id]}
            detailsFailed={!!state.failedDetails[summary.id]}
            onRetryDetails={() => actions.retryReportDetails(summary.id)}
            onDelete={() => actions.deleteReport(summary.id, placement)}
          />
        ))}
      </ul>
      {/* The notice has its own send buttons. */}
      {placement === 'settings' &&
        !sendingBlocked &&
        state.send?.status !== 'sending' && (
          <div class="flex flex-wrap gap-2">
            <ReportingButton
              variant="primary"
              disabled={isBusy(state)}
              onClick={() => actions.sendReports('settings', false)}
            >
              {plural(t, 'options_send_reports', count)}
            </ReportingButton>
            {!consent.enabled &&
              (consent.mode === 'native' || consent.mode === 'local') && (
                <ReportingButton
                  variant="secondary"
                  disabled={isBusy(state)}
                  onClick={() => actions.sendReports('settings', true)}
                >
                  {t('options_send_reports_and_enable')}
                </ReportingButton>
              )}
          </div>
        )}
    </div>
  );
}

function DeleteAllConfirmation(props: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);

  // Move focus into the confirmation, onto the safe choice.
  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
  }, []);

  return (
    <div
      ref={ref}
      class="mx-2.5 mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-solid border-red-300 bg-white px-3 py-2.5 dark:border-red-300/60 dark:bg-zinc-900"
      role="group"
      aria-labelledby="delete-all-reports-question"
    >
      <p id="delete-all-reports-question" class="m-0 flex-[1_1_240px]">
        {props.count
          ? plural(t, 'options_saved_reports_delete_all_confirm', props.count)
          : t('options_saved_reports_delete_all_confirm_unknown')}
      </p>
      <div class="flex gap-2">
        <ReportingButton
          variant="secondary"
          size="small"
          onClick={props.onCancel}
        >
          {t('options_saved_reports_cancel')}
        </ReportingButton>
        <button
          type="button"
          class="cursor-pointer rounded-md border border-solid border-red-900 bg-red-900 px-3 py-1 font-[inherit] text-sm whitespace-normal! text-white hover:border-red-800 hover:bg-red-800 dark:border-red-200 dark:bg-red-200 dark:text-black dark:hover:bg-red-100"
          onClick={props.onConfirm}
        >
          {t('options_saved_reports_delete_all_confirm_button')}
        </button>
      </div>
    </div>
  );
}

function SavedReportRow(props: {
  placement: ViewerPlacement;
  summary: SavedReportSummary;
  report?: SavedReport;
  detailsFailed: boolean;
  onRetryDetails: () => void;
  onDelete: () => void;
}) {
  const { t, langTag } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const { summary, report } = props;

  const title = reportTitle(t, summary, report);
  const occurrences = plural(
    t,
    'options_saved_report_occurrences',
    summary.occurrences.count
  );
  const firstSeen = formatReportDate(summary.occurrences.firstSeenAt, langTag);
  const detailsId = `${props.placement}-saved-report-${summary.id}`;
  const deliveryBadge =
    summary.delivery.state === 'ready'
      ? undefined
      : t(`options_saved_report_state_${summary.delivery.state}`);

  return (
    <li class="flex flex-col gap-2.5 border-0 border-b border-solid border-zinc-300 py-2.5 dark:border-zinc-600">
      <div class="flex items-start gap-2">
        <button
          type="button"
          class="-m-1 flex min-w-0 flex-[1_1_0] cursor-pointer items-start gap-2 rounded-md border-0 bg-transparent p-1 text-start! font-[inherit] whitespace-normal! text-inherit hover:bg-zinc-100 dark:hover:bg-zinc-700"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded(!expanded)}
        >
          <Chevron open={expanded} class="mt-[3px]" />
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="font-medium break-words">{title}</span>
            <span class="text-sm text-zinc-600 dark:text-zinc-400">
              {[reportCategory(t, summary), firstSeen, occurrences].join(' · ')}
            </span>
            <span class="text-sm text-zinc-600 dark:text-zinc-400">
              {t(
                'options_saved_report_sends_to',
                reportDestination(t, summary)
              )}
            </span>
          </span>
        </button>
        {deliveryBadge && (
          <span class="self-center rounded-md border border-solid border-zinc-400 px-2 py-0.5 text-xs font-medium dark:border-zinc-500">
            {deliveryBadge}
          </span>
        )}
        <button
          type="button"
          class="-my-2 -me-2 flex size-[40px]! shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-zinc-600 hover:bg-zinc-200 hover:text-inherit dark:text-zinc-400 dark:hover:bg-zinc-700"
          aria-label={t('options_saved_report_delete_label', title)}
          title={t('options_saved_report_delete')}
          onClick={props.onDelete}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      </div>
      {expanded && (
        <div id={detailsId} class="ms-6 flex min-w-0 flex-col gap-2.5">
          <DetailList
            items={[
              [
                t('options_saved_report_destination'),
                reportDestination(t, summary),
              ],
              [t('options_saved_report_first_seen'), firstSeen],
              ...(summary.occurrences.count > 1
                ? [
                    [
                      t('options_saved_report_last_seen'),
                      formatReportDate(summary.occurrences.lastSeenAt, langTag),
                    ] as [string, string],
                  ]
                : []),
              [t('options_saved_report_occurrences'), occurrences],
              [
                t('options_saved_report_recorded_in'),
                t(`options_saved_report_source_${summary.context.source}`),
              ],
              [t('options_saved_report_version'), summary.context.appVersion],
            ]}
          />
          <div class="flex min-w-0 flex-col gap-1">
            <span class="text-sm font-medium">
              {t('options_saved_report_delivery_heading')}
            </span>
            <DetailList
              items={[
                [
                  t('options_saved_report_delivery_status'),
                  t(`options_saved_report_state_${summary.delivery.state}`),
                ],
                [
                  t('options_saved_report_attempts'),
                  String(summary.delivery.attempts),
                ],
                ...(summary.delivery.lastAttemptAt
                  ? [
                      [
                        t('options_saved_report_last_attempt'),
                        formatReportDate(
                          summary.delivery.lastAttemptAt,
                          langTag
                        ),
                      ] as [string, string],
                    ]
                  : []),
                ...(summary.delivery.outcome
                  ? [
                      [
                        t('options_saved_report_last_result'),
                        summary.delivery.statusCode
                          ? `${summary.delivery.outcome} (HTTP ${summary.delivery.statusCode})`
                          : summary.delivery.outcome,
                      ] as [string, string],
                    ]
                  : []),
              ]}
            />
          </div>
          <div class="flex min-w-0 flex-col gap-1">
            <span class="text-sm font-medium">
              {t('options_saved_report_data_heading')}
            </span>
            {report ? (
              <pre
                tabIndex={0}
                aria-label={t('options_saved_report_data_label')}
                class="m-0 max-h-60 overflow-auto rounded-md border border-solid border-zinc-300 bg-white px-3 py-2.5 font-mono text-xs leading-normal whitespace-pre dark:border-zinc-600 dark:bg-zinc-900"
              >
                {JSON.stringify(report.payload, null, 2)}
              </pre>
            ) : props.detailsFailed ? (
              <p class="m-0" role="status">
                {t('options_saved_report_data_load_failed')}{' '}
                <ReportingButton variant="link" onClick={props.onRetryDetails}>
                  {t('options_error_reporting_try_again')}
                </ReportingButton>
              </p>
            ) : (
              <progress class="w-50 max-w-full" />
            )}
          </div>
          <div>
            <ReportingButton
              variant="secondary"
              size="small"
              onClick={props.onDelete}
            >
              {t('options_saved_report_delete')}
            </ReportingButton>
          </div>
        </div>
      )}
    </li>
  );
}

function DetailList(props: { items: Array<[string, string]> }) {
  return (
    <dl class="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
      {props.items.map(([term, description]) => (
        <Fragment key={term}>
          <dt class="text-zinc-600 dark:text-zinc-400">{term}</dt>
          <dd class="m-0 break-words">{description}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

function Chevron(props: { open: boolean; class?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      class={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${props.open ? 'rotate-90 rtl:-rotate-90' : 'rtl:rotate-180'} ${props.class ?? ''}`}
    >
      <path
        d="M6 3.5 10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}
