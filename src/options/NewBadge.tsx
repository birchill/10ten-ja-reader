import { useLocale } from '../common/i18n';

type Props = {
  expiry: Date;
};

export function NewBadge(props: Props) {
  const { t } = useLocale();

  return new Date() < props.expiry ? (
    <span class="new-badge">{t('options_new_badge_text')}</span>
  ) : null;
}
