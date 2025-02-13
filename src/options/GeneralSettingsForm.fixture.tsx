import { useState } from 'preact/hooks';
import { useSelect, useValue } from 'react-cosmos/client';

import { HighlightStyle } from '../common/content-config-params';

import { GeneralSettingsForm } from './GeneralSettingsForm';
import './options.css';

export default function GeneralSettingsFormFixture() {
  const [toolbarIcon, setToolbarIcon] = useSelect<'default' | 'sky'>(
    'toolbarIcon',
    { options: ['default', 'sky'], defaultValue: 'default' }
  );
  const [contextMenuEnable, setContextMenuEnable] = useState(true);
  const [highlightStyle, setHighlightStyle] = useSelect<
    HighlightStyle | 'none'
  >('highlightStyle', {
    options: ['none', 'yellow', 'blue'],
    defaultValue: 'yellow',
  });
  const [supportsCssHighlight] = useValue<boolean>('CSS Highlight API', {
    defaultValue: true,
  });

  return (
    <GeneralSettingsForm
      contextMenuEnable={contextMenuEnable}
      highlightStyle={highlightStyle}
      onChangeContextMenuEnable={setContextMenuEnable}
      onChangeHighlightStyle={setHighlightStyle}
      onChangeToolbarIcon={setToolbarIcon}
      supportsCssHighlight={supportsCssHighlight}
      toolbarIcon={toolbarIcon}
    />
  );
}
