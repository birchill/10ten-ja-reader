import { useState } from 'preact/hooks';
import { useValue } from 'react-cosmos/client';

import { GeneralSettingsForm } from './GeneralSettingsForm';

import './options.css';

export default function () {
  const [contextMenuEnable, setContextMenuEnable] = useState(true);
  const [highlightText, setHighlightText] = useState(true);
  const [supportsCssHighlight] = useValue<boolean>('CSS Highlight API', {
    defaultValue: true,
  });

  return (
    <GeneralSettingsForm
      contextMenuEnable={contextMenuEnable}
      highlightText={highlightText}
      onChangeContextMenuEnable={setContextMenuEnable}
      onChangeHighlightText={setHighlightText}
      supportsCssHighlight={supportsCssHighlight}
    />
  );
}
