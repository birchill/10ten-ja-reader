import { useState } from 'preact/hooks';

import { AutoExpandableEntry } from '../common/content-config-params';

import { PopupStyleForm } from './PopupStyleForm';

import './options.css';

export default function () {
  const [autoExpand, setAutoExpand] = useState<Array<AutoExpandableEntry>>([]);
  const onChangeAutoExpand = (type: AutoExpandableEntry, value: boolean) => {
    setAutoExpand((prev) =>
      value ? [...prev, type] : prev.filter((entry) => entry !== type)
    );
  };

  return (
    <PopupStyleForm
      autoExpand={autoExpand}
      onChangeAutoExpand={onChangeAutoExpand}
    />
  );
}
