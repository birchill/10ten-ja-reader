import { ContentConfigParams } from '../../../common/content-config-params';
import { useLocale } from '../../../common/i18n';

import { AlternateMeasure, MeasureMeta, convertMeasure } from '../../measure';

type Props = {
  meta: MeasureMeta;
  preferredUnits: ContentConfigParams['preferredUnits'];
};

export function MeasureInfo(props: Props) {
  const converted = convertMeasure(props.meta, props.preferredUnits);

  return (
    <div class="tp-flex tp-flex-col tp-items-baseline" lang="ja">
      <span class="tp-text-xl">
        <span>
          {props.meta.value.toLocaleString()}
          <Unit unit={props.meta.unit} />
        </span>
        <span class="tp-px-1.5">=</span>
        <span>
          <Value value={converted.value} />
          <Unit unit={converted.unit} showRuby={false} />
        </span>
      </span>
      {converted.alt &&
        converted.alt.map((alt) => (
          <AlternativeMeasureComponent alt={alt} key={alt.type} />
        ))}
    </div>
  );
}

function Value({ value }: { value: number }) {
  function round(value: number, places: number): number {
    const base = Math.pow(10, places);
    return Math.round(value * base) / base;
  }

  return (
    // Round to two decimal places, then to five significant figures
    <span>{parseFloat(round(value, 2).toPrecision(5)).toLocaleString()}</span>
  );
}

function AlternativeMeasureComponent({ alt }: { alt: AlternateMeasure }) {
  const { t, langTag } = useLocale();

  const { type, label, unit, value } = alt;

  const expl = t(`measure_expl_${type}`);

  return (
    <div class="tp-opacity-60 tp-mt-0.5" key={type}>
      <span>
        {label && <span>{label}</span>}
        {expl && <span lang={langTag}>{expl}</span>}
        {alt}
      </span>
      <span class="tp-px-1.5">=</span>
      <span class="tp-space-x-1">
        <Value value={value} />
        <Unit unit={unit} showRuby={false} />
      </span>
    </div>
  );
}

function Unit({
  unit,
  showRuby = true,
}: {
  unit: MeasureMeta['unit'];
  showRuby?: boolean;
}) {
  return (
    <span>
      {unit === 'm2' ? (
        <span>
          m<sup>2</sup>
        </span>
      ) : unit === 'sq ft' ? (
        <span>
          ft<sup>2</sup>
        </span>
      ) : showRuby ? (
        <ruby>
          {unit}
          <rp>(</rp>
          <rt>じょう</rt>
          <rp>)</rp>
        </ruby>
      ) : (
        unit
      )}
    </span>
  );
}
