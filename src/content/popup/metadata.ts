import browser from 'webextension-polyfill';

import { ContentConfigParams } from '../../common/content-config-params';
import { CurrencyMeta } from '../currency';
import { convertMeasure, MeasureMeta } from '../measure';
import { SelectionMeta } from '../meta';
import { NumberMeta } from '../numbers';
import { EraInfo, EraMeta, getEraInfo } from '../years';
import { html } from '../../utils/builder';
import { getLangTag } from './lang-tag';
import { serializeShogi, serializeShogiDest, ShogiMeta } from '../shogi';

export function renderMetadata({
  fxData,
  isCombinedResult,
  matchLen,
  meta,
}: {
  fxData: ContentConfigParams['fx'];
  isCombinedResult: boolean;
  matchLen: number;
  meta: SelectionMeta;
}): HTMLElement | null {
  switch (meta.type) {
    case 'era':
      {
        const eraInfo = getEraInfo(meta.era);
        if (eraInfo) {
          return renderEraInfo(meta, eraInfo);
        }
      }
      break;

    case 'measure':
      return renderMeasureInfo(meta);

    case 'currency':
      return fxData ? renderCurrencyInfo(meta, fxData) : null;

    case 'number':
      return meta.matchLen > matchLen
        ? renderNumberInfo(meta, { isCombinedResult })
        : null;

    case 'shogi':
      return renderShogiInfo(meta);
  }

  return null;
}

function renderEraInfo(meta: EraMeta, eraInfo: EraInfo): HTMLElement {
  const seireki =
    meta.year === 0 ? eraInfo.start : meta.year - 1 + eraInfo.start;

  return html(
    'div',
    { class: 'meta era', lang: 'ja' },
    html(
      'span',
      { class: 'era-name' },
      html(
        'ruby',
        {},
        meta.era,
        html('rp', {}, '('),
        html('rt', {}, eraInfo.reading),
        html('rp', {}, ')'),
        meta.year === 0 ? '元年' : `${meta.year}年`
      )
    ),
    html('span', { class: 'equals' }, '='),
    html('span', { class: 'seireki' }, `${seireki}年`)
  );
}

function renderMeasureInfo(meta: MeasureMeta): HTMLElement {
  const converted = convertMeasure(meta);

  const metaDiv = html(
    'div',
    { class: 'meta measure', lang: 'ja' },
    html(
      'span',
      { class: 'main' },
      html(
        'span',
        { class: 'value' },
        meta.value.toLocaleString(),
        renderUnit(meta.unit)
      ),
      html('span', { class: 'equals' }, '='),
      html(
        'span',
        { class: 'value' },
        renderValue(converted.value),
        renderUnit(converted.unit)
      )
    )
  );

  if (converted.alt) {
    for (const { type, label, unit, value } of converted.alt) {
      const altRow = html('div', { class: 'alt' });

      const altLabel = html('span', {});
      if (label) {
        altLabel.append(label);
      }
      const expl = browser.i18n.getMessage(`measure_expl_${type}`);
      if (expl) {
        const altExplLabel = html('span', { lang: getLangTag() }, expl);
        altLabel.append(altExplLabel);
      }

      altRow.append(
        altLabel,
        html('span', { class: 'equals' }, '='),
        html(
          'span',
          { class: 'measure' },
          renderValue(value),
          renderUnit(unit, { showRuby: false })
        )
      );

      metaDiv.append(altRow);
    }
  }

  return metaDiv;
}

function renderValue(value: number): string {
  // Round to two decimal places, then to five significant figures
  return parseFloat(round(value, 2).toPrecision(5)).toLocaleString();
}

function round(value: number, places: number): number {
  const base = Math.pow(10, places);
  return Math.round(value * base) / base;
}

function renderUnit(
  unit: MeasureMeta['unit'],
  { showRuby = true }: { showRuby?: boolean } = {}
): HTMLElement {
  const unitSpan = html('span', { class: 'unit' });

  if (unit === 'm2') {
    unitSpan.append('m', html('sup', {}, '2'));
  } else if (showRuby) {
    unitSpan.append(
      html(
        'ruby',
        {},
        unit,
        html('rp', {}, '('),
        html('rt', {}, 'じょう'),
        html('rp', {}, ')')
      )
    );
  } else {
    unitSpan.append(unit);
  }

  return unitSpan;
}

function renderCurrencyInfo(
  meta: CurrencyMeta,
  fxData: NonNullable<ContentConfigParams['fx']>
): HTMLElement {
  const metaDiv = html(
    'div',
    { class: 'meta currency', lang: 'ja' },
    html(
      'div',
      { class: 'main' },
      // LHS
      html(
        'div',
        { class: 'equation-part' },
        html('span', { class: 'curr' }, 'JPY'),
        html(
          'span',
          { class: 'src' },
          new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
          }).format(meta.value)
        ),
        html('span', { class: 'equals' }, '≈')
      ),
      // RHS
      html(
        'div',
        { class: 'equation-part' },
        html('span', { class: 'curr' }, fxData.currency),
        html(
          'span',
          { class: 'value' },
          renderCurrencyValue({
            currency: fxData.currency,
            value: meta.value * fxData.rate,
          })
        )
      )
    )
  );

  const timestampRow = html('div', { class: 'timestamp' });
  const timestampAsDate = new Date(fxData.timestamp);
  const timestampAsString = timestampAsDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  } as any);
  const expl = browser.i18n.getMessage(
    'currency_data_updated_label',
    timestampAsString
  );
  timestampRow.append(expl);
  metaDiv.append(timestampRow);

  return metaDiv;
}

function renderCurrencyValue({
  currency,
  value,
}: {
  currency: string;
  value: number;
}): string {
  // BTC is a bit special because Intl.NumberFormat doesn't support it and if we
  // let it do its fallback rounding to two decimal places we'll lose most of
  // the information.
  //
  // In fact, the convention for BTC appears to be to always use 8 decimal
  // places.
  if (currency === 'BTC') {
    return `\u20bf${value.toFixed(8)}`;
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

  return formattedValue;
}

function renderNumberInfo(
  meta: NumberMeta,
  { isCombinedResult }: { isCombinedResult: boolean }
): HTMLElement {
  const metaDiv = html('div', { class: 'meta number' });

  if (isCombinedResult) {
    metaDiv.append(
      html('span', { class: 'src', lang: 'ja' }, meta.src),
      html('span', { class: 'equals' }, '=')
    );
  }

  metaDiv.append(html('span', { class: 'value' }, meta.value.toLocaleString()));

  return metaDiv;
}

function renderShogiInfo(meta: ShogiMeta): HTMLElement {
  const metaDiv = html('div', { class: 'meta shogi' });

  metaDiv.append(
    html(
      'span',
      { class: 'label', lang: getLangTag() },
      browser.i18n.getMessage('shogi_label')
    ),
    html('span', { class: 'src', lang: 'ja' }, serializeShogi(meta)),
    html('span', { class: 'equals' }, '=')
  );

  // For Chinese we use the Japanese expansion anyway
  let lang = getLangTag();
  if (lang === 'zh-Hans') {
    lang = 'ja';
  }

  // Side
  const side = meta.side
    ? browser.i18n.getMessage(`shogi_side_${meta.side}`)
    : undefined;

  // Piece
  const piece = browser.i18n.getMessage(`shogi_piece_${meta.piece}`);

  // Destination
  let dest: string;
  if (meta.dest) {
    dest =
      lang === 'ja'
        ? serializeShogiDest(meta.dest)
        : meta.dest.slice(0, 2).map(String).join('');
    if (meta.dest.length === 3) {
      dest += browser.i18n.getMessage('shogi_dest_same_suffix');
    }
  } else {
    dest = browser.i18n.getMessage('shogi_dest_same');
  }

  // Movement
  const movement = meta.movement
    ? browser.i18n.getMessage(`shogi_movement_${meta.movement}`)
    : undefined;

  // Get the combined string
  let move: string;
  if (side && movement) {
    move = browser.i18n.getMessage('shogi_move_side_piece_dest_movement', [
      side,
      piece,
      dest,
      movement,
    ]);
  } else if (side) {
    move = browser.i18n.getMessage('shogi_move_side_piece_dest', [
      side,
      piece,
      dest,
    ]);
  } else if (movement) {
    move = browser.i18n.getMessage('shogi_move_piece_dest_movement', [
      piece,
      dest,
      movement,
    ]);
  } else {
    move = browser.i18n.getMessage('shogi_move_piece_dest', [piece, dest]);
  }

  // Add promotion annotation
  if (typeof meta.promotion === 'boolean') {
    move += browser.i18n.getMessage(
      meta.promotion ? 'shogi_promoted_suffix' : 'shogi_not_promoted_suffix'
    );
  }

  metaDiv.append(html('span', { class: 'value', lang }, move));

  return metaDiv;
}
