import type { KanjiResult } from '@birchill/jpdict-idb';

import { useLocale } from '../../../common/i18n';

import { FrequencyIndicator } from './FrequencyIndicator';
import { GradeIndicator } from './GradeIndicator';
import { KanjiComponents } from './KanjiComponents';
import { KanjiMeta } from './KanjiMeta';
import { KanjiReadings } from './KanjiReadings';
import { StrokeCount } from './StrokeCount';

export type Props = Pick<
  KanjiResult,
  'r' | 'misc' | 'm' | 'm_lang' | 'rad' | 'comp'
> & { showComponents?: boolean };

export function KanjiInfo(props: Props) {
  const { langTag } = useLocale();

  return (
    <div class="tp-flex tp-flex-col tp-gap-3">
      <KanjiReadings r={props.r} />
      {!!props.misc.meta?.length && (
        <div class="-tp-mt-1.5">
          <KanjiMeta tags={props.misc.meta} />
        </div>
      )}
      <div class="tp-text-base tp-leading-snug" lang={props.m_lang}>
        {props.m.join(', ')}
      </div>
      <div class="tp-flex tp-items-base tp-gap-3.5 *:tp-grow" lang={langTag}>
        <StrokeCount sc={props.misc.sc} />
        <FrequencyIndicator frequency={props.misc.freq} />
        <GradeIndicator gr={props.misc.gr} />
      </div>
      {props.showComponents !== false && (
        <KanjiComponents rad={props.rad} comp={props.comp} />
      )}
    </div>
  );
}
