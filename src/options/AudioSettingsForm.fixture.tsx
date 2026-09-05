import { useState } from 'preact/hooks';

import { AudioSettingsForm } from './AudioSettingsForm';
import './options.css';

export default function AudioSettingsFormFixture() {
  const [playReadings, setPlayReadings] = useState(false);

  return (
    <AudioSettingsForm
      playReadings={playReadings}
      onChangePlayReadings={setPlayReadings}
    />
  );
}
