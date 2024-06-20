import { useSelect } from 'react-cosmos/client';

import { HighlightStyle } from '../common/content-config-params';

import { HighlightStyleRadio } from './HighlightStyleRadio';
import './options.css';

export default function HighlightStyleRadioFixture() {
  const [value, setValue] = useSelect<HighlightStyle | 'none'>('value', {
    options: ['none', 'yellow', 'blue'],
    defaultValue: 'yellow',
  });

  return <HighlightStyleRadio onChange={setValue} value={value} />;
}
