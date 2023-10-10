import {
  type DataSeriesState,
  allMajorDataSeries,
  type DataVersion,
  MajorDataSeries,
  allDataSeries,
} from '@birchill/jpdict-idb';
import { useEffect, useState } from 'preact/hooks';

import { JpdictState } from '../background/jpdict';
import { useLocale } from '../common/i18n';
import { localizedDataSeriesKey } from '../common/data-series-labels';
import { classes } from '../utils/classes';
import { isFirefox } from '../utils/ua-utils';

import { Linkify } from './Linkify';
import { formatDate, formatSize } from './format';

type Props = {
  dbState: JpdictState;
  onCancelDbUpdate?: () => void;
  onUpdateDb?: () => void;
};

export function DbStatus(props: Props) {
  return (
    <div class="section-content panel-section-db-summary py-4">
      <DbSummaryBlurb />
      <DbSummaryStatus
        dbState={props.dbState}
        onCancelDbUpdate={props.onCancelDbUpdate}
        onUpdateDb={props.onUpdateDb}
      />
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

function DbSummaryStatus(props: {
  dbState: JpdictState;
  onCancelDbUpdate?: () => void;
  onUpdateDb?: () => void;
}) {
  const { t } = useLocale();

  if (props.dbState.updateState.type === 'idle') {
    return (
      <IdleStateSummary dbState={props.dbState} onUpdateDb={props.onUpdateDb} />
    );
  }

  if (props.dbState.updateState.type === 'checking') {
    return (
      <div class="db-summary-status">
        <div class="db-summary-info">{t('options_checking_for_updates')}</div>
        <CancelUpdateButton onClick={props.onCancelDbUpdate} />
      </div>
    );
  }

  const {
    dbState: {
      updateState: {
        series,
        totalProgress,
        version: { major, minor, patch },
      },
    },
  } = props;
  const versionString = `${major}.${minor}.${patch}`;

  const progressAsPercent = Math.round(totalProgress * 100);
  const dbLabel = t(localizedDataSeriesKey[series]);

  return (
    <div class="db-summary-status">
      <div class="db-summary-info">
        <progress
          class="progress"
          max={100}
          id="update-progress"
          value={totalProgress * 100}
        />
        <label class="label" for="update-progress">
          {t('options_downloading_data', [
            dbLabel,
            versionString,
            String(progressAsPercent),
          ])}
        </label>
      </div>
      <CancelUpdateButton onClick={props.onCancelDbUpdate} />
    </div>
  );

  // TODO Enable the "delete database" button
}

function IdleStateSummary(props: {
  dbState: JpdictState;
  onUpdateDb?: () => void;
}) {
  const { t } = useLocale();
  const isUnavailable = allDataSeries.some(
    (series) => props.dbState[series].state === 'unavailable'
  );

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
        <UpdateButton
          label={isUnavailable ? 'retry' : 'check'}
          lastCheck={props.dbState.updateState.lastCheck}
          onClick={props.onUpdateDb}
        />
      </div>
    );
  }

  return (
    <div class="db-summary-status">
      <div class="db-summary-version-grid">
        {allMajorDataSeries.map((series) => {
          const versionInfo = props.dbState[series].version;
          return versionInfo ? (
            <DataSeriesVersion series={series} version={versionInfo} />
          ) : null;
        })}
      </div>
      <UpdateButton
        label={isUnavailable ? 'retry' : 'check'}
        lastCheck={props.dbState.updateState.lastCheck}
        onClick={props.onUpdateDb}
      />
    </div>
  );
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

function DataSeriesVersion(props: {
  series: MajorDataSeries;
  version: DataVersion;
}) {
  const { t } = useLocale();

  const titleKeys: { [series in MajorDataSeries]: string } = {
    kanji: 'options_kanji_data_title',
    names: 'options_name_data_title',
    words: 'options_words_data_title',
  };
  const { major, minor, patch, lang } = props.version;
  const titleString = t(
    titleKeys[props.series],
    `${major}.${minor}.${patch} (${lang})`
  );

  const sourceNames: { [series in MajorDataSeries]: string } = {
    kanji: 'KANJIDIC',
    names: 'JMnedict/ENAMDICT',
    words: 'JMdict/EDICT',
  };

  const { databaseVersion, dateOfCreation } = props.version;

  const sourceName = sourceNames[props.series];
  let sourceString;
  if (databaseVersion && databaseVersion !== 'n/a') {
    sourceString = t('options_data_series_version_and_date', [
      sourceName,
      databaseVersion,
      dateOfCreation,
    ]);
  } else {
    sourceString = t('options_data_series_date_only', [
      sourceName,
      dateOfCreation,
    ]);
  }

  return (
    <>
      <div class="db-source-title">{titleString}</div>
      <div class="db-source-version">{sourceString}</div>
    </>
  );
}

function UpdateButton(props: {
  label: 'retry' | 'check';
  lastCheck?: Date | null;
  onClick?: () => void;
}) {
  const { t } = useLocale();

  const buttonLabel = t(
    props.label === 'retry'
      ? 'options_update_retry_button_label'
      : 'options_update_check_button_label'
  );

  return (
    <div class="db-summary-button">
      <button type="button" onClick={props.onClick}>
        {buttonLabel}
      </button>
      {props.lastCheck && (
        <div class="last-check">
          {t('options_last_database_check', formatDate(props.lastCheck))}
        </div>
      )}
    </div>
  );
}

function CancelUpdateButton(props: { onClick?: () => void }) {
  const { t } = useLocale();

  return (
    <div class="db-summary-button">
      <button type="button" onClick={props.onClick}>
        {t('options_cancel_update_button_label')}
      </button>
    </div>
  );
}
