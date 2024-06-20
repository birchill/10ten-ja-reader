import { useState } from 'preact/hooks';
import { useSelect, useValue } from 'react-cosmos/client';

import { TabDisplay } from '../common/content-config-params';

import { PopupInteractivitySettingsForm } from './PopupInteractivitySettingsForm';
import './options.css';

export default function PopupInteractivitySettingsFormFixture() {
  const [hasMouse] = useValue<boolean>('mouse enabled?', {
    defaultValue: true,
  });
  const [hasTouch] = useValue<boolean>('touch enabled?', {
    defaultValue: true,
  });
  const [mouseInteractivity, setMouseInteractivity] = useState<boolean>(true);
  const [enableTapLookup, setEnableTapLookup] = useState<boolean>(true);
  const [tabDisplay, setTabDisplay] = useState<TabDisplay>('left');
  const [theme] = useSelect<string>('theme', {
    options: ['default', 'light', 'blue', 'lightblue', 'black', 'yellow'],
  });

  return (
    <PopupInteractivitySettingsForm
      enableTapLookup={enableTapLookup}
      hasMouse={hasMouse}
      hasTouch={hasTouch}
      mouseInteractivity={mouseInteractivity}
      onChangeEnableTapLookup={setEnableTapLookup}
      onChangeMouseInteractivity={setMouseInteractivity}
      onChangeTabDisplay={setTabDisplay}
      tabDisplay={tabDisplay}
      theme={theme}
    />
  );
}
