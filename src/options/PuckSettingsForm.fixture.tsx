import { useState } from 'preact/hooks';

import {
  type HandednessSetting,
  PuckSettingsForm,
  type ShowPuckSetting,
} from './PuckSettingsForm';
import './options.css';

export default function PuckSettingsFormFixture() {
  const [showPuck, setShowPuck] = useState<ShowPuckSetting>('auto');
  const [handedness, setHandedness] = useState<HandednessSetting>('unset');

  return (
    <PuckSettingsForm
      showPuck={showPuck}
      onChangeShowPuck={setShowPuck}
      handedness={handedness}
      onChangeHandedness={setHandedness}
    />
  );
}
