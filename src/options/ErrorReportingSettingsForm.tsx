import { useLocale } from '../common/i18n';

import { CheckboxRow } from './CheckboxRow';
import { NewBadge } from './NewBadge';
import { ReportingButton } from './ReportingButton';
import { SavedReports } from './SavedReports';
import { SectionHeading } from './SectionHeading';
import { plural, privacyPolicyUrl } from './report-display';
import type { ReportingActions, ReportingViewState } from './use-reporting';
import { isBusy } from './use-reporting';

type Props = { state: ReportingViewState; actions: ReportingActions };

export function ErrorReportingSettingsForm({ state, actions }: Props) {
  const { t, langTag } = useLocale();
  const { consent, policy } = state;

  const loading = consent.mode === 'loading' || policy.status === 'loading';
  const blockedByOrganization =
    policy.status === 'ready' && policy.disableErrorReporting;
  const policyUnavailable = policy.status === 'error';
  const checked = !loading && !policy.disableErrorReporting && consent.enabled;
  const disabled =
    loading ||
    consent.mode === 'error' ||
    policy.disableErrorReporting ||
    isBusy(state);
  const savedCount = state.reports.records.length;

  return (
    <>
      <SectionHeading>{t('options_error_reporting_heading')}</SectionHeading>
      <div class="flex flex-col gap-3.5 py-4" aria-busy={loading}>
        <CheckboxRow>
          <input
            id="automaticErrorReporting"
            type="checkbox"
            checked={checked}
            disabled={disabled}
            aria-describedby="automaticErrorReportingStatus automaticErrorReportingDescription"
            data-reporting-focus="automatic"
            onChange={(event) => {
              const enabled = event.currentTarget.checked;
              // Keep showing the actual state until the browser confirms it.
              event.currentTarget.checked = checked;
              actions.setAutomaticReporting(enabled);
            }}
          />
          <label for="automaticErrorReporting">
            {t('options_automatic_error_reporting')}
            <NewBadge expiry={new Date('2027-03-01')} />
          </label>
        </CheckboxRow>
        <div class="flex flex-col gap-2 ps-[22px]">
          <div id="automaticErrorReportingStatus" class="contents">
            {loading ? (
              <p class="m-0 text-zinc-600 italic dark:text-zinc-400">
                {t('options_error_reporting_checking')}
              </p>
            ) : blockedByOrganization ? (
              <p class="m-0 font-medium">
                {t('options_error_reporting_disabled_by_organization')}
              </p>
            ) : policyUnavailable ? (
              <p class="m-0">
                {t('options_error_reporting_policy_unavailable')}
              </p>
            ) : consent.mode === 'error' ? (
              <p class="m-0">
                {t('options_error_reporting_check_failed')}{' '}
                <ReportingButton variant="link" onClick={actions.retryConsent}>
                  {t('options_error_reporting_try_again')}
                </ReportingButton>
              </p>
            ) : state.automaticPending === 'prompt' ? (
              <p class="m-0 text-zinc-600 italic dark:text-zinc-400">
                {t('options_error_reporting_permission_prompt')}
              </p>
            ) : null}
          </div>
          <div id="automaticErrorReportingDescription" class="contents">
            <p class="m-0">{t('options_error_reporting_description')}</p>
            <p class="m-0 text-sm text-zinc-600 dark:text-zinc-400">
              {t('options_error_reporting_contents')}{' '}
              <a
                class="options-link"
                href={privacyPolicyUrl(langTag)}
                target="_blank"
                rel="noreferrer"
              >
                {t('options_privacy_policy_link')}
              </a>
            </p>
          </div>
          {state.automaticMessage === 'declined' && !consent.enabled && (
            <p
              role="status"
              class="m-0 rounded-md border border-solid border-zinc-300 px-3 py-2 dark:border-zinc-600"
            >
              {t('options_error_reporting_permission_declined')}
            </p>
          )}
          {state.automaticMessage === 'enabled-with-saved' &&
            consent.enabled &&
            savedCount > 0 && (
              <p
                role="status"
                class="m-0 rounded-md border border-solid border-zinc-300 px-3 py-2 dark:border-zinc-600"
              >
                {plural(t, 'options_error_reporting_enabled_saved', savedCount)}{' '}
                <ReportingButton
                  variant="link"
                  onClick={actions.reviewSavedReports}
                >
                  {t('options_error_reporting_review_saved')}
                </ReportingButton>
              </p>
            )}
        </div>
        <SavedReports state={state} actions={actions} />
      </div>
    </>
  );
}
