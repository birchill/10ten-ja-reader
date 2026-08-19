import { useLocale } from '../common/i18n';

import { CheckboxRow } from './CheckboxRow';
import { NewBadge } from './NewBadge';

type Props = {
  playReadings: boolean;
  onChangePlayReadings: (value: boolean) => void;
};

export function AudioSettingsForm(props: Props) {
  const { t } = useLocale();

  return (
    <div class="flex flex-col gap-4">
      <CheckboxRow>
        <input
          id="playReadings"
          name="playReadings"
          type="checkbox"
          checked={props.playReadings}
          onChange={(e) => props.onChangePlayReadings(e.currentTarget.checked)}
        />
        <label for="playReadings">
          {t('options_play_readings_label')}
          <NewBadge expiry={new Date('2027-02-20')} />
        </label>
      </CheckboxRow>
      <p class="m-0 text-xs text-zinc-500 dark:text-zinc-400">
        {t('options_play_readings_description')}
      </p>
    </div>
  );
}
