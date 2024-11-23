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
    <div class="meta era" lang="ja">
      <span class="era-name">
        <ruby>
          {props.meta.era}
          <rp>(</rp>
          <rt>{props.eraInfo.reading}</rt>
          <rp>)</rp>
          {props.meta.year === 0 ? '元年' : `${props.meta.year}年`}
        </ruby>
      </span>
      <span class="equals">=</span>
      <span class="seireki">{`${seireki}年`}</span>
    </div>
  );
}
