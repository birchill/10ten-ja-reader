import type { EraInfo, EraMeta } from '../../years';

type Props = {
  meta: EraMeta;
  eraInfo: EraInfo;
};

export function EraInfoComponent(props: Props) {
  const seireki =
    props.meta.year === 0
      ? props.eraInfo.start
      : props.meta.year - 1 + props.eraInfo.start;

  return (
    <div class="tp-text-2xl tp-flex tp-items-baseline" lang="ja">
      <span class="tp-text-[--primary-highlight]">
        <ruby>
          {props.meta.era}
          <rp>(</rp>
          <rt class="tp-text-sm">{props.eraInfo.reading}</rt>
          <rp>)</rp>
          {props.meta.year === 0 ? '元年' : `${props.meta.year}年`}
        </ruby>
      </span>
      <span class="tp-px-1.5">=</span>
      <span class="tp-text-[--reading-highlight]">{`${seireki}年`}</span>
    </div>
  );
}
