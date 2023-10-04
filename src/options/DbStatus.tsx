import { useLocale } from '../common/i18n';
import { Linkify } from './Linkify';

export function DbStatus() {
  const { t } = useLocale();

  const attribution = t('options_data_source');
  // XXX Need to do license and accent attribution too

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
      </div>
      <div class="db-summary-status"></div>
      <div class="db-admin" style="display: none">
        <span>Database testing features: </span>
        <button id="deleteDatabase">Delete database</button>
      </div>
    </div>
  );
}
