import {
  type DataSeriesState,
  allMajorDataSeries,
  type DataVersion,
  MajorDataSeries,
  allDataSeries,
} from '@birchill/jpdict-idb';
import { useEffect, useState } from 'preact/hooks';
import type { Browser } from 'webextension-polyfill';

import { JpdictState } from '../background/jpdict';
import { useLocale } from '../common/i18n';
import { localizedDataSeriesKey } from '../common/data-series-labels';
import { classes } from '../utils/classes';
import { isFirefox } from '../utils/ua-utils';

import { Linkify } from './Linkify';
import { formatDate, formatSize } from './format';

type Props = {
  dbState: JpdictState;
  forceDevMode?: boolean;
  onCancelDbUpdate?: () => void;
  onDeleteDb?: () => void;
  onUpdateDb?: () => void;
  oldStyles?: boolean;
};

export function DbStatus(props: Props) {
  const devMode = useIsDevMode();

  return (
    <div
      class={
        props.oldStyles
          ? 'section-content panel-section-db-summary'
          : 'firefox:p-4 flex flex-col gap-4 py-4'
      }
    >
      <DbSummaryBlurb />
      <DbSummaryStatus
        dbState={props.dbState}
        onCancelDbUpdate={props.onCancelDbUpdate}
        onUpdateDb={props.onUpdateDb}
        oldStyles={props.oldStyles}
      />
      {(devMode || !!props.forceDevMode) && (
        <div class="rounded-lg border border-solid border-red-900 bg-red-50 px-4 py-2 text-red-900 dark:border-red-200/50 dark:bg-red-900/30 dark:text-red-50">
          <span>Database testing features: </span>
          <button onClick={props.onDeleteDb}>Delete database</button>
        </div>
      )}
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
    <>
      <p class="m-0">
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
      </p>
      <p class="m-0">{accentAttribution}</p>
    </>
  );
}

function DbSummaryStatus(props: {
  dbState: JpdictState;
  onCancelDbUpdate?: () => void;
  onUpdateDb?: () => void;
  oldStyles?: boolean;
}) {
  const { t } = useLocale();

  if (props.dbState.updateState.type === 'idle') {
    return (
      <IdleStateSummary
        dbState={props.dbState}
        onUpdateDb={props.onUpdateDb}
        oldStyles={props.oldStyles}
      />
    );
  }

  if (props.dbState.updateState.type === 'checking') {
    return (
      <div
        class={
          props.oldStyles
            ? 'db-summary-status'
            : 'flex flex-wrap items-center gap-x-4 gap-y-2'
        }
      >
        <div class={props.oldStyles ? 'db-summary-info' : 'grow'}>
          {t('options_checking_for_updates')}
        </div>
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
    <div
      class={
        props.oldStyles
          ? 'db-summary-status'
          : 'flex flex-wrap items-center gap-x-4 gap-y-2'
      }
    >
      <div class={props.oldStyles ? 'db-summary-info' : 'grow'}>
        <progress
          class={props.oldStyles ? 'progress' : 'mb-2 block'}
          max={100}
          id="update-progress"
          value={totalProgress * 100}
        />
        <label
          class={props.oldStyles ? 'label' : 'block italic'}
          for="update-progress"
        >
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
}

function IdleStateSummary(props: {
  dbState: JpdictState;
  onUpdateDb?: () => void;
  oldStyles?: boolean;
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
          props.oldStyles
            ? 'db-summary-status'
            : 'flex flex-wrap items-center gap-x-4 gap-y-2',
          errorClass === 'error'
            ? props.oldStyles
              ? '-error'
              : 'rounded-lg border border-solid border-red-900 bg-red-50 px-4 py-2 text-red-900 dark:border-red-200/50 dark:bg-red-900/30 dark:text-red-50'
            : props.oldStyles
            ? '-warning'
            : 'rounded-lg border border-solid border-yellow-800 bg-yellow-50 px-4 py-2 text-yellow-800 dark:border-yellow-400/50 dark:bg-yellow-900/50 dark:text-yellow-50'
        )}
      >
        <div class={props.oldStyles ? 'db-summary-info' : 'grow'}>
          {errorMessage}
        </div>
        {nextRetry && (
          <div>{t('options_db_update_retry', formatDate(nextRetry))}</div>
        )}
        <UpdateButton
          label={isUnavailable ? 'retry' : 'check'}
          lastCheck={props.dbState.updateState.lastCheck}
          onClick={props.onUpdateDb}
          oldStyles={props.oldStyles}
        />
      </div>
    );
  }

  return (
    <div
      class={
        props.oldStyles
          ? 'db-summary-status'
          : 'flex flex-wrap items-center gap-4'
      }
    >
      <div
        class={
          props.oldStyles
            ? 'db-summary-version-grid'
            : 'grid grow auto-cols-fr grid-flow-col grid-rows-[repeat(2,_auto)] gap-x-2 min-[500px]:gap-x-4'
        }
      >
        {allMajorDataSeries.map((series) => {
          const versionInfo = props.dbState[series].version;
          return versionInfo ? (
            <DataSeriesVersion
              series={series}
              version={versionInfo}
              oldStyles={props.oldStyles}
            />
          ) : null;
        })}
      </div>
      <UpdateButton
        label={isUnavailable ? 'retry' : 'check'}
        lastCheck={props.dbState.updateState.lastCheck}
        onClick={props.onUpdateDb}
        oldStyles={props.oldStyles}
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
  oldStyles?: boolean;
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
      <div>{titleString}</div>
      <div
        class={
          props.oldStyles
            ? 'db-source-version'
            : 'text-sm text-zinc-500 dark:text-zinc-400'
        }
      >
        {sourceString}
      </div>
    </>
  );
}

function UpdateButton(props: {
  label: 'retry' | 'check';
  lastCheck?: Date | null;
  onClick?: () => void;
  oldStyles?: boolean;
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
        <div class={props.oldStyles ? 'last-check' : 'mt-1.5 text-xs italic'}>
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

declare global {
  const browser: Browser | undefined;
}

function useIsDevMode(): boolean {
  const [isDevMode, setIsDevMode] = useState<boolean>(false);

  useEffect(() => {
    if (typeof browser === 'undefined' || !browser.management) {
      return;
    }

    browser.management
      .getSelf()
      .then((info) => {
        if (info.installType === 'development') {
          setIsDevMode(true);
        }
      })
      .catch(() => {
        // Ignore
      });
  }, []);

  return isDevMode;
}
