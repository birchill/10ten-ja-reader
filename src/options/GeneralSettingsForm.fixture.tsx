import { useState } from 'preact/hooks';
import { useSelect, useValue } from 'react-cosmos/client';

import { HighlightStyle } from '../common/content-config-params';
import { GeneralSettingsForm } from './GeneralSettingsForm';

import './options.css';

export default function () {
  const [contextMenuEnable, setContextMenuEnable] = useState(true);
  const [highlightStyle, setHighlightStyle] = useSelect<
    HighlightStyle | 'none'
  >('value', {
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
      supportsCssHighlight={supportsCssHighlight}
    />
  );
}
