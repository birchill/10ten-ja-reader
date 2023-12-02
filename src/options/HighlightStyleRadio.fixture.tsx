import { useSelect } from 'react-cosmos/client';

import { HighlightStyleRadio } from './HighlightStyleRadio';
import { HighlightStyle } from '../common/content-config-params';

import './options.css';

export default function () {
  const [value, setValue] = useSelect<HighlightStyle | 'none'>('value', {
    options: ['none', 'yellow', 'blue'],
    defaultValue: 'yellow',
  });

  return <HighlightStyleRadio onChange={setValue} value={value} />;
}
