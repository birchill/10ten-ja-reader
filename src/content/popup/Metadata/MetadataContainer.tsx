import { useMemo } from 'preact/hooks';

import { ContentConfigParams } from '../../../common/content-config-params';
import { classes } from '../../../utils/classes';

import { SelectionMeta } from '../../meta';

import { CurrencyInfo } from './CurrencyInfo';
import { EraInfoComponent } from './EraInfoComponent';
import { MeasureInfo } from './MeasureInfo';
import { NumberInfo } from './NumberInfo';
import { ShogiInfo } from './ShogiInfo';

type Props = {
  fxData: ContentConfigParams['fx'];
  preferredUnits: ContentConfigParams['preferredUnits'];
  isCombinedResult: boolean;
  matchLen: number;
  meta: SelectionMeta;
  metaonly?: boolean;
};

export function MetadataContainer({
  fxData,
  preferredUnits,
  isCombinedResult,
  matchLen,
  meta,
  metaonly = false,
}: Props) {
  const metadata = useMemo(() => {
    switch (meta.type) {
      case 'era':
        return <EraInfoComponent meta={meta} />;

      case 'measure':
        return <MeasureInfo meta={meta} preferredUnits={preferredUnits} />;

      case 'currency':
        return fxData ? <CurrencyInfo meta={meta} fxData={fxData} /> : null;

      case 'number':
        return meta.matchLen > matchLen ? (
          <NumberInfo meta={meta} isCombinedResult={isCombinedResult} />
        ) : null;

      case 'shogi':
        return <ShogiInfo meta={meta} />;
    }
  }, [meta]);

  return metadata ? (
    <div
      class={classes(
        'tp-my-2 tp-py-1 tp-px-4 tp-snap-start tp-scroll-mt-5',
        metaonly ? 'tp-bg-transparent' : 'tp-bg-[--meta-bg]'
      )}
    >
      {metadata}
    </div>
  ) : null;
}
