import type { KanjiResult } from '@birchill/jpdict-idb';

import type { TranslateFunctionType } from '../common/i18n';
import type { ReferenceAbbreviation } from '../common/refs';

export function getReferenceValue(
  entry: KanjiResult,
  ref: ReferenceAbbreviation,
  t: TranslateFunctionType
): string {
  switch (ref) {
    case 'nelson_r': {
      // If the Nelson radical is empty, it means it's the same as the regular
      // radical so we should fall through to that branch.
      if (entry.rad.nelson) {
        return `${entry.rad.nelson} ${String.fromCodePoint(
          entry.rad.nelson + 0x2eff
        )}`;
      }
      // Fall through
    }

    case 'radical': {
      const { rad } = entry;
      const radChar = rad.base ? rad.base.b || rad.base.k : rad.b || rad.k;
      return `${rad.x} ${radChar}`;
    }

    case 'kk':
      return renderKanKen(entry.misc.kk, t);

    case 'jlpt':
      return entry.misc.jlpt ? String(entry.misc.jlpt) : '';

    case 'py':
      return entry.r.py ? entry.r.py.join(', ') : '';

    case 'unicode':
      return `U+${entry.c.codePointAt(0)!.toString(16).toUpperCase()}`;

    case 'wk':
      return entry.misc.wk ? String(entry.misc.wk) : '';

    default:
      return entry.refs[ref] ? String(entry.refs[ref]) : '';
  }
}

function renderKanKen(
  level: number | undefined,
  t: TranslateFunctionType
): string {
  if (!level) {
    return '—';
  }
  if (level === 15) {
    return t('content_kanji_kentei_level_pre', ['1']);
  }
  if (level === 25) {
    return t('content_kanji_kentei_level_pre', ['2']);
  }
  return t('content_kanji_kentei_level', [String(level)]);
}
