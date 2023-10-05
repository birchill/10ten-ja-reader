import { useLocale } from '../common/i18n';
import { Linkify } from './Linkify';
import { JpdictState } from '../background/jpdict';

type Props = {
  dbState: JpdictState;
};

export function DbStatus(props: Props) {
  return (
    <div class="section-content panel-section-db-summary">
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
  const { updateError } = props.dbState;

  if (!!updateError && updateError.name === 'OfflineError') {
    return (
      <div class="db-summary-status -warning">
        <div class="db-summary-info">{t('options_offline_explanation')}</div>
      </div>
    );
  }

  // TODO Other cases

  return <div class="db-summary-status"></div>;
}
