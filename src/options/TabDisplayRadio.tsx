import type { RenderableProps } from 'preact';

import { TabDisplay } from '../common/content-config-params';
import { useLocale } from '../common/i18n';
import { useThemeClass } from '../utils/use-theme-class';

import { IconRadio } from './IconRadio';

type Props = {
  onChange: (value: TabDisplay) => void;
  theme: string;
  value: TabDisplay;
};

export function TabDisplayRadio(props: Props) {
  const { t } = useLocale();
  const themeClass = useThemeClass(props.theme);

  return (
    <>
      {/* SVG defs */}
      <svg class="sr-only" role="presentation">
        <defs>
          <clipPath id="popup-outline">
            <rect x="1" y="1" rx="5" width="46" height="46" />
          </clipPath>
          <rect id="tabicon-popup" x="1" y="1" rx="5" width="46" height="46" />
        </defs>
      </svg>
      <div class="grid w-max grid-cols-[repeat(1,80px)] gap-2 min-[300px]:grid-cols-[repeat(2,100px)] min-[440px]:grid-cols-[repeat(4,100px)] min-[600px]:grid-cols-[repeat(4,120px)]">
        <IconRadio
          checked={props.value === 'top'}
          label={t('options_tab_position_top')}
          name="tabDisplay"
          onChange={() => props.onChange('top')}
          value="top"
        >
          <PopupIconBase themeClass={themeClass}>
            <rect
              class="fill-[--cell-highlight-bg] stroke-[--border-color] stroke-[0.5px]"
              clipPath="url(#popup-outline)"
              x="16"
              y="1"
              width="32"
              height="8"
            />
          </PopupIconBase>
        </IconRadio>
        <IconRadio
          checked={props.value === 'left'}
          label={t('options_tab_position_left')}
          name="tabDisplay"
          onChange={() => props.onChange('left')}
          value="left"
        >
          <PopupIconBase themeClass={themeClass}>
            <rect
              class="fill-[--cell-highlight-bg] stroke-[--border-color] stroke-[0.5px]"
              clipPath="url(#popup-outline)"
              x="0"
              y="8"
              width="8"
              height="40"
            />
          </PopupIconBase>
        </IconRadio>
        <IconRadio
          checked={props.value === 'right'}
          label={t('options_tab_position_right')}
          name="tabDisplay"
          onChange={() => props.onChange('right')}
          value="right"
        >
          <PopupIconBase themeClass={themeClass}>
            <rect
              class="fill-[--cell-highlight-bg] stroke-[--border-color] stroke-[0.5px]"
              clipPath="url(#popup-outline)"
              x="40"
              y="8"
              width="8"
              height="40"
            />
          </PopupIconBase>
        </IconRadio>
        <IconRadio
          checked={props.value === 'none'}
          label={t('options_tab_position_none')}
          name="tabDisplay"
          onChange={() => props.onChange('none')}
          value="none"
        >
          <PopupIconBase themeClass={themeClass} />
        </IconRadio>
      </div>
    </>
  );
}

type IconProps = { themeClass: string };

function PopupIconBase(props: RenderableProps<IconProps>) {
  return (
    <div class="flex items-center justify-center px-4 py-3">
      <svg
        class={`${props.themeClass} size-12 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]`}
        viewBox="0 0 48 48"
      >
        <use
          class="fill-[--bg-color] stroke-[--border-color] stroke-[0.5px]"
          href="#tabicon-popup"
        />
        {props.children}
      </svg>
    </div>
  );
}
