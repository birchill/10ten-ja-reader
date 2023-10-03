import { useLocale } from '../common/i18n';

export function DbStatus() {
  const { t } = useLocale();

  // XXX Need to linkify this
  const attribution = t('options_data_source');
  // XXX Need to do license and accent attribution too

  return (
    <div class="section-content panel-section-db-summary">
      <div class="db-summary-blurb">{attribution}</div>
      <div class="db-summary-status"></div>
      <div class="db-admin" style="display: none">
        <span>Database testing features: </span>
        <button id="deleteDatabase">Delete database</button>
      </div>
    </div>
  );
}
