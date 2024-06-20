import { useState } from 'preact/hooks';
import { useValue } from 'react-cosmos/client';

import { CopySettingsForm } from './CopySettingsForm';
import './options.css';

export default {
  default: () => {
    const [simplified, setSimplified] = useState(false);
    const [showRomaji] = useValue<boolean>('Show romaji?', {
      defaultValue: false,
    });

    return (
      <CopySettingsForm
        showRomaji={showRomaji}
        simplifiedCopy={simplified}
        onChangeSimplifiedCopy={setSimplified}
      />
    );
  },
};
