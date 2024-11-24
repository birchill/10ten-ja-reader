import { NumberMeta } from '../../numbers';

type Props = {
  meta: NumberMeta;
  isCombinedResult: boolean;
};

export function NumberInfo({ meta, isCombinedResult }: Props) {
  return (
    <div class="meta number">
      {isCombinedResult && (
        <span>
          <span class="src" lang="ja">
            {meta.src}
          </span>
          <span class="equals">=</span>
        </span>
      )}
      <span class="value">{meta.value.toLocaleString()}</span>
    </div>
  );
}
