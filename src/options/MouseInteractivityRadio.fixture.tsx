import { useSelect, useValue } from 'react-cosmos/client';

import { MouseInteractivityRadio } from './MouseInteractivityRadio';
import './options.css';

export default function MouseInteractivityRadioFixture() {
  const [value, setValue] = useValue<boolean>('enabled', {
    defaultValue: true,
  });
  const [theme] = useSelect<string>('theme', {
    options: ['default', 'light', 'blue', 'lightblue', 'black', 'yellow'],
  });

  return (
    <MouseInteractivityRadio onChange={setValue} theme={theme} value={value} />
  );
}
