import { useState } from 'preact/hooks';

import {
  AccentDisplay,
  AutoExpandableEntry,
  FontSize,
  PartOfSpeechDisplay,
} from '../common/content-config-params';

import { PopupStyleForm } from './PopupStyleForm';

import './options.css';

export default function () {
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
      posDisplay={posDisplay}
      onChangeAccentDisplay={setAccentDisplay}
      onChangeAutoExpand={onChangeAutoExpand}
      onChangeFontSize={setFontSize}
      onChangePosDisplay={setPosDisplay}
    />
  );
}
