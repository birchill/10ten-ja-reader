import type { RenderableProps } from 'preact';

import { useLocale } from '../common/i18n';

import { ReportingButton } from './ReportingButton';
import { SavedReportsViewer } from './SavedReports';
import {
  canRetrySend,
  plural,
  privacyPolicyUrl,
  sendResultText,
  sendingText,
} from './report-display';
import type { ReportingActions, ReportingViewState } from './use-reporting';
import { shouldShowNotice } from './use-reporting';

type Props = { state: ReportingViewState; actions: ReportingActions };

// A calm notice at the top of the options page, offering to send reports
// saved while automatic reporting is off.
export function ErrorReportingNotice({ state, actions }: Props) {
  const { t, langTag } = useLocale();
  const send = state.send?.origin === 'notice' ? state.send : undefined;
  const count = state.reports.records.length;
  const viewerOpen = state.viewerOpen.notice && count > 0;
  const viewerToggle = (variant: 'link' | 'secondary') => (
    <ReportingButton
      variant={variant}
      aria-expanded={viewerOpen}
      aria-controls="notice-saved-reports-viewer"
      data-reporting-focus="notice-viewer"
      onClick={() => actions.setViewerOpen('notice', !viewerOpen)}
    >
      {viewerOpen
        ? t('options_saved_reports_hide')
        : t('options_report_notice_view')}
    </ReportingButton>
  );
  const viewer = viewerOpen && (
    <SavedReportsViewer state={state} actions={actions} placement="notice" />
  );

  if (send?.status === 'sending') {
    return (
      <NoticePanel label={t('options_report_notice_heading')}>
        <p
          class="m-0"
          role="status"
          tabIndex={-1}
          data-reporting-focus="notice-status"
        >
          {sendingText(t, send.total)}
        </p>
        <progress class="w-50 max-w-full" />
      </NoticePanel>
    );
  }

  // Keep showing the outcome even if the notice condition no longer holds,
  // e.g. after turning on automatic reporting.
  if (send && !send.closed) {
    return (
      <NoticePanel label={t('options_report_notice_heading')}>
        <p
          class="m-0"
          role="status"
          tabIndex={-1}
          data-reporting-focus="notice-status"
        >
          {sendResultText(t, state, send)}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          {canRetrySend(state, send) && (
            <ReportingButton variant="primary" onClick={actions.retrySend}>
              {t('options_error_reporting_try_again')}
            </ReportingButton>
          )}
          {count > 0 && viewerToggle('secondary')}
          <ReportingButton
            variant="secondary"
            onClick={actions.closeSendResult}
          >
            {t('options_send_result_close')}
          </ReportingButton>
        </div>
        {viewer}
      </NoticePanel>
    );
  }

  if (state.dismissAcknowledged) {
    return (
      <div
        class="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 rounded-lg border border-solid border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-600"
        role="status"
        tabIndex={-1}
        data-reporting-focus="dismiss-status"
      >
        <span class="flex-[1_1_260px]">
          {t('options_report_notice_dismissed')}
        </span>
        <div class="flex gap-3.5">
          <ReportingButton
            variant="quiet-link"
            onClick={actions.undoDismissNotice}
          >
            {t('options_report_notice_undo')}
          </ReportingButton>
          <ReportingButton
            variant="quiet-link"
            onClick={actions.acknowledgeDismissal}
          >
            {t('options_report_notice_ok')}
          </ReportingButton>
        </div>
      </div>
    );
  }

  if (!shouldShowNotice(state)) {
    return null;
  }

  return (
    <section
      aria-labelledby="error-report-notice-heading"
      class="mb-6 flex flex-col gap-3 rounded-lg border border-solid border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-900 dark:bg-blue-900/25"
      tabIndex={-1}
      data-reporting-focus="notice"
    >
      <h2
        id="error-report-notice-heading"
        class="m-0 text-lg leading-snug font-semibold"
      >
        {t('options_report_notice_heading')}
      </h2>
      <p class="m-0">{plural(t, 'options_report_notice_body', count)}</p>
      <p class="m-0">{t('options_report_notice_encourage')}</p>
      <div class="flex flex-wrap gap-2">
        <ReportingButton
          variant="primary"
          onClick={() => actions.sendReports('notice', false)}
        >
          {plural(t, 'options_send_reports', count)}
        </ReportingButton>
        <ReportingButton
          variant="secondary"
          onClick={() => actions.sendReports('notice', true)}
        >
          {t('options_send_reports_and_enable')}
        </ReportingButton>
      </div>
      <div class="flex flex-wrap items-baseline gap-x-4.5 gap-y-1.5 text-sm">
        {viewerToggle('link')}
        <a
          class="options-link"
          href={privacyPolicyUrl(langTag)}
          target="_blank"
          rel="noreferrer"
        >
          {t('options_privacy_policy_link')}
        </a>
        <span class="flex-1" />
        <ReportingButton variant="quiet-link" onClick={actions.dismissNotice}>
          {t('options_report_notice_dismiss')}
        </ReportingButton>
      </div>
      {viewer}
    </section>
  );
}

function NoticePanel(props: RenderableProps<{ label: string }>) {
  return (
    <section
      aria-label={props.label}
      class="mb-6 flex flex-col gap-3 rounded-lg border border-solid border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-900 dark:bg-blue-900/25"
    >
      {props.children}
    </section>
  );
}
