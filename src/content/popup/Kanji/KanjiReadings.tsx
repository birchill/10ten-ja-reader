import type { KanjiResult } from '@birchill/jpdict-idb';

import { useLocale } from '../../../common/i18n';

export type Props = { r: KanjiResult['r'] };

export function KanjiReadings(props: Props) {
  const { t, langTag } = useLocale();

  return (
    <div lang="ja" class="tp-text-[--reading-highlight] tp-text-base">
      {props.r.on?.join('、') || null}
      {props.r.kun?.map((k, i) => {
        const hasPreceding = i !== 0 || !!props.r.on?.length;
        return (
          <>
            {hasPreceding ? '、' : null}
            <KunReading k={k} />
          </>
        );
      }) || null}
      {props.r.na?.length ? (
        <>
          <br />
          <span class="tp-text-[--reading-label] tp-text-xs" lang={langTag}>
            {t('content_kanji_nanori_label')}
          </span>{' '}
          {props.r.na.join('、')}
        </>
      ) : null}
    </div>
  );
}

// Kun readings sometimes have a . in them separating the initial part that
// represents the kanji, from the okurigana.
//
// e.g. あた.える
//
// We want to take the bit after the '.' and wrap it in a span with an
// appropriate class.
function KunReading(props: { k: string }) {
  const highlightIndex = props.k.indexOf('.');

  return highlightIndex === -1 ? (
    <>{props.k}</>
  ) : (
    <>
      {props.k.substring(0, highlightIndex)}
      <span class="tp-text-[--okurigana-color]">
        {props.k.substring(highlightIndex + 1)}
      </span>
    </>
  );
}
