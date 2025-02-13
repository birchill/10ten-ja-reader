import { NumberMeta } from '../../numbers';

type Props = { meta: NumberMeta; isCombinedResult: boolean };

export function NumberInfo({ meta, isCombinedResult }: Props) {
  return (
    <div class="tp-leading-none tp-py-1.5">
      {isCombinedResult && (
        <span>
          <span lang="ja">{meta.src}</span>
          <span class="tp-px-1.5">=</span>
        </span>
      )}
      <span>{meta.value.toLocaleString()}</span>
    </div>
  );
}
