import { useState } from 'preact/hooks';

import { PuckSettingsForm, type ShowPuckSetting } from './PuckSettingsForm';
import './options.css';

export default function PuckSettingsFormFixture() {
  const [showPuck, setShowPuck] = useState<ShowPuckSetting>('auto');

  return <PuckSettingsForm showPuck={showPuck} onChange={setShowPuck} />;
}
