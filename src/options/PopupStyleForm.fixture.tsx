import { useState } from 'preact/hooks';

import {
  AccentDisplay,
  AutoExpandableEntry,
  FontSize,
  PartOfSpeechDisplay,
} from '../common/content-config-params';

import { PopupStyleForm } from './PopupStyleForm';

import './options.css';
import '../../css/popup.css';

export default function () {
  const [theme, setTheme] = useState<string>('default');

  const [showPriority, setShowPriority] = useState<boolean>(true);
  const [showWaniKaniLevel, setShowWaniKaniLevel] = useState<boolean>(false);
  const [showRomaji, setShowRomaji] = useState<boolean>(false);
  const [showDefinitions, setShowDefinitions] = useState<boolean>(true);

  const [accentDisplay, setAccentDisplay] = useState<AccentDisplay>('binary');

  const [autoExpand, setAutoExpand] = useState<Array<AutoExpandableEntry>>([]);
  const onChangeAutoExpand = (type: AutoExpandableEntry, value: boolean) => {
    setAutoExpand((prev) =>
      value ? [...prev, type] : prev.filter((entry) => entry !== type)
    );
  };

  const [posDisplay, setPosDisplay] = useState<PartOfSpeechDisplay>('expl');

  const [fontSize, setFontSize] = useState<FontSize>('normal');

  return (
    <PopupStyleForm
      accentDisplay={accentDisplay}
      autoExpand={autoExpand}
      fontSize={fontSize}
      onChangeAccentDisplay={setAccentDisplay}
      onChangeAutoExpand={onChangeAutoExpand}
      onChangeFontSize={setFontSize}
      onChangePosDisplay={setPosDisplay}
      onChangeShowDefinitions={setShowDefinitions}
      onChangeShowPriority={setShowPriority}
      onChangeShowRomaji={setShowRomaji}
      onChangeShowWaniKaniLevel={setShowWaniKaniLevel}
      onChangeTheme={setTheme}
      posDisplay={posDisplay}
      showDefinitions={showDefinitions}
      showPriority={showPriority}
      showRomaji={showRomaji}
      showWaniKaniLevel={showWaniKaniLevel}
      theme={theme}
    />
  );
}
