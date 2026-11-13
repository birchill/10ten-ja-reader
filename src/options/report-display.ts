import type {
  SavedReport,
  SavedReportSummary,
} from '../background/report-queue';
import type { TranslateFunctionType } from '../common/i18n';

import type { ReportingViewState, SendState } from './use-reporting';
import { remainingInBatch } from './use-reporting';

const PRIVACY_POLICY_URLS: Record<string, string> = {
  en: 'https://10ten.life/en/reader/privacy/',
  ja: 'https://10ten.life/ja/reader/privacy/',
};

export function privacyPolicyUrl(langTag: string): string {
  return PRIVACY_POLICY_URLS[langTag] ?? PRIVACY_POLICY_URLS.en;
}

// browser.i18n has no plural rules so we use separate _one and _other keys.
// Languages without plural forms use the same text for both.
export function plural(
  t: TranslateFunctionType,
  key: string,
  count: number,
  substitutions: Array<string> = []
): string {
  return t(`${key}_${count === 1 ? 'one' : 'other'}`, [
    String(count),
    ...substitutions,
  ]);
}

export function formatReportDate(value: string, langTag: string): string {
  const date = new Date(value);
  try {
    return new Intl.DateTimeFormat(langTag, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

// Saved reports have no human-written summary so we show the error itself,
// falling back to the destination until the full report has been read.
export function reportTitle(
  t: TranslateFunctionType,
  summary: SavedReportSummary,
  report?: SavedReport
): string {
  if (summary.destination === 'download-failure') {
    const etype =
      report?.destination === 'download-failure' ? report.payload.etype : '';
    return etype
      ? t(`options_saved_report_download_${etype}`)
      : t('options_saved_report_category_download');
  }

  if (report?.destination === 'bugsnag') {
    const exception = report.payload.events[0]?.exceptions[0] as
      { errorClass: string; message?: unknown } | undefined;
    if (exception) {
      return typeof exception.message === 'string' && exception.message
        ? `${exception.errorClass}: ${exception.message}`
        : exception.errorClass;
    }
  }

  return t('options_saved_report_category_error');
}

export function reportCategory(
  t: TranslateFunctionType,
  summary: SavedReportSummary
): string {
  return t(
    summary.destination === 'download-failure'
      ? 'options_saved_report_category_download'
      : 'options_saved_report_category_error'
  );
}

export function reportDestination(
  t: TranslateFunctionType,
  summary: SavedReportSummary
): string {
  return t(
    summary.destination === 'download-failure'
      ? 'options_saved_report_destination_download'
      : 'options_saved_report_destination_bugsnag'
  );
}

export function sendingText(t: TranslateFunctionType, total: number): string {
  return plural(t, 'options_sending_reports', total);
}

export function sendResultText(
  t: TranslateFunctionType,
  state: ReportingViewState,
  send: Exclude<SendState, { status: 'sending' }>
): string {
  const parts: Array<string> = [];
  switch (send.status) {
    case 'stale':
      parts.push(t('options_send_result_stale'));
      break;

    case 'unavailable':
      parts.push(t('options_send_result_unavailable'));
      break;

    case 'error':
      parts.push(t('options_send_result_error'));
      break;

    case 'complete': {
      const { sent, totalSelected } = send.batch;
      const remaining = remainingInBatch(send.batch, state.reports);
      if (sent && sent === totalSelected) {
        parts.push(plural(t, 'options_send_result_all', sent));
      } else if (sent) {
        parts.push(
          t('options_send_result_partial', [
            String(sent),
            String(totalSelected),
          ])
        );
        if (remaining) {
          parts.push(
            plural(t, 'options_send_result_partial_remaining', remaining)
          );
        }
      } else if (remaining) {
        parts.push(plural(t, 'options_send_result_failed', remaining));
      } else {
        parts.push(t('options_send_result_none'));
      }
      break;
    }
  }

  switch (send.automaticReporting) {
    case 'enabled':
      parts.push(t('options_send_result_enabled'));
      break;

    case 'off':
      parts.push(t('options_send_result_declined'));
      break;

    case 'error':
      parts.push(t('options_send_result_enable_failed'));
      break;

    case undefined:
      if (
        send.status === 'complete' &&
        send.batch.sent &&
        !state.consent.enabled
      ) {
        // Settings are at the bottom of the page, which the notice may not
        // be able to scroll to, so say where to find them.
        parts.push(
          t(
            send.origin === 'notice'
              ? 'options_send_result_still_off_notice'
              : 'options_send_result_still_off'
          )
        );
      }
      break;
  }

  // Japanese and Chinese sentences aren't separated by spaces.
  return parts.join(/^(ja|zh)\b/.test(t('lang_tag')) ? '' : ' ');
}

export function canRetrySend(
  state: ReportingViewState,
  send: SendState
): boolean {
  return (
    send.status === 'complete' &&
    !state.policy.disableErrorReporting &&
    remainingInBatch(send.batch, state.reports) > 0
  );
}
