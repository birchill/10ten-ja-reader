import { type DataSeriesState, allMajorDataSeries } from '@birchill/jpdict-idb';
import { useEffect, useState } from 'preact/hooks';

import { JpdictState } from '../background/jpdict';
import { useLocale } from '../common/i18n';
import { classes } from '../utils/classes';
import { isFirefox } from '../utils/ua-utils';

import { Linkify } from './Linkify';
import { formatDate, formatSize } from './format';

type Props = {
  dbState: JpdictState;
};

export function DbStatus(props: Props) {
  return (
    <div class="section-content panel-section-db-summary py-4">
      <DbSummaryBlurb />
      <DbSummaryStatus dbState={props.dbState} />
      <div class="db-admin" hidden>
        <span>Database testing features: </span>
        <button id="deleteDatabase">Delete database</button>
      </div>
    </div>
  );
}

function DbSummaryBlurb() {
  const { t } = useLocale();

  const attribution = t('options_data_source');
  const license = t('options_edrdg_license');
  const licenseKeyword = t('options_edrdg_license_keyword');
  const accentAttribution = t('options_accent_data_source');

  return (
    <div class="db-summary-blurb">
      <Linkify
        text={attribution}
        links={[
          {
            keyword: 'JMdict/EDICT',
            href: 'https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project',
          },
          {
            keyword: 'KANJIDIC',
            href: 'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project',
          },
          {
            keyword: 'JMnedict/ENAMDICT',
            href: 'https://www.edrdg.org/enamdict/enamdict_doc.html',
          },
        ]}
      />
      <Linkify
        text={license}
        links={[
          {
            keyword: 'Electronic Dictionary Research and Development Group',
            href: 'https://www.edrdg.org/',
          },
          {
            keyword: licenseKeyword,
            href: 'https://www.edrdg.org/edrdg/licence.html',
          },
        ]}
      />
      <p>{accentAttribution}</p>
    </div>
  );
}

function DbSummaryStatus(props: { dbState: JpdictState }) {
  if (props.dbState.updateState.type === 'idle') {
    return <IdleStateSummary dbState={props.dbState} />;
  }

  // TODO Other cases

  return <div class="db-summary-status"></div>;
}

function IdleStateSummary(props: { dbState: JpdictState }) {
  const { t } = useLocale();

  const errorDetails = useErrorDetails(props.dbState);
  if (errorDetails) {
    const { class: errorClass, errorMessage, nextRetry } = errorDetails;
    return (
      <div
        class={classes(
          'db-summary-status',
          errorClass === 'error' ? '-error' : '-warning'
        )}
      >
        <div class="db-summary-info">{errorMessage}</div>
        {nextRetry && (
          <div>{t('options_db_update_retry', formatDate(nextRetry))}</div>
        )}
      </div>
    );
  }

  // TODO Other cases

  return <div class="db-summary-status"></div>;
}

function useErrorDetails(dbState: JpdictState): {
  class: 'warning' | 'error';
  errorMessage: string;
  nextRetry?: Date;
} | null {
  const { t } = useLocale();

  const { updateError } = dbState;
  const quota = useStorageQuota(updateError?.name === 'QuotaExceededError');

  // Offline errors
  if (updateError?.name === 'OfflineError') {
    return { class: 'warning', errorMessage: t('options_offline_explanation') };
  }

  // Quote exceeded errors have a special message.
  if (updateError?.name === 'QuotaExceededError' && quota !== undefined) {
    return {
      class: 'error',
      errorMessage: t('options_db_update_quota_error', formatSize(quota)),
      nextRetry: updateError.nextRetry,
    };
  }

  // Generic update errors
  if (updateError && updateError?.name !== 'AbortError') {
    return {
      class: 'error',
      errorMessage: t('options_db_update_error'),
      nextRetry: updateError.nextRetry,
    };
  }

  // Check if we have any version info
  const hasVersionInfo = allMajorDataSeries.some(
    (series) => !!dbState[series].version
  );
  if (hasVersionInfo) {
    return null;
  }

  // Otherwise, return a suitable summary error
  const summaryStates: Array<[DataSeriesState, string]> = [
    ['init', 'options_database_initializing'],
    ['unavailable', 'options_database_unavailable'],
    ['empty', 'options_no_database'],
  ];
  for (const [state, key] of summaryStates) {
    if (allMajorDataSeries.some((series) => dbState[series].state === state)) {
      return {
        class: 'error',
        errorMessage: t(key),
      };
    }
  }

  return null;
}

function useStorageQuota(enable: boolean): number | undefined {
  const [quota, setQuota] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!enable) {
      setQuota(undefined);
      return;
    }

    navigator.storage
      .estimate()
      .then(({ quota }) => {
        if (typeof quota !== 'undefined') {
          // For Firefox, typically origins get a maximum of 20% of the global
          // limit. When we have unlimitedStorage permission, however, we can
          // use up to the full amount of the global limit. The storage API,
          // however, still returns 20% as the quota, so multiplying by 5 will
          // give the actual quota.
          if (isFirefox()) {
            quota *= 5;
          }
        }
        setQuota(quota);
      })
      .catch(() => {
        // Ignore. This UA likely doesn't support the navigator.storage API
      });
  }, [enable]);

  return quota;
}
