import { useState } from 'preact/hooks';
import { useSelect, useValue } from 'react-cosmos/client';

import { PopupInteractivitySettingsForm } from './PopupInteractivitySettingsForm';
import { TabDisplay } from '../common/content-config-params';

import './options.css';

export default function () {
  const [hasTouch] = useValue<boolean>('Touch enabled?', {
    defaultValue: true,
  });
  const [enableTapLookup, setEnableTapLookup] = useState<boolean>(true);
  const [tabDisplay, setTabDisplay] = useState<TabDisplay>('left');
  const [theme] = useSelect<string>('theme', {
    options: ['default', 'light', 'blue', 'lightblue', 'black', 'yellow'],
  });

  return (
    <PopupInteractivitySettingsForm
      enableTapLookup={enableTapLookup}
      hasTouch={hasTouch}
      onChangeEnableTapLookup={setEnableTapLookup}
      onChangeTabDisplay={setTabDisplay}
      tabDisplay={tabDisplay}
      theme={theme}
    />
  );
}
