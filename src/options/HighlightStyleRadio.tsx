import { HighlightStyle } from '../common/content-config-params';
import { useLocale } from '../common/i18n';

import { IconRadio } from './IconRadio';

type Props = {
  onChange: (value: HighlightStyle | 'none') => void;
  value: HighlightStyle | 'none';
};

export function HighlightStyleRadio(props: Props) {
  const { t } = useLocale();

  return (
    <div class="grid w-max grid-cols-3 gap-2">
      <IconRadio
        checked={props.value === 'none'}
        label={t('options_highlight_style_none')}
        name="highlightStyle"
        onChange={() => props.onChange('none')}
        value="none"
      >
        <HighlightPreview />
      </IconRadio>
      <IconRadio
        checked={props.value === 'yellow'}
        label={t('options_highlight_style_yellow')}
        name="highlightStyle"
        onChange={() => props.onChange('yellow')}
        value="yellow"
      >
        <HighlightPreview rangeClass="bg-yellow-300 text-black" />
      </IconRadio>
      <IconRadio
        checked={props.value === 'blue'}
        label={t('options_highlight_style_blue')}
        name="highlightStyle"
        onChange={() => props.onChange('blue')}
        value="blue"
      >
        <HighlightPreview rangeClass="bg-blue-600 text-white" />
      </IconRadio>
    </div>
  );
}

function HighlightPreview(props: { rangeClass?: string }) {
  return (
    <div class="flex items-center justify-center px-2 py-4 text-[15px] min-[300px]:text-[20px] min-[400px]:min-h-[calc(48px+16px*2)] min-[400px]:min-w-[calc(48px+32px*2)] min-[400px]:text-[25px]">
      <span class="fade-ends-x">
        に<span class={props.rangeClass}>点々</span>と
      </span>
    </div>
  );
}
