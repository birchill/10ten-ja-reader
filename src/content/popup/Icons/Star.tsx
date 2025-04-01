import { useLocale } from '../../../common/i18n';

export function Star({ style }: { style: 'full' | 'hollow' }) {
  const { t } = useLocale();

  const message =
    style === 'full'
      ? 'entry_priority_label_high'
      : 'entry_priority_label_regular';

  const path =
    style === 'full'
      ? 'M98 34a4 4 0 00-3-1l-30-4L53 2a4 4 0 00-7 0L33 29 4 33a4 4 0 00-3 6l22 20-6 29a4 4 0 004 5 4 4 0 002 0l26-15 26 15a4 4 0 002 0 4 4 0 004-4 4 4 0 000-1l-6-29 22-20a4 4 0 001-5z'
      : 'M77 93a4 4 0 004-4 4 4 0 000-1l-6-29 22-20a4 4 0 00-2-6l-30-4L53 2a4 4 0 00-7 0L33 29 4 33a4 4 0 00-3 6l22 20-6 29a4 4 0 004 5 4 4 0 002 0l26-15 26 15a4 4 0 002 0zm-5-12L51 70a4 4 0 00-4 0L27 81l5-22a4 4 0 00-1-4L13 40l23-3a4 4 0 004-2l9-21 10 21a4 4 0 003 2l23 3-17 15a4 4 0 00-1 4z';

  return (
    <svg class="svgicon" viewBox="0 0 98.6 93.2" style="opacity: 0.5">
      <title>{t(message)}</title>
      <path d={path} />
    </svg>
  );
}
