import { useLocale } from '../common/i18n';
import { Linkify } from './Linkify';

export function DbStatus() {
  const { t } = useLocale();

  const attribution = t('options_data_source');
  const license = t('options_edrdg_license');
  const licenseKeyword = t('options_edrdg_license_keyword');
  const accentAttribution = t('options_accent_data_source');

  return (
    <div class="section-content panel-section-db-summary">
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
      <div class="db-summary-status"></div>
      <div class="db-admin" style="display: none">
        <span>Database testing features: </span>
        <button id="deleteDatabase">Delete database</button>
      </div>
    </div>
  );
}
