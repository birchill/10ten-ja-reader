import { useCallback, useState } from 'preact/hooks';

import type { Config } from '../common/config';
import { HighlightStyle } from '../common/content-config-params';
import { useLocale } from '../common/i18n';

import { GeneralSettingsForm } from './GeneralSettingsForm';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = { config: Config };

export function GeneralSettings(props: Props) {
  const { t } = useLocale();

  const toolbarIcon = useConfigValue(props.config, 'toolbarIcon');
  const onChangeToolbarIcon = useCallback(
    (value: 'default' | 'sky') => {
      props.config.toolbarIcon = value;
    },
    [props.config]
  );

  const noTextHighlight = useConfigValue(props.config, 'noTextHighlight');
  const rawHighlightStyle = useConfigValue(props.config, 'highlightStyle');
  const highlightStyle = noTextHighlight ? 'none' : rawHighlightStyle;

  const onChangeHighlightStyle = useCallback(
    (value: HighlightStyle | 'none') => {
      if (value === 'none') {
        props.config.noTextHighlight = true;
      } else {
        props.config.highlightStyle = value;
        props.config.noTextHighlight = false;
      }
    },
    [props.config]
  );

  const contextMenuEnable = useConfigValue(props.config, 'contextMenuEnable');
  const onChangeContextMenuEnable = useCallback(
    (value: boolean) => {
      props.config.contextMenuEnable = value;
    },
    [props.config]
  );

  const [supportsCssHighlight] = useState(
    CSS.supports('selector(::highlight(yer))')
  );

  return (
    <>
      <SectionHeading>{t('options_general_heading')}</SectionHeading>
      <div class="py-4">
        <GeneralSettingsForm
          contextMenuEnable={contextMenuEnable}
          highlightStyle={highlightStyle}
          onChangeContextMenuEnable={onChangeContextMenuEnable}
          onChangeHighlightStyle={onChangeHighlightStyle}
          onChangeToolbarIcon={onChangeToolbarIcon}
          supportsCssHighlight={supportsCssHighlight}
          toolbarIcon={toolbarIcon}
        />
      </div>
    </>
  );
}
