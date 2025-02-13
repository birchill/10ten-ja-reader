import { useLocale } from '../common/i18n';

type Props = { expiry: Date };

export function NewBadge(props: Props) {
  const { t } = useLocale();

  return new Date() < props.expiry ? (
    <span class="mx-2 mt-[5px] inline-block rounded-full bg-rose-100 px-3 py-[2px] text-[12px] font-medium leading-none text-rose-900 dark:bg-rose-800 dark:text-rose-100">
      {t('options_new_badge_text')}
    </span>
  ) : null;
}
