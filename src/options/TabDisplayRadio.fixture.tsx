import { useSelect } from 'react-cosmos/client';
import { TabDisplayRadio } from './TabDisplayRadio';
import { TabDisplay } from '../common/content-config-params';

import './options.css';

export default function () {
  const [value, setValue] = useSelect<TabDisplay>('value', {
    options: ['top', 'left', 'right', 'none'],
    defaultValue: 'top',
  });
  const [theme] = useSelect<string>('theme', {
    options: ['default', 'light', 'blue', 'lightblue', 'black', 'yellow'],
  });

  return <TabDisplayRadio onChange={setValue} theme={theme} value={value} />;
}
