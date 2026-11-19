import { useEffect, useRef, useState } from 'preact/hooks';

import { useLocale } from '../common/i18n';
import { classes } from '../utils/classes';
import { REPORT_CONTENT_ATTRIBUTE } from '../utils/reporting-protection';

import { Linkify } from './Linkify';
import { ReportingButton } from './ReportingButton';

export function InstallationId({ id }: { id: string }) {
  const { t } = useLocale();
  const contact = t('options_installation_id_contact');
  const [copyResult, setCopyResult] = useState<{
    copied: boolean;
    attempt: number;
  }>();
  const copyAttempt = useRef(0);

  useEffect(() => {
    return () => {
      copyAttempt.current++;
    };
  }, []);

  useEffect(() => {
    if (!copyResult) {
      return;
    }

    // Match the time used to display and fade the status in options.css.
    const timer = setTimeout(() => setCopyResult(undefined), 3250);
    return () => clearTimeout(timer);
  }, [copyResult]);

  async function copyId() {
    const attempt = ++copyAttempt.current;
    setCopyResult(undefined);

    let copied = false;
    try {
      await navigator.clipboard.writeText(id);
      copied = true;
    } catch {
      // The read-only field remains selectable when the clipboard is blocked.
    }

    if (attempt === copyAttempt.current) {
      setCopyResult({ copied, attempt });
    }
  }

  return (
    <div class="mt-1 flex flex-col gap-2.5 ps-5.5">
      <h2
        id="reporting-installation-id-label"
        class="m-0 text-base font-semibold"
      >
        {t('options_installation_id_heading')}
      </h2>
      <p class="m-0">
        <Linkify
          text={t('options_installation_id_description', contact)}
          links={[{ keyword: contact, href: 'mailto:support@10ten.life' }]}
          target="_self"
        />
      </p>
      <div
        class="flex flex-wrap items-center gap-2"
        {...{ [REPORT_CONTENT_ATTRIBUTE]: '' }}
      >
        <input
          class="w-full max-w-[40ch] min-w-0 rounded-md border border-solid border-zinc-400 bg-zinc-50 px-2 py-1.5 font-mono text-sm text-inherit dark:border-zinc-500 dark:bg-zinc-800"
          aria-labelledby="reporting-installation-id-label"
          type="text"
          dir="ltr"
          readOnly
          value={id}
          onFocus={(event) => event.currentTarget.select()}
        />
        <ReportingButton variant="secondary" onClick={() => void copyId()}>
          {t('options_installation_id_copy')}
        </ReportingButton>
        <span role="status">
          {copyResult && (
            <span
              key={copyResult.attempt}
              class={classes(
                'motion-safe:animate-installation-id-copy-status text-sm',
                copyResult.copied
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-900 dark:text-red-300'
              )}
            >
              <span aria-hidden="true">{copyResult.copied ? '✓' : '×'}</span>{' '}
              {copyResult.copied
                ? t('options_installation_id_copied')
                : t('options_installation_id_copy_failed')}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
