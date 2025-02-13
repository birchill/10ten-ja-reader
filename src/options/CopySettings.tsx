import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';

import { CopySettingsForm } from './CopySettingsForm';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function CopySettings(props: Props) {
  const { t } = useLocale();
  const copyHeadwords = useConfigValue(props.config, 'copyHeadwords');
  const copyPos = useConfigValue(props.config, 'copyPos');
  const copySenses = useConfigValue(props.config, 'copySenses');
  const simplifiedCopy =
    copyHeadwords === 'common' || copyPos === 'none' || copySenses === 'first';

  const onChangeSimplifiedCopy = useCallback(
    (value: boolean) => {
      if (value) {
        props.config.copyHeadwords = 'common';
        props.config.copyPos = 'none';
        props.config.copySenses = 'first';
      } else {
        props.config.copyHeadwords = 'regular';
        props.config.copyPos = 'code';
        props.config.copySenses = 'all';
      }
    },
    [props.config]
  );

  const showRomaji = useConfigValue(props.config, 'showRomaji');

  return (
    <>
      <SectionHeading>{t('options_copy_heading')}</SectionHeading>
      <div class="py-4">
        <CopySettingsForm
          showRomaji={showRomaji}
          simplifiedCopy={simplifiedCopy}
          onChangeSimplifiedCopy={onChangeSimplifiedCopy}
        />
      </div>
    </>
  );
}
