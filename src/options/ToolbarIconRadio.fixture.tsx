import { useSelect } from 'react-cosmos/client';

import { ToolbarIconRadio } from './ToolbarIconRadio';
import './options.css';

export default function ToolbarIconRadioFixture() {
  const [value, setValue] = useSelect<'default' | 'sky'>('value', {
    options: ['default', 'sky'],
    defaultValue: 'default',
  });

  return <ToolbarIconRadio onChange={setValue} value={value} />;
}
