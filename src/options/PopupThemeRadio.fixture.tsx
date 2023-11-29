import { useSelect, useValue } from 'react-cosmos/client';

import {
  AccentDisplay,
  FontSize,
  PartOfSpeechDisplay,
} from '../common/content-config-params';

import { PopupThemeRadio } from './PopupThemeRadio';

import './options.css';
import '../../css/popup.css';

export default function () {
  const [accentDisplay] = useSelect<AccentDisplay>('accentDisplay', {
    defaultValue: 'binary',
    options: ['downstep', 'binary', 'binary-hi-contrast', 'none'],
  });
  const [fontSize] = useSelect<FontSize>('fontSize', {
    defaultValue: 'normal',
    options: ['normal', 'large', 'xl'],
  });
  const [posDisplay] = useSelect<PartOfSpeechDisplay>('posDisplay', {
    defaultValue: 'expl',
    options: ['expl', 'code', 'none'],
  });
  const [showDefinitions] = useValue<boolean>('showDefinitions', {
    defaultValue: true,
  });
  const [showPriority] = useValue<boolean>('showPriority', {
    defaultValue: true,
  });
  const [showRomaji] = useValue<boolean>('showRomaji', {
    defaultValue: false,
  });
  const [showWaniKaniLevel] = useValue<boolean>('showWaniKaniLevel', {
    defaultValue: false,
  });

  const [theme, setTheme] = useSelect<string>('theme', {
    defaultValue: 'default',
    options: ['default', 'light', 'blue', 'lightblue', 'black', 'yellow'],
  });

  return (
    <div class="w-max">
      <PopupThemeRadio
        accentDisplay={accentDisplay}
        fontSize={fontSize}
        onChangeTheme={setTheme}
        posDisplay={posDisplay}
        showDefinitions={showDefinitions}
        showPriority={showPriority}
        showRomaji={showRomaji}
        showWaniKaniLevel={showWaniKaniLevel}
        theme={theme}
      />
    </div>
  );
}
