import { ContentConfigParams } from '../../../common/content-config-params';
import { useLocale } from '../../../common/i18n';

import { CurrencyMeta } from '../../currency';

type Props = {
  meta: CurrencyMeta;
  fxData: NonNullable<ContentConfigParams['fx']>;
};

export function CurrencyInfo({ meta, fxData }: Props) {
  return (
    <div lang="ja">
      <div class="tp-text-xl">
        {/* LHS */}
        <div class="tp-inline-flex tp-items-baseline tp-gap-1">
          <span class="tp-opacity-60 tp-text-base">JPY</span>
          <span>
            {new Intl.NumberFormat('ja-JP', {
              style: 'currency',
              currency: 'JPY',
            }).format(meta.value)}
          </span>
          <span class="tp-mx-1.5">≈</span>
        </div>
        {/* RHS */}
        <div class="tp-inline-flex tp-items-baseline tp-gap-1">
          <span class="tp-opacity-60 tp-text-base">{fxData.currency}</span>
          <span>
            <CurrencyValue
              currency={fxData.currency}
              value={meta.value * fxData.rate}
            />
          </span>
        </div>
      </div>
      <TimeStamp timestamp={fxData.timestamp} />
    </div>
  );
}

function TimeStamp({ timestamp }: { timestamp: number }) {
  const { t } = useLocale();

  const timestampAsDate = new Date(timestamp);
  const timestampAsString = timestampAsDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const expl = t('currency_data_updated_label', timestampAsString);

  return <div class="tp-opacity-60 tp-text-2xs">{expl}</div>;
}

function CurrencyValue({
  currency,
  value,
}: {
  currency: string;
  value: number;
}) {
  // BTC is a bit special because Intl.NumberFormat doesn't support it and if we
  // let it do its fallback rounding to two decimal places we'll lose most of
  // the information.
  //
  // In fact, the convention for BTC appears to be to always use 8 decimal
  // places.
  if (currency === 'BTC') {
    return <span>{`\u20bf${value.toFixed(8)}`}</span>;
  }

  let formattedValue: string;
  try {
    formattedValue = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(value);
  } catch {
    // Some older browsers may not support all the options above so fall back to
    // general number formatting in that case.
    formattedValue = new Intl.NumberFormat().format(value);
  }

  // Drop redundant currency code.
  //
  // If the browser doesn't have a specific symbol (e.g. $) for the currency,
  // it generally just prepends the currency code (e.g. USD) but that's
  // redundant with our valueCurrencyLabel so we try to detect and drop it in
  // that case.
  formattedValue = formattedValue.replace(
    new RegExp(`^\\s*${currency}\\s*`),
    ''
  );

  return <span>{formattedValue}</span>;
}
