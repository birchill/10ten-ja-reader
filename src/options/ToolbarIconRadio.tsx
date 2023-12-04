import { useLocale } from '../common/i18n';
import { classes } from '../utils/classes';

import { IconRadio } from './IconRadio';

type Props = {
  onChange: (value: 'default' | 'sky') => void;
  value: 'default' | 'sky';
};

export function ToolbarIconRadio(props: Props) {
  const { t } = useLocale();

  return (
    <div class="grid w-max grid-cols-2 gap-2">
      <IconRadio
        checked={props.value === 'default'}
        label={t('options_toolbar_icon_classic_label')}
        name="toolbarIcon"
        onChange={() => props.onChange('default')}
        value="default"
      >
        <IconPreview
          alt={t('options_toolbar_icon_default_alt')}
          checked={props.value === 'default'}
          src="/images/10ten.svg"
        />
      </IconRadio>
      <IconRadio
        checked={props.value === 'sky'}
        label={t('options_toolbar_icon_kanji_label')}
        name="toolbarIcon"
        onChange={() => props.onChange('sky')}
        value="sky"
      >
        <IconPreview
          alt={t('options_toolbar_icon_sky_alt')}
          checked={props.value === 'sky'}
          src="/images/10ten-sky.svg"
        />
      </IconRadio>
    </div>
  );
}

function IconPreview(props: { alt: string; checked: boolean; src: string }) {
  return (
    <div class="align-center px-[32px] py-[16px]">
      <img
        class={classes(
          'h-[48px] w-[48px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.25)]',
          props.checked && 'dark:drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]'
        )}
        src={props.src}
        alt={props.alt}
      />
    </div>
  );
}
