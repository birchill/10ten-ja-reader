import { useSelect } from 'react-cosmos/client';

import { TabDisplay } from '../common/content-config-params';

import { TabDisplayRadio } from './TabDisplayRadio';
import './options.css';

export default function TabDisplayRadioFixture() {
  const [value, setValue] = useSelect<TabDisplay>('value', {
    options: ['top', 'left', 'right', 'none'],
    defaultValue: 'top',
  });
  const [theme] = useSelect<string>('theme', {
    options: ['default', 'light', 'blue', 'lightblue', 'black', 'yellow'],
  });

  return <TabDisplayRadio onChange={setValue} theme={theme} value={value} />;
}
