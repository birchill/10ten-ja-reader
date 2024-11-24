import { ContentConfigParams } from '../../../common/content-config-params';
import { classes } from '../../../utils/classes';

import { SelectionMeta } from '../../meta';
import { getEraInfo } from '../../years';

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
  let metadata = undefined;
  switch (meta.type) {
    case 'era': {
      const eraInfo = getEraInfo(meta.era);
      if (eraInfo) {
        metadata = <EraInfoComponent meta={meta} eraInfo={eraInfo} />;
      }
      break;
    }
    case 'measure': {
      metadata = <MeasureInfo meta={meta} preferredUnits={preferredUnits} />;
      break;
    }
    case 'currency': {
      if (fxData) {
        metadata = <CurrencyInfo meta={meta} fxData={fxData} />;
      }
      break;
    }
    case 'number': {
      if (meta.matchLen > matchLen) {
        metadata = (
          <NumberInfo meta={meta} isCombinedResult={isCombinedResult} />
        );
      }
      break;
    }
    case 'shogi': {
      metadata = <ShogiInfo meta={meta} />;
      break;
    }
  }

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
